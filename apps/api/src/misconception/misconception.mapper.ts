import {
  ChildSubjectDifficulty,
  MisconceptionSignal,
} from '../../generated/prisma/client';
import { LearningObjectiveRefDto } from './dto/learning-objective-ref.dto';
import { AdaptiveDifficultyResponseDto } from './dto/adaptive-difficulty-response.dto';

export type MisconceptionSignalRecord = MisconceptionSignal & {
  learningObjective?: { id: string; name: string } | null;
};

export function mapMisconceptionHydrated(record: MisconceptionSignalRecord): {
  id: string;
  signalType: string;
  status: string;
  evidenceCount: number;
  confidence: number;
  firstDetectedAt: Date;
  lastDetectedAt: Date;
  supportingAttemptIds: string[];
  learningObjective: LearningObjectiveRefDto;
} {
  return {
    id: record.id,
    signalType: record.signalType,
    status: record.status,
    evidenceCount: record.evidenceCount,
    confidence: record.confidence,
    firstDetectedAt: record.firstDetectedAt,
    lastDetectedAt: record.lastDetectedAt,
    supportingAttemptIds: record.supportingAttemptIds as string[],
    learningObjective: {
      id: record.learningObjectiveId,
      name: record.learningObjective?.name ?? record.learningObjectiveId,
    },
  };
}

export function mapSubjectDifficultyRecord(
  record: ChildSubjectDifficulty,
): AdaptiveDifficultyResponseDto {
  return {
    subject: record.subject,
    currentDifficulty: record.currentDifficulty,
  };
}
