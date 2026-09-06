import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BankSubject } from '../question-bank/enums/question-bank.enums';
import {
  ADAPTIVE_DIFFICULTY_CONFIG,
  MISCONCEPTION_CONFIG,
} from './misconception.config';
import {
  MisconceptionSignalStatus,
  MisconceptionSignalType,
} from './enums/misconception.enums';
import { mapMisconceptionHydrated } from './misconception.mapper';
import {
  MisconceptionSignalStatus as PrismaMisconceptionStatus,
  MisconceptionSignalType as PrismaMisconceptionType,
  Subject as PrismaSubject,
} from '../../generated/prisma/client';
import {
  mapSubjectFromPrisma,
  mapSubjectToPrisma,
} from '../question-bank/question.mapper';
import {
  AdaptiveDifficultyResponseDto,
  AdaptiveDifficultyListResponseDto,
} from './dto/adaptive-difficulty-response.dto';

interface AttemptEvidence {
  id: string;
  childId: string;
  learningObjectiveId: string;
  correct: boolean;
  timeSpent: number;
  hintUsed: boolean;
  perceivedDifficulty: string;
  learningSession: { subject: string };
  question: { metadata: unknown };
}

interface WindowAnalysis {
  strongCount: number;
  struggleCount: number;
}

const statusToPrisma: Record<
  MisconceptionSignalStatus,
  PrismaMisconceptionStatus
> = {
  [MisconceptionSignalStatus.Potential]: PrismaMisconceptionStatus.POTENTIAL,
  [MisconceptionSignalStatus.Suggested]: PrismaMisconceptionStatus.SUGGESTED,
  [MisconceptionSignalStatus.Confirmed]: PrismaMisconceptionStatus.CONFIRMED,
  [MisconceptionSignalStatus.Dismissed]: PrismaMisconceptionStatus.DISMISSED,
};

const typeToPrisma: Record<MisconceptionSignalType, PrismaMisconceptionType> = {
  [MisconceptionSignalType.RepeatedMistake]:
    PrismaMisconceptionType.REPEATED_MISTAKE,
  [MisconceptionSignalType.StoryProblem]: PrismaMisconceptionType.STORY_PROBLEM,
  [MisconceptionSignalType.VisualRepresentation]:
    PrismaMisconceptionType.VISUAL_REPRESENTATION,
  [MisconceptionSignalType.HighLanguageComplexity]:
    PrismaMisconceptionType.HIGH_LANGUAGE_COMPLEXITY,
  [MisconceptionSignalType.HintsOverused]:
    PrismaMisconceptionType.HINTS_OVERUSED,
};

@Injectable()
export class MisconceptionService {
  constructor(private readonly prisma: PrismaService) {}

  async recordAttempt(attemptId: string): Promise<void> {
    const attempt = await this.prisma.questionAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        childId: true,
        learningObjectiveId: true,
        correct: true,
        timeSpent: true,
        hintUsed: true,
        perceivedDifficulty: true,
        learningSession: { select: { subject: true } },
        question: { select: { metadata: true } },
      },
    });

    if (!attempt) {
      return;
    }

    const metadata = attempt.question.metadata as Record<
      string,
      unknown
    > | null;

    const isStory = metadata?.questionType === 'story';
    const isVisual = metadata?.visual === true;
    const isHighLanguage = metadata?.languageComplexity === 'high';

    const signalTypes: MisconceptionSignalType[] = [];

    if (!attempt.correct) {
      signalTypes.push(MisconceptionSignalType.RepeatedMistake);
    }
    if (!attempt.correct && isStory) {
      signalTypes.push(MisconceptionSignalType.StoryProblem);
    }
    if (!attempt.correct && isVisual) {
      signalTypes.push(MisconceptionSignalType.VisualRepresentation);
    }
    if (!attempt.correct && isHighLanguage) {
      signalTypes.push(MisconceptionSignalType.HighLanguageComplexity);
    }
    if (attempt.hintUsed && !attempt.correct) {
      signalTypes.push(MisconceptionSignalType.HintsOverused);
    }

    for (const signalType of signalTypes) {
      await this.applySignal(attempt, signalType);
    }

    await this.evaluateSubjectDifficulty(attempt);
  }

  async getMisconceptions(
    parentId: string,
    childId: string,
  ): Promise<{
    childId: string;
    signals: ReturnType<typeof mapMisconceptionHydrated>[];
  }> {
    const child = await this.prisma.child.findFirst({
      where: { id: childId, parentId },
      select: { id: true },
    });

    if (!child) {
      throw new NotFoundException('Child not found');
    }

    const signals = await this.prisma.misconceptionSignal.findMany({
      where: { childId },
      include: {
        learningObjective: { select: { id: true, name: true } },
      },
      orderBy: { lastDetectedAt: 'desc' },
    });

    return {
      childId,
      signals: signals.map(mapMisconceptionHydrated),
    };
  }

  async getAdaptiveDifficulty(
    parentId: string,
    childId: string,
    subject: BankSubject,
  ): Promise<AdaptiveDifficultyResponseDto> {
    const child = await this.prisma.child.findFirst({
      where: { id: childId, parentId },
      select: { id: true },
    });

    if (!child) {
      throw new NotFoundException('Child not found');
    }

    const record = await this.prisma.childSubjectDifficulty.findUnique({
      where: {
        childId_subject: {
          childId,
          subject: mapSubjectToPrisma(subject),
        },
      },
    });

    const currentDifficulty =
      record?.currentDifficulty ?? ADAPTIVE_DIFFICULTY_CONFIG.defaultDifficulty;

    const attempts = await this.recentSubjectAttempts(childId, subject);
    const analysis = analyzeWindow(attempts);

    const direction = directionFromAnalysis(analysis);
    const rationale = rationaleFor(subject, currentDifficulty, analysis);

    return {
      childId,
      subject,
      currentDifficulty,
      direction,
      rationale,
    };
  }

  async getAdaptiveDifficultyList(
    parentId: string,
    childId: string,
  ): Promise<AdaptiveDifficultyListResponseDto> {
    const child = await this.prisma.child.findFirst({
      where: { id: childId, parentId },
      select: { id: true },
    });

    if (!child) {
      throw new NotFoundException('Child not found');
    }

    const records = await this.prisma.childSubjectDifficulty.findMany({
      where: { childId },
    });

    return {
      childId,
      difficulty: records.map((record) => ({
        subject: mapSubjectFromPrisma(record.subject),
        currentDifficulty: record.currentDifficulty,
      })),
    };
  }

  private async applySignal(
    attempt: AttemptEvidence,
    signalType: MisconceptionSignalType,
  ): Promise<void> {
    const signalConfig = MISCONCEPTION_CONFIG.signalType[signalType];

    const existing = await this.prisma.misconceptionSignal.findUnique({
      where: {
        childId_learningObjectiveId_signalType: {
          childId: attempt.childId,
          learningObjectiveId: attempt.learningObjectiveId,
          signalType: typeToPrisma[signalType],
        },
      },
    });

    if (existing && existing.status === PrismaMisconceptionStatus.DISMISSED) {
      return;
    }

    const evidenceCount = (existing?.evidenceCount ?? 0) + 1;
    const confidence = Math.min(
      MISCONCEPTION_CONFIG.confidenceCeiling,
      evidenceCount * signalConfig.confidenceStepPerEvidence,
    );
    const status = statusFromConfidence(confidence);

    const supporting =
      existing?.supportingAttemptIds != null
        ? [...((existing.supportingAttemptIds as string[]) ?? []), attempt.id]
        : [attempt.id];

    const data = {
      evidenceCount,
      confidence,
      status: statusToPrisma[status],
      lastDetectedAt: new Date(),
      supportingAttemptIds: supporting.slice(-20) as Prisma.InputJsonValue,
    };

    if (existing) {
      await this.prisma.misconceptionSignal.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await this.prisma.misconceptionSignal.create({
        data: {
          childId: attempt.childId,
          learningObjectiveId: attempt.learningObjectiveId,
          signalType: typeToPrisma[signalType],
          firstDetectedAt: new Date(),
          ...data,
        },
      });
    }
  }

  private async evaluateSubjectDifficulty(
    attempt: AttemptEvidence,
  ): Promise<void> {
    const subject = mapSubjectFromPrisma(
      attempt.learningSession.subject as PrismaSubject,
    );
    const attempts = await this.recentSubjectAttempts(attempt.childId, subject);

    const analysis = analyzeWindow(attempts);
    const direction = directionFromAnalysis(analysis);

    if (direction === 'maintain') {
      return;
    }

    const existing = await this.prisma.childSubjectDifficulty.findUnique({
      where: {
        childId_subject: {
          childId: attempt.childId,
          subject: mapSubjectToPrisma(subject),
        },
      },
    });

    const current =
      existing?.currentDifficulty ??
      ADAPTIVE_DIFFICULTY_CONFIG.defaultDifficulty;
    const next = Math.min(
      ADAPTIVE_DIFFICULTY_CONFIG.maxDifficulty,
      Math.max(
        ADAPTIVE_DIFFICULTY_CONFIG.minDifficulty,
        current + (direction === 'increase' ? 1 : -1),
      ),
    );

    if (next === current) {
      return;
    }

    if (existing) {
      await this.prisma.childSubjectDifficulty.update({
        where: { id: existing.id },
        data: { currentDifficulty: next },
      });
    } else {
      await this.prisma.childSubjectDifficulty.create({
        data: {
          childId: attempt.childId,
          subject: mapSubjectToPrisma(subject),
          currentDifficulty: next,
        },
      });
    }
  }

  private async recentSubjectAttempts(childId: string, subject: BankSubject) {
    return this.prisma.questionAttempt.findMany({
      where: {
        childId,
        learningSession: { subject: mapSubjectToPrisma(subject) },
      },
      select: {
        correct: true,
        timeSpent: true,
        hintUsed: true,
        perceivedDifficulty: true,
      },
      orderBy: { createdAt: 'desc' },
      take: ADAPTIVE_DIFFICULTY_CONFIG.windowSize,
    });
  }
}

function statusFromConfidence(confidence: number): MisconceptionSignalStatus {
  if (confidence >= MISCONCEPTION_CONFIG.confirmedFrom) {
    return MisconceptionSignalStatus.Confirmed;
  }
  if (confidence >= MISCONCEPTION_CONFIG.suggestedFrom) {
    return MisconceptionSignalStatus.Suggested;
  }
  return MisconceptionSignalStatus.Potential;
}

function analyzeWindow(
  attempts: Array<{
    correct: boolean;
    timeSpent: number;
    hintUsed: boolean;
    perceivedDifficulty: string;
  }>,
): WindowAnalysis {
  let strongCount = 0;
  let struggleCount = 0;

  for (const attempt of attempts) {
    if (
      attempt.correct &&
      !attempt.hintUsed &&
      attempt.timeSpent <= ADAPTIVE_DIFFICULTY_CONFIG.fastResponseMs &&
      attempt.perceivedDifficulty !== 'DIFFICULT'
    ) {
      strongCount += 1;
    }

    if (
      !attempt.correct ||
      attempt.timeSpent >= ADAPTIVE_DIFFICULTY_CONFIG.slowResponseMs ||
      attempt.perceivedDifficulty === 'DIFFICULT'
    ) {
      struggleCount += 1;
    }
  }

  return { strongCount, struggleCount };
}

function directionFromAnalysis(
  analysis: WindowAnalysis,
): 'increase' | 'decrease' | 'maintain' {
  if (
    analysis.strongCount >= ADAPTIVE_DIFFICULTY_CONFIG.strongSuccessThreshold &&
    analysis.strongCount > analysis.struggleCount
  ) {
    return 'increase';
  }

  if (
    analysis.struggleCount >= ADAPTIVE_DIFFICULTY_CONFIG.struggleThreshold &&
    analysis.struggleCount > analysis.strongCount
  ) {
    return 'decrease';
  }

  return 'maintain';
}

function rationaleFor(
  subject: BankSubject,
  currentDifficulty: number,
  analysis: WindowAnalysis,
): string {
  const direction = directionFromAnalysis(analysis);

  if (direction === 'increase') {
    return `${analysis.strongCount} of the last ${ADAPTIVE_DIFFICULTY_CONFIG.windowSize} ${subject} attempts were correct, fast, and Easy/Just Right. Atlas suggests slightly harder questions.`;
  }

  if (direction === 'decrease') {
    return `${analysis.struggleCount} of the last ${ADAPTIVE_DIFFICULTY_CONFIG.windowSize} ${subject} attempts were wrong, slow, or Difficult. Atlas suggests slightly easier questions or extra scaffolding.`;
  }

  return `Current ${subject} challenge level stays at ${currentDifficulty} of ${ADAPTIVE_DIFFICULTY_CONFIG.maxDifficulty}.`;
}
