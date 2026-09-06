import { LearningPatternKey } from './enums/learning-pattern.enums';

export const LEARNING_PATTERN_CONFIG = {
  minEvidencePerPattern: {
    [LearningPatternKey.ResponsePace]: 6,
    [LearningPatternKey.PerceivedDifficulty]: 6,
    [LearningPatternKey.BestStudyTime]: 6,
    [LearningPatternKey.StoryPerformance]: 3,
    [LearningPatternKey.VisualPerformance]: 3,
  },
  strengthStep: 0.15,
  robustnessFloor: 0.6,
  responsePace: {
    fastMs: 15_000,
    slowMs: 45_000,
  },
  studyTimeBuckets: {
    MORNING: { start: 5, end: 11 },
    AFTERNOON: { start: 12, end: 16 },
    EVENING: { start: 17, end: 4 },
  },
} as const;

export type StudyTimeBucket = 'Morning' | 'Afternoon' | 'Evening';

export function studyTimeBucketForHour(hour: number): StudyTimeBucket {
  if (hour >= 5 && hour <= 11) {
    return 'Morning';
  }
  if (hour >= 12 && hour <= 16) {
    return 'Afternoon';
  }
  return 'Evening';
}
