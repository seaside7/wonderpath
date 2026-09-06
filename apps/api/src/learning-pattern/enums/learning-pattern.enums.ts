import { LearningPatternKey as PrismaLearningPatternKey } from '../../../generated/prisma/client';

export enum LearningPatternKey {
  ResponsePace = 'RESPONSE_PACE',
  PerceivedDifficulty = 'PERCEIVED_DIFFICULTY',
  BestStudyTime = 'BEST_STUDY_TIME',
  StoryPerformance = 'STORY_PERFORMANCE',
  VisualPerformance = 'VISUAL_PERFORMANCE',
}

export enum MotivationStyle {
  Cheerleader = 'Cheerleader',
  GentleCoach = 'Gentle Coach',
  PlayfulBuddy = 'Playful Buddy',
  QuietSupporter = 'Quiet Supporter',
}

export const learningPatternKeyFromPrisma: Record<
  PrismaLearningPatternKey,
  LearningPatternKey
> = {
  [PrismaLearningPatternKey.RESPONSE_PACE]: LearningPatternKey.ResponsePace,
  [PrismaLearningPatternKey.PERCEIVED_DIFFICULTY]:
    LearningPatternKey.PerceivedDifficulty,
  [PrismaLearningPatternKey.BEST_STUDY_TIME]: LearningPatternKey.BestStudyTime,
  [PrismaLearningPatternKey.STORY_PERFORMANCE]:
    LearningPatternKey.StoryPerformance,
  [PrismaLearningPatternKey.VISUAL_PERFORMANCE]:
    LearningPatternKey.VisualPerformance,
};

export function mapLearningPatternKeyFromPrisma(
  key: PrismaLearningPatternKey,
): LearningPatternKey {
  return learningPatternKeyFromPrisma[key];
}
