export const MASTERY_CONFIG = {
  fastResponseThresholdSec: 10,
  slowResponseThresholdSec: 30,
  hintPenalty: 0.25,
  slowPenalty: 0.1,
  fastBonus: 0.05,
  challengeBonus: 0.05,
  easyWrongPenalty: 0.1,
  confidencePerAttempt: 20,
  lowMasteryThreshold: 60,
  highMasteryThreshold: 80,
  reviewAfterDays: 7,
} as const;
