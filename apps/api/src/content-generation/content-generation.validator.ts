import { BadRequestException } from '@nestjs/common';
import { validateQuestionPayload } from '../question-bank/question.validator';
import { GeneratedQuestionSeed } from './providers/content-generator.interface';

export function validateGeneratedSeeds(
  seeds: GeneratedQuestionSeed[],
  expectedQuantity: number,
): void {
  if (!Array.isArray(seeds) || seeds.length === 0) {
    throw new BadRequestException(
      'AI output is empty; expected at least one question',
    );
  }

  if (seeds.length > expectedQuantity) {
    throw new BadRequestException(
      `AI generated ${seeds.length} questions but only ${expectedQuantity} were requested`,
    );
  }

  for (const seed of seeds) {
    if (
      typeof seed.questionText !== 'string' ||
      seed.questionText.trim().length === 0
    ) {
      throw new BadRequestException(
        'Generated question is missing question text',
      );
    }

    if (
      typeof seed.explanation !== 'string' ||
      seed.explanation.trim().length === 0
    ) {
      throw new BadRequestException(
        'Generated question is missing an explanation',
      );
    }

    if (
      typeof seed.difficulty !== 'number' ||
      seed.difficulty < 1 ||
      seed.difficulty > 5
    ) {
      throw new BadRequestException(
        'Generated question has an invalid difficulty signal',
      );
    }

    validateQuestionPayload({
      questionType: seed.questionType,
      options: seed.options,
      correctAnswer: seed.correctAnswer,
    });
  }
}
