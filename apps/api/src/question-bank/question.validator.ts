import { BadRequestException } from '@nestjs/common';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionType } from './enums/question-bank.enums';

export function validateQuestionPayload(
  payload: Pick<
    CreateQuestionDto,
    'questionType' | 'options' | 'correctAnswer'
  >,
): void {
  if (payload.questionType === QuestionType.TrueFalse) {
    if (payload.options.length !== 2) {
      throw new BadRequestException(
        'True / False questions must have exactly two options',
      );
    }

    const normalizedOptions = payload.options.map((option) =>
      option.toLowerCase(),
    );
    const hasTrue = normalizedOptions.includes('true');
    const hasFalse = normalizedOptions.includes('false');

    if (!hasTrue || !hasFalse) {
      throw new BadRequestException(
        'True / False questions must include True and False options',
      );
    }
  }

  if (payload.questionType === QuestionType.MultipleChoice) {
    if (payload.options.length < 2) {
      throw new BadRequestException(
        'Multiple Choice questions must have at least two options',
      );
    }
  }

  if (!payload.options.includes(payload.correctAnswer)) {
    throw new BadRequestException(
      'Correct answer must be one of the provided options',
    );
  }
}

export function validateQuestionUpdate(
  existing: Pick<
    CreateQuestionDto,
    'questionType' | 'options' | 'correctAnswer'
  >,
  update: UpdateQuestionDto,
): void {
  validateQuestionPayload({
    questionType: update.questionType ?? existing.questionType,
    options: update.options ?? existing.options,
    correctAnswer: update.correctAnswer ?? existing.correctAnswer,
  });
}
