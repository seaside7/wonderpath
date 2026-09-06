export class LearningPatternDto {
  key: string;
  value: string;
  strength: number;
  evidenceCount: number;
  lastDetectedAt: string;
}

export class LearningPatternResponseDto {
  childId: string;
  patterns: LearningPatternDto[];
}
