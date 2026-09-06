import { Curriculum, Grade } from '../../child/enums/child.enums';
import { QuestionType, BankSubject } from '../enums/question-bank.enums';

export class QuestionHierarchyDto {
  subject: {
    id: string;
    code: BankSubject;
    name: string;
  };
  topic: {
    id: string;
    name: string;
  };
  subtopic: {
    id: string;
    name: string;
  };
  learningObjective: {
    id: string;
    name: string;
    description: string;
    estimatedMasteryTime: number;
  };
}

export class QuestionResponseDto {
  id: string;
  questionText: string;
  questionType: QuestionType;
  options: string[];
  correctAnswer: string;
  explanation: string;
  curriculum: Curriculum;
  grade: Grade;
  difficulty: number;
  metadata: Record<string, unknown> | null;
  hierarchy: QuestionHierarchyDto;
  createdAt: Date;
  updatedAt: Date;
}
