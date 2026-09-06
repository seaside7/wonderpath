import {
  ExamMaterialType as PrismaExamMaterialType,
  ExamMaterialExtractionStatus as PrismaExamMaterialExtractionStatus,
  ExamPrepPlanStatus as PrismaExamPrepPlanStatus,
  ExamTopicStatus as PrismaExamTopicStatus,
} from '../../generated/prisma/client';
import { mapCurriculumToPrisma } from '../child/child.mapper';
import {
  mapLearningSessionContextToPrisma,
  mapSubjectFromPrisma,
  mapSubjectToPrisma,
} from '../learning-session/learning-session.mapper';
import {
  ExamMaterialExtractionStatus,
  ExamMaterialType,
  ExamPrepContext,
  ExamPrepPlanStatus,
  ExamTopicStatus,
} from './enums/exam-prep.enums';

const materialTypeFromPrisma: Record<PrismaExamMaterialType, ExamMaterialType> =
  {
    [PrismaExamMaterialType.PDF]: ExamMaterialType.Pdf,
    [PrismaExamMaterialType.PHOTO]: ExamMaterialType.Photo,
  };

const extractionStatusFromPrisma: Record<
  PrismaExamMaterialExtractionStatus,
  ExamMaterialExtractionStatus
> = {
  [PrismaExamMaterialExtractionStatus.PENDING]:
    ExamMaterialExtractionStatus.Pending,
  [PrismaExamMaterialExtractionStatus.EXTRACTED]:
    ExamMaterialExtractionStatus.Extracted,
  [PrismaExamMaterialExtractionStatus.FAILED]:
    ExamMaterialExtractionStatus.Failed,
};

const planStatusFromPrisma: Record<
  PrismaExamPrepPlanStatus,
  ExamPrepPlanStatus
> = {
  [PrismaExamPrepPlanStatus.PLANNING]: ExamPrepPlanStatus.Planning,
  [PrismaExamPrepPlanStatus.ACTIVE]: ExamPrepPlanStatus.Active,
  [PrismaExamPrepPlanStatus.COMPLETED]: ExamPrepPlanStatus.Completed,
};

const topicStatusFromPrisma: Record<PrismaExamTopicStatus, ExamTopicStatus> = {
  [PrismaExamTopicStatus.CANDIDATE]: ExamTopicStatus.Candidate,
  [PrismaExamTopicStatus.CONFIRMED]: ExamTopicStatus.Confirmed,
  [PrismaExamTopicStatus.REJECTED]: ExamTopicStatus.Rejected,
};

export {
  mapCurriculumToPrisma,
  mapLearningSessionContextToPrisma,
  mapSubjectFromPrisma,
  mapSubjectToPrisma,
};

export function mapExamPrepStatusToDisplay(
  status: PrismaExamPrepPlanStatus,
): ExamPrepPlanStatus {
  return planStatusFromPrisma[status];
}

export function mapExamMaterialTypeToDisplay(
  type: PrismaExamMaterialType,
): ExamMaterialType {
  return materialTypeFromPrisma[type];
}

export function mapExamExtractionStatusToDisplay(
  status: PrismaExamMaterialExtractionStatus,
): ExamMaterialExtractionStatus {
  return extractionStatusFromPrisma[status];
}

export function mapExamTopicStatusToDisplay(
  status: PrismaExamTopicStatus,
): ExamTopicStatus {
  return topicStatusFromPrisma[status];
}

export function mapExamPrepContextToDisplay(): ExamPrepContext {
  return ExamPrepContext.ExamTomorrow;
}
