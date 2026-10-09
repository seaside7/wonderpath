import { Curriculum, Grade } from '../../../child/enums/child.enums';
import { Subject } from '../../../learning-session/enums/learning-session.enums';
import { LearningObjectiveReferenceDto } from './recommendation-response.dto';

export class ChildTopicMasteryDto {
  masteryScore: number;
  confidenceScore: number;
  totalAttempts: number;
}

export class AvailableLearningObjectiveDto extends LearningObjectiveReferenceDto {
  mastery: ChildTopicMasteryDto | null;
}

export class ChildTopicsResponseDto {
  childId: string;
  curriculum: Curriculum;
  subject: Subject;
  grade: Grade;
  learningObjectives: AvailableLearningObjectiveDto[];
}
