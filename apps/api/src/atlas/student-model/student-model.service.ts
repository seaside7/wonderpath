import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  LearningSessionContext,
  LearningSessionStatus as PrismaLearningSessionStatus,
  Prisma,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { getOwnedChild } from '../../common/get-owned-child';
import {
  LevelUpSignal,
  MisconceptionService,
} from '../misconception/misconception.service';
import { LearningPatternService } from '../learning-pattern/learning-pattern.service';
import { QuestionPerformanceService } from '../question-performance/question-performance.service';
import { TtsService } from '../tts/tts.service';
import { PointsService } from '../points/points.service';
import { AttemptPointsDto } from '../points/dto/point-response.dto';
import { CreateAttemptDto } from './dto/create-attempt.dto';
import { AttemptResponseDto } from './dto/attempt-response.dto';
import { MasteryResponseDto } from './dto/mastery-response.dto';
import {
  mapAttemptToResponse,
  mapMasteryToResponse,
  mapPerceivedDifficultyFromPrisma,
  mapPerceivedDifficultyToPrisma,
} from './student-model.mapper';
import {
  AttemptSignal,
  calculateMastery,
  attemptReasonCodes,
  MasteryAggregate,
} from './mastery.calculator';

/** "GRADE_5" -> 5, so grades can be compared by order. */
function gradeNumber(grade: string): number {
  return Number(grade.replace(/\D/g, ''));
}

@Injectable()
export class StudentModelService {
  private readonly logger = new Logger(StudentModelService.name);
  private readonly pendingAudioGeneration = new Map<
    string,
    Promise<string | null>
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly misconceptionService: MisconceptionService,
    private readonly learningPatternService: LearningPatternService,
    private readonly questionPerformanceService: QuestionPerformanceService,
    private readonly ttsService: TtsService,
    private readonly pointsService: PointsService,
  ) {}

  async recordAttempt(
    parentId: string,
    dto: CreateAttemptDto,
  ): Promise<AttemptResponseDto> {
    const session = await this.prisma.learningSession.findFirst({
      where: {
        id: dto.learningSessionId,
        status: PrismaLearningSessionStatus.STARTED,
        child: { parentId },
      },
      select: {
        id: true,
        childId: true,
        practiceGrade: true,
        child: { select: { grade: true } },
      },
    });

    if (!session) {
      throw new NotFoundException('Active learning session not found');
    }

    const question = await this.prisma.question.findUnique({
      where: { id: dto.questionId },
      select: {
        id: true,
        correctAnswer: true,
        explanation: true,
        audioUrl: true,
        learningObjectiveId: true,
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const signal: AttemptSignal = {
      correct: dto.selectedAnswer === question.correctAnswer,
      timeSpent: dto.timeSpent,
      hintUsed: dto.hintUsed,
      perceivedDifficulty: dto.perceivedDifficulty,
    };

    const reasonCodes = attemptReasonCodes(signal);
    const learningObjectiveId = question.learningObjectiveId;
    const masteryBefore = await this.prisma.studentMastery.findUnique({
      where: {
        childId_learningObjectiveId: {
          childId: session.childId,
          learningObjectiveId,
        },
      },
      select: { masteryScore: true },
    });

    const response = await this.prisma.$transaction(async (tx) => {
      const priorAttempts = await tx.questionAttempt.count({
        where: { childId: session.childId, learningObjectiveId },
      });

      const attempt = await tx.questionAttempt.create({
        data: {
          childId: session.childId,
          learningSessionId: session.id,
          questionId: question.id,
          learningObjectiveId,
          selectedAnswer: dto.selectedAnswer,
          correct: signal.correct,
          timeSpent: dto.timeSpent,
          hintUsed: dto.hintUsed,
          perceivedDifficulty: mapPerceivedDifficultyToPrisma(
            dto.perceivedDifficulty,
          ),
          attemptNumber: priorAttempts + 1,
          metadata: (dto.metadata as object) ?? undefined,
          reasonCodes,
        },
      });

      await this.recalculateMastery(tx, session.childId, learningObjectiveId);

      return mapAttemptToResponse(attempt);
    });

    const explanation = question.explanation;

    // The attempt is already durably committed above. These downstream
    // derivations must not turn a successful write into a 500 for the
    // caller (which would also invite a client retry that creates a
    // duplicate attempt) - run independently and log, don't throw.
    const sideEffects: Array<
      [string, Promise<{ levelUp: LevelUpSignal | null } | void>]
    > = [
      ['misconception', this.misconceptionService.recordAttempt(response.id)],
      [
        'learning-pattern',
        this.learningPatternService.recordAttempt(response.id),
      ],
      [
        'question-performance',
        this.questionPerformanceService.recordAttempt(response.id),
      ],
    ];

    const results = await Promise.allSettled(sideEffects.map(([, p]) => p));
    let levelUp: LevelUpSignal | null = null;
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.error(
          `${sideEffects[index][0]}.recordAttempt failed for attempt ${response.id}`,
          result.reason instanceof Error ? result.reason.stack : result.reason,
        );
      } else if (sideEffects[index][0] === 'misconception') {
        const value = result.value;
        if (value && typeof value === 'object') {
          levelUp = value.levelUp;
        }
      }
    });

    const audioUrl = await this.ensureQuestionAudioUrl(
      question.id,
      explanation,
      question.audioUrl,
    );

    let points: AttemptPointsDto | null = null;
    try {
      const masteryAfter = await this.prisma.studentMastery.findUnique({
        where: {
          childId_learningObjectiveId: {
            childId: session.childId,
            learningObjectiveId,
          },
        },
        select: { masteryScore: true },
      });
      points = await this.pointsService.awardForAttempt({
        childId: session.childId,
        questionAttemptId: response.id,
        learningSessionId: session.id,
        learningObjectiveId,
        correct: signal.correct,
        timeSpent: dto.timeSpent,
        masteredBefore:
          (masteryBefore?.masteryScore ?? 0) >=
          this.pointsService.highMasteryThreshold,
        // Bonus only for practising ABOVE the child's grade, never below.
        gradeAhead:
          session.practiceGrade !== null &&
          gradeNumber(session.practiceGrade) > gradeNumber(session.child.grade),
        masteryCrossed:
          (masteryBefore?.masteryScore ?? 0) <
            this.pointsService.highMasteryThreshold &&
          (masteryAfter?.masteryScore ?? 0) >=
            this.pointsService.highMasteryThreshold,
      });
    } catch (error) {
      this.logger.warn(
        `Points award failed for attempt ${response.id}; attempt was saved. ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return { ...response, explanation, audioUrl, points, levelUp };
  }

  private async ensureQuestionAudioUrl(
    questionId: string,
    explanation: string,
    currentAudioUrl: string | null,
  ): Promise<string | null> {
    if (currentAudioUrl) return currentAudioUrl;

    const pending = this.pendingAudioGeneration.get(questionId);
    if (pending) return pending;

    const generation = this.generateQuestionAudioUrl(questionId, explanation);
    this.pendingAudioGeneration.set(questionId, generation);

    try {
      return await generation;
    } finally {
      if (this.pendingAudioGeneration.get(questionId) === generation) {
        this.pendingAudioGeneration.delete(questionId);
      }
    }
  }

  private async generateQuestionAudioUrl(
    questionId: string,
    explanation: string,
  ): Promise<string | null> {
    try {
      // Another request may have completed while this attempt was being saved.
      const current = await this.prisma.question.findUnique({
        where: { id: questionId },
        select: { audioUrl: true },
      });
      if (current?.audioUrl) return current.audioUrl;

      const filename = await this.ttsService.synthesizeAndSave(
        questionId,
        explanation,
      );
      if (!filename) return null;

      const audioUrl = `/tts/${filename}`;
      const update = await this.prisma.question.updateMany({
        where: { id: questionId, audioUrl: null },
        data: { audioUrl },
      });

      if (update.count > 0) return audioUrl;

      const saved = await this.prisma.question.findUnique({
        where: { id: questionId },
        select: { audioUrl: true },
      });
      return saved?.audioUrl ?? audioUrl;
    } catch (error) {
      this.logger.warn(
        `TTS audio generation failed for question ${questionId}; attempt was saved. ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  async getMastery(
    parentId: string,
    childId: string,
  ): Promise<MasteryResponseDto> {
    await getOwnedChild(this.prisma, parentId, childId);

    const records = await this.prisma.studentMastery.findMany({
      where: { childId },
      include: {
        learningObjective: {
          select: { id: true, name: true },
        },
      },
      orderBy: { lastPracticedAt: 'desc' },
    });

    return mapMasteryToResponse(childId, records);
  }

  private async recalculateMastery(
    tx: Prisma.TransactionClient,
    childId: string,
    learningObjectiveId: string,
  ): Promise<void> {
    // Temporary session contexts (Exam Tomorrow, Homework Help, Quick Session)
    // must not permanently alter the Student Model - only Normal Learning
    // attempts feed the durable mastery aggregate. The raw attempt row itself
    // is still stored regardless of context; this only scopes recalculation.
    const attempts = await tx.questionAttempt.findMany({
      where: {
        childId,
        learningObjectiveId,
        learningSession: { context: LearningSessionContext.NORMAL_LEARNING },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        correct: true,
        timeSpent: true,
        hintUsed: true,
        perceivedDifficulty: true,
        createdAt: true,
      },
    });

    const aggregate = calculateMastery(
      attempts.map((attempt) => ({
        correct: attempt.correct,
        timeSpent: attempt.timeSpent,
        hintUsed: attempt.hintUsed,
        perceivedDifficulty: mapPerceivedDifficultyFromPrisma(
          attempt.perceivedDifficulty,
        ),
        createdAt: attempt.createdAt,
      })),
    );

    const data = this.masteryData(aggregate);

    await tx.studentMastery.upsert({
      where: {
        childId_learningObjectiveId: { childId, learningObjectiveId },
      },
      create: { childId, learningObjectiveId, ...data },
      update: data,
    });
  }

  private masteryData(aggregate: MasteryAggregate) {
    return {
      masteryScore: aggregate.masteryScore,
      confidenceScore: aggregate.confidenceScore,
      totalAttempts: aggregate.totalAttempts,
      correctAttempts: aggregate.correctAttempts,
      wrongAttempts: aggregate.wrongAttempts,
      averageResponseTime: aggregate.averageResponseTime,
      hintCount: aggregate.hintCount,
      lastPracticedAt: aggregate.lastPracticedAt,
      reviewRecommended: aggregate.reviewRecommended,
      reasonCodes: aggregate.reasonCodes,
    };
  }
}
