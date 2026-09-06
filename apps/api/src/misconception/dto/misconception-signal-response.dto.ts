export class LearningObjectiveRefDto {
  id: string;
  name: string;
}

export class MisconceptionSignalResponseDto {
  id: string;
  signalType: string;
  status: string;
  evidenceCount: number;
  confidence: number;
  firstDetectedAt: Date;
  lastDetectedAt: Date;
  supportingAttemptIds: string[];
  learningObjective: LearningObjectiveRefDto;
}
