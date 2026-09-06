import { MisconceptionSignalType } from './enums/misconception.enums';

export const MISCONCEPTION_CONFIG = {
  confidenceCeiling: 95,
  potentialBelow: 60,
  suggestedFrom: 60,
  confirmedFrom: 85,
  signalType: {
    [MisconceptionSignalType.RepeatedMistake]: {
      confidenceStepPerEvidence: 20,
      minEvidence: 1,
    },
    [MisconceptionSignalType.StoryProblem]: {
      confidenceStepPerEvidence: 15,
      minEvidence: 1,
    },
    [MisconceptionSignalType.VisualRepresentation]: {
      confidenceStepPerEvidence: 15,
      minEvidence: 1,
    },
    [MisconceptionSignalType.HighLanguageComplexity]: {
      confidenceStepPerEvidence: 15,
      minEvidence: 1,
    },
    [MisconceptionSignalType.HintsOverused]: {
      confidenceStepPerEvidence: 10,
      minEvidence: 1,
    },
  },
} as const;

export const ADAPTIVE_DIFFICULTY_CONFIG = {
  defaultDifficulty: 3,
  minDifficulty: 1,
  maxDifficulty: 5,
  windowSize: 6,
  strongSuccessThreshold: 4,
  struggleThreshold: 4,
  fastResponseMs: 10_000,
  slowResponseMs: 30_000,
} as const;
