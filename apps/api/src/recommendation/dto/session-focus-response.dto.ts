import { Curriculum } from '../../child/enums/child.enums';
import {
  LearningSessionContext,
  Subject,
} from '../../learning-session/enums/learning-session.enums';

export class SessionFocusResponseDto {
  id: string;
  childId: string;
  curriculum: Curriculum;
  subject: Subject;
  context: LearningSessionContext;
  focusLearningObjective: { id: string; name: string } | null;
}
