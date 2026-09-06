import { Curriculum } from '../../child/enums/child.enums';
import {
  LearningSessionContext,
  LearningSessionStatus,
  Subject,
} from '../enums/learning-session.enums';

export class LearningSessionChildDto {
  id: string;
  fullName: string;
}

export class LearningSessionFocusDto {
  id: string;
  name: string;
}

export class LearningSessionResponseDto {
  id: string;
  child: LearningSessionChildDto;
  curriculum: Curriculum;
  subject: Subject;
  status: LearningSessionStatus;
  context: LearningSessionContext;
  focusLearningObjective: LearningSessionFocusDto | null;
  startedAt: Date;
}
