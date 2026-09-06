import { Curriculum } from '../../child/enums/child.enums';
import { Subject } from '../../learning-session/enums/learning-session.enums';
import {
  ExamMaterialExtractionStatus,
  ExamMaterialType,
  ExamPrepContext,
  ExamPrepPlanStatus,
  ExamTopicStatus,
} from '../enums/exam-prep.enums';

export class ExamTopicDto {
  id: string;
  label: string;
  confidence: number;
  status: ExamTopicStatus;
  source: string;
  learningObjectiveId: string | null;
  learningObjectiveName: string | null;
}

export class ExamMaterialDto {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  materialType: ExamMaterialType;
  extractionStatus: ExamMaterialExtractionStatus;
  extractedText: string | null;
  errorMessage: string | null;
}

export class ExamPrepPlanResponseDto {
  id: string;
  child: { id: string; fullName: string };
  subject: Subject;
  curriculum: Curriculum;
  context: ExamPrepContext;
  examDate: string | null;
  status: ExamPrepPlanStatus;
  materials: ExamMaterialDto[];
  topics: ExamTopicDto[];
}

export class ExamPrepPriorityItemDto {
  position: number;
  label: string;
  confidence: number;
  mappedToLearningGraph: boolean;
  learningObjectiveId: string | null;
  masteryScore: number | null;
  priority: number;
}

export class ExamPrepPlanResponseDtoWithPriority {
  id: string;
  child: { id: string; fullName: string };
  subject: Subject;
  curriculum: Curriculum;
  items: ExamPrepPriorityItemDto[];
}
