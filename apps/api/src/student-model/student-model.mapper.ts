import {
  PerceivedDifficulty as PrismaPerceivedDifficulty,
  QuestionAttempt,
  StudentMastery,
} from '../../generated/prisma/client';
import { MasteryResponseDto } from './dto/mastery-response.dto';
import {
  PerceivedDifficulty,
  ReasonCodeValue,
} from './enums/student-model.enums';

const perceivedDifficultyToPrisma: Record<
  PerceivedDifficulty,
  PrismaPerceivedDifficulty
> = {
  [PerceivedDifficulty.Easy]: PrismaPerceivedDifficulty.EASY,
  [PerceivedDifficulty.JustRight]: PrismaPerceivedDifficulty.JUST_RIGHT,
  [PerceivedDifficulty.Difficult]: PrismaPerceivedDifficulty.DIFFICULT,
};

const perceivedDifficultyFromPrisma: Record<
  PrismaPerceivedDifficulty,
  PerceivedDifficulty
> = {
  [PrismaPerceivedDifficulty.EASY]: PerceivedDifficulty.Easy,
  [PrismaPerceivedDifficulty.JUST_RIGHT]: PerceivedDifficulty.JustRight,
  [PrismaPerceivedDifficulty.DIFFICULT]: PerceivedDifficulty.Difficult,
};

export function mapPerceivedDifficultyToPrisma(
  difficulty: PerceivedDifficulty,
): PrismaPerceivedDifficulty {
  return perceivedDifficultyToPrisma[difficulty];
}

export function mapPerceivedDifficultyFromPrisma(
  difficulty: PrismaPerceivedDifficulty,
): PerceivedDifficulty {
  return perceivedDifficultyFromPrisma[difficulty];
}

export function mapAttemptToResponse(attempt: QuestionAttempt) {
  return {
    id: attempt.id,
    childId: attempt.childId,
    learningSessionId: attempt.learningSessionId,
    questionId: attempt.questionId,
    learningObjectiveId: attempt.learningObjectiveId,
    selectedAnswer: attempt.selectedAnswer,
    correct: attempt.correct,
    timeSpent: attempt.timeSpent,
    hintUsed: attempt.hintUsed,
    perceivedDifficulty: mapPerceivedDifficultyFromPrisma(
      attempt.perceivedDifficulty,
    ),
    attemptNumber: attempt.attemptNumber,
    reasonCodes: attempt.reasonCodes as unknown as ReasonCodeValue[],
    metadata: attempt.metadata as Record<string, unknown> | null,
    createdAt: attempt.createdAt,
  };
}

export function mapMasteryRecordToResponse(
  record: StudentMastery & {
    learningObjective?: { id: string; name: string } | null;
  },
) {
  return {
    learningObjectiveId: record.learningObjectiveId,
    learningObjectiveName:
      record.learningObjective?.name ?? record.learningObjectiveId,
    masteryScore: record.masteryScore,
    confidenceScore: record.confidenceScore,
    totalAttempts: record.totalAttempts,
    correctAttempts: record.correctAttempts,
    wrongAttempts: record.wrongAttempts,
    averageResponseTime: record.averageResponseTime,
    hintUsageCount: record.hintCount,
    lastPracticedAt: record.lastPracticedAt,
    reviewRecommended: record.reviewRecommended,
    reasonCodes: record.reasonCodes as unknown as ReasonCodeValue[],
    updatedAt: record.updatedAt,
  };
}

export function mapMasteryToResponse(
  childId: string,
  records: Array<
    StudentMastery & { learningObjective?: { id: string; name: string } | null }
  >,
): MasteryResponseDto {
  return {
    childId,
    mastery: records.map(mapMasteryRecordToResponse),
  };
}
