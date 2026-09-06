import { MASTERY_CONFIG } from './mastery.config';
import { PerceivedDifficulty, ReasonCode } from './enums/student-model.enums';

export interface AttemptSignal {
  correct: boolean;
  timeSpent: number;
  hintUsed: boolean;
  perceivedDifficulty: PerceivedDifficulty;
}

export interface TimestampedAttemptSignal extends AttemptSignal {
  createdAt: Date;
}

export interface MasteryAggregate {
  masteryScore: number;
  confidenceScore: number;
  totalAttempts: number;
  correctAttempts: number;
  wrongAttempts: number;
  averageResponseTime: number;
  hintCount: number;
  lastPracticedAt: Date;
  reviewRecommended: boolean;
  reasonCodes: string[];
}

export function scoreAttempt(signal: AttemptSignal): number {
  let score = signal.correct ? 1 : 0;

  if (signal.hintUsed) {
    score -= MASTERY_CONFIG.hintPenalty;
  }

  if (signal.timeSpent >= MASTERY_CONFIG.slowResponseThresholdSec) {
    score -= MASTERY_CONFIG.slowPenalty;
  }

  if (
    signal.correct &&
    signal.timeSpent <= MASTERY_CONFIG.fastResponseThresholdSec
  ) {
    score += MASTERY_CONFIG.fastBonus;
  }

  if (
    signal.correct &&
    signal.perceivedDifficulty === PerceivedDifficulty.Difficult
  ) {
    score += MASTERY_CONFIG.challengeBonus;
  }

  if (
    !signal.correct &&
    signal.perceivedDifficulty === PerceivedDifficulty.Easy
  ) {
    score -= MASTERY_CONFIG.easyWrongPenalty;
  }

  return Math.max(0, Math.min(1, score));
}

export function attemptReasonCodes(signal: AttemptSignal): string[] {
  const codes: string[] = [];

  codes.push(
    signal.correct ? ReasonCode.CorrectAnswer : ReasonCode.WrongAnswer,
  );

  if (signal.timeSpent <= MASTERY_CONFIG.fastResponseThresholdSec) {
    codes.push(ReasonCode.FastResponse);
  }

  if (signal.timeSpent >= MASTERY_CONFIG.slowResponseThresholdSec) {
    codes.push(ReasonCode.SlowResponse);
  }

  if (signal.hintUsed) {
    codes.push(ReasonCode.HintUsed);
  }

  if (signal.perceivedDifficulty === PerceivedDifficulty.Difficult) {
    codes.push(ReasonCode.PerceivedDifficult);
  }

  return codes;
}

export function calculateMastery(
  attempts: TimestampedAttemptSignal[],
): MasteryAggregate {
  const totalAttempts = attempts.length;

  if (totalAttempts === 0) {
    return {
      masteryScore: 0,
      confidenceScore: 0,
      totalAttempts: 0,
      correctAttempts: 0,
      wrongAttempts: 0,
      averageResponseTime: 0,
      hintCount: 0,
      lastPracticedAt: new Date(),
      reviewRecommended: false,
      reasonCodes: [],
    };
  }

  const correctAttempts = attempts.filter((attempt) => attempt.correct).length;
  const wrongAttempts = totalAttempts - correctAttempts;
  const hintCount = attempts.filter((attempt) => attempt.hintUsed).length;
  const averageResponseTime =
    attempts.reduce((sum, attempt) => sum + attempt.timeSpent, 0) /
    totalAttempts;

  const meanScore =
    attempts.reduce((sum, attempt) => sum + scoreAttempt(attempt), 0) /
    totalAttempts;

  const masteryScore = Math.round(meanScore * 100);
  const confidenceScore = Math.min(
    100,
    totalAttempts * MASTERY_CONFIG.confidencePerAttempt,
  );

  let lastPracticedAt = attempts[0].createdAt;
  for (const attempt of attempts) {
    if (attempt.createdAt > lastPracticedAt) {
      lastPracticedAt = attempt.createdAt;
    }
  }

  const daysSinceLastPractice =
    (Date.now() - lastPracticedAt.getTime()) / (1000 * 60 * 60 * 24);

  const lowMastery = masteryScore < MASTERY_CONFIG.lowMasteryThreshold;
  const stale = daysSinceLastPractice >= MASTERY_CONFIG.reviewAfterDays;
  const reviewRecommended = lowMastery || stale;

  const reasonCodes: string[] = [];
  if (lowMastery) {
    reasonCodes.push(ReasonCode.LowMastery);
  }
  if (stale) {
    reasonCodes.push(ReasonCode.LongTimeNoPractice);
  }

  return {
    masteryScore,
    confidenceScore,
    totalAttempts,
    correctAttempts,
    wrongAttempts,
    averageResponseTime,
    hintCount,
    lastPracticedAt,
    reviewRecommended,
    reasonCodes,
  };
}
