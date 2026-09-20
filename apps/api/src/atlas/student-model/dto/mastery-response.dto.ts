import { ReasonCodeValue } from '../enums/student-model.enums';

export class MasteryRecordDto {
  learningObjectiveId: string;
  learningObjectiveName: string;
  masteryScore: number;
  confidenceScore: number;
  totalAttempts: number;
  correctAttempts: number;
  wrongAttempts: number;
  averageResponseTime: number;
  hintUsageCount: number;
  lastPracticedAt: Date;
  reviewRecommended: boolean;
  reasonCodes: ReasonCodeValue[];
  updatedAt: Date;
}

export class MasteryResponseDto {
  childId: string;
  mastery: MasteryRecordDto[];
}
