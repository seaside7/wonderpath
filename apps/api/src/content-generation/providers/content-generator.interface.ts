import { Curriculum, Grade } from '../../child/enums/child.enums';
import { QuestionType } from '../../question-bank/enums/question-bank.enums';

export interface GeneratedQuestionSeed {
  questionText: string;
  questionType: QuestionType;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: number;
  metadata?: Record<string, unknown>;
}

export interface GenerationRequest {
  learningObjective: {
    id: string;
    name: string;
    description: string;
  };
  topicName: string;
  subtopicName: string;
  subject: string;
  curriculum: Curriculum;
  grade: Grade;
  questionType: QuestionType;
  difficulty: number;
  quantity: number;
  providerOptions?: Record<string, unknown>;
}

export interface ContentGenerator {
  readonly provider: string;
  readonly model: string;
  generateQuestions(
    request: GenerationRequest,
  ): Promise<GeneratedQuestionSeed[]>;
}
