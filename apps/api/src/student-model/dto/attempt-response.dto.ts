import {
  PerceivedDifficulty,
  ReasonCodeValue,
} from '../enums/student-model.enums';

export class AttemptResponseDto {
  id: string;
  childId: string;
  learningSessionId: string;
  questionId: string;
  learningObjectiveId: string;
  selectedAnswer: string;
  correct: boolean;
  timeSpent: number;
  hintUsed: boolean;
  perceivedDifficulty: PerceivedDifficulty;
  attemptNumber: number;
  reasonCodes: ReasonCodeValue[];
  metadata: Record<string, unknown> | null;
  explanation: string;
  createdAt: Date;
}
