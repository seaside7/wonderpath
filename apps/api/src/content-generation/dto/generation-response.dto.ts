import { Curriculum, Grade } from '../../child/enums/child.enums';
import { QuestionResponseDto } from '../../question-bank/dto/question-response.dto';
import { QuestionType } from '../../question-bank/enums/question-bank.enums';
import { GenerationStatus } from '../enums/content-generation.enums';

export class GenerationResponseDto {
  id: string;
  status: GenerationStatus;
  curriculum: Curriculum;
  grade: Grade;
  subject: {
    id: string;
    code: string;
    name: string;
  };
  topic: {
    id: string;
    name: string;
  };
  learningObjective: {
    id: string;
    name: string;
  };
  questionType: QuestionType;
  difficulty: number;
  quantity: number;
  provider: string;
  model: string;
  generationMetadata: Record<string, unknown> | null;
  error: string | null;
  questions: QuestionResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}
