import { Curriculum } from '../../child/enums/child.enums';
import {
  LearningSessionContext,
  Subject,
} from '../../learning-session/enums/learning-session.enums';
import { RecommendationAction } from '../enums/recommendation.enums';

export class LearningObjectiveReferenceDto {
  id: string;
  name: string;
  description: string;
  estimatedMasteryTime: number;
  hierarchy: {
    subject: { id: string; code: string; name: string };
    topic: { id: string; name: string };
    subtopic: { id: string; name: string };
  };
}

export class RecommendationItemDto {
  learningObjective: LearningObjectiveReferenceDto;
  action: RecommendationAction;
  reasonCodes: string[];
  explanation: string;
  score: number;
}

export class RecommendationSessionDto {
  id: string;
  curriculum: Curriculum;
  subject: Subject;
  context: LearningSessionContext;
}

export class RecommendationResponseDto {
  childId: string;
  session: RecommendationSessionDto;
  recommendations: RecommendationItemDto[];
}
