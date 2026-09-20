export enum RecommendationAction {
  Continue = 'CONTINUE',
  Review = 'REVIEW',
  Practice = 'PRACTICE',
  IncreaseDifficulty = 'INCREASE_DIFFICULTY',
  DecreaseDifficulty = 'DECREASE_DIFFICULTY',
  ExploreNew = 'EXPLORE_NEW',
}

export const RecommendationReason = {
  LowMastery: 'LOW_MASTERY',
  HighMastery: 'HIGH_MASTERY',
  LongTimeNoPractice: 'LONG_TIME_NO_PRACTICE',
  ReviewRecommended: 'REVIEW_RECOMMENDED',
  Continue: 'CONTINUE',
  NewObjective: 'NEW_OBJECTIVE',
  LowConfidence: 'LOW_CONFIDENCE',
  ExamTomorrow: 'EXAM_TOMORROW',
  QuickSession: 'QUICK_SESSION',
} as const;

export type RecommendationReasonValue =
  (typeof RecommendationReason)[keyof typeof RecommendationReason];
