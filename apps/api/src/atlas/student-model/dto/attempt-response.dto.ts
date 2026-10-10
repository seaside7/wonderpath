import {
  PerceivedDifficulty,
  ReasonCodeValue,
} from '../enums/student-model.enums';
import { AttemptPointsDto } from '../../points/dto/point-response.dto';

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
  audioUrl: string | null;
  points: AttemptPointsDto | null;
  levelUp: { subject: string; newLevel: number } | null;
  createdAt: Date;
}
