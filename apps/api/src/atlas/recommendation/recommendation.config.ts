import { MASTERY_CONFIG } from '../student-model/mastery.config';

export const RECOMMENDATION_CONFIG = {
  lowMasteryThreshold: MASTERY_CONFIG.lowMasteryThreshold,
  highMasteryThreshold: MASTERY_CONFIG.highMasteryThreshold,
  reviewAfterDays: MASTERY_CONFIG.reviewAfterDays,
  lowConfidenceThreshold: 40,
  newObjectiveScore: 20,
  reviewHighMasteryScore: 30,
  reviewLowMasteryScore: 28,
  practiceLowMasteryScore: 25,
  continueScore: 12,
  increaseDifficultyScore: 8,
  examTomorrowBoost: 10,
  quickSessionReviewBoost: 6,
  limit: 3,
} as const;
