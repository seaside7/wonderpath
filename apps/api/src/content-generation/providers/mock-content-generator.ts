import { QuestionType } from '../../question-bank/enums/question-bank.enums';
import {
  ContentGenerator,
  GeneratedQuestionSeed,
  GenerationRequest,
} from './content-generator.interface';

export class MockContentGenerator implements ContentGenerator {
  readonly provider = 'mock';
  readonly model = 'mock-v1';

  generateQuestions(
    request: GenerationRequest,
  ): Promise<GeneratedQuestionSeed[]> {
    const providerOptions = request.providerOptions ?? {};

    if (providerOptions.invalid === true) {
      return Promise.resolve([this.invalidSeed(request)]);
    }

    const seeds: GeneratedQuestionSeed[] = [];

    for (let index = 0; index < request.quantity; index++) {
      seeds.push(this.validSeed(request, index));
    }

    return Promise.resolve(seeds);
  }

  private validSeed(
    request: GenerationRequest,
    index: number,
  ): GeneratedQuestionSeed {
    if (request.questionType === QuestionType.TrueFalse) {
      return {
        questionText: `${request.learningObjective.name} practice #${index + 1}`,
        questionType: QuestionType.TrueFalse,
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: 'This statement is correct.',
        difficulty: request.difficulty,
        metadata: { generatedBy: 'mock', index, story: false },
      };
    }

    return {
      questionText: `${request.learningObjective.name} practice #${index + 1}`,
      questionType: QuestionType.MultipleChoice,
      options: ['3', '4', '5'],
      correctAnswer: '4',
      explanation: 'Two plus two equals four.',
      difficulty: request.difficulty,
      metadata: { generatedBy: 'mock', index, story: false },
    };
  }

  private invalidSeed(request: GenerationRequest): GeneratedQuestionSeed {
    return {
      questionText: 'Broken generated question',
      questionType: request.questionType,
      options: ['Option A', 'Option B'],
      correctAnswer: 'Option C',
      explanation: 'This seed intentionally references a missing option.',
      difficulty: request.difficulty,
      metadata: { generatedBy: 'mock', invalid: true },
    };
  }
}
