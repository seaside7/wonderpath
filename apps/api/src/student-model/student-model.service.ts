import { Injectable, NotFoundException } from '@nestjs/common';
import {
  LearningSessionStatus as PrismaLearningSessionStatus,
  Prisma,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MisconceptionService } from '../misconception/misconception.service';
import { LearningPatternService } from '../learning-pattern/learning-pattern.service';
import { QuestionPerformanceService } from '../question-performance/question-performance.service';
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

@Injectable()
export class StudentModelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly misconceptionService: MisconceptionService,
    private readonly learningPatternService: LearningPatternService,
    private readonly questionPerformanceService: QuestionPerformanceService,
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
      select: { id: true, childId: true },
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

    await this.misconceptionService.recordAttempt(response.id);
    await this.learningPatternService.recordAttempt(response.id);
    await this.questionPerformanceService.recordAttempt(response.id);

    return { ...response, explanation };
  }

  async getMastery(
    parentId: string,
    childId: string,
  ): Promise<MasteryResponseDto> {
    const child = await this.prisma.child.findFirst({
      where: { id: childId, parentId },
      select: { id: true },
    });

    if (!child) {
      throw new NotFoundException('Child not found');
    }

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
    const attempts = await tx.questionAttempt.findMany({
      where: { childId, learningObjectiveId },
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
