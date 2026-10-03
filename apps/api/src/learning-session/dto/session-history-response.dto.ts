import { Curriculum } from '../../child/enums/child.enums';
import {
  LearningSessionStatus,
  Subject,
} from '../enums/learning-session.enums';

export class SessionHistoryItemDto {
  id: string;
  subject: Subject;
  curriculum: Curriculum;
  status: LearningSessionStatus;
  startedAt: Date;
  questionsAnswered: number;
  correctCount: number;
}

export class SessionHistoryResponseDto {
  childId: string;
  sessions: SessionHistoryItemDto[];
}
