export enum PerceivedDifficulty {
  Easy = 'Easy',
  JustRight = 'Just Right',
  Difficult = 'Difficult',
}

export const ReasonCode = {
  CorrectAnswer: 'CORRECT_ANSWER',
  WrongAnswer: 'WRONG_ANSWER',
  FastResponse: 'FAST_RESPONSE',
  SlowResponse: 'SLOW_RESPONSE',
  HintUsed: 'HINT_USED',
  PerceivedDifficult: 'PERCEIVED_DIFFICULT',
  LowMastery: 'LOW_MASTERY',
  LongTimeNoPractice: 'LONG_TIME_NO_PRACTICE',
} as const;

export type ReasonCodeValue = (typeof ReasonCode)[keyof typeof ReasonCode];
