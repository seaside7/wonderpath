export class SubjectDifficultyDto {
  subject: string;
  currentDifficulty: number;
}

export class AdaptiveDifficultyResponseDto {
  childId?: string;
  subject: string;
  currentDifficulty: number;
  direction?: string;
  rationale?: string;
}

export class AdaptiveDifficultyListResponseDto {
  childId: string;
  difficulty: SubjectDifficultyDto[];
}
