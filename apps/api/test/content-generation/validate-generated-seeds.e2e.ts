import { BadRequestException } from '@nestjs/common';
import { validateGeneratedSeeds } from '../../src/atlas/content-generation/content-generation.validator';
import { GeneratedQuestionSeed } from '../../src/atlas/content-generation/providers/content-generator.interface';

describe('validateGeneratedSeeds', () => {
  const validSeed: GeneratedQuestionSeed = {
    questionText: 'What is 2 + 2?',
    questionType: 'MULTIPLE_CHOICE',
    options: ['3', '4', '5'],
    correctAnswer: '4',
    explanation: '2 + 2 equals 4.',
    difficulty: 2,
  };

  it('accepts a clean seed', () => {
    expect(() =>
      validateGeneratedSeeds([validSeed], 1),
    ).not.toThrow();
  });

  it('rejects a seed whose explanation contains "wait,"', () => {
    const seed: GeneratedQuestionSeed = {
      ...validSeed,
      explanation:
        'The distance from 1 is 1 − 5/7 = 2/7 ≈ 0.286. Wait, let me recalculate: 2/7 ≈ 0.286 > 0.25, so the statement is false.',
    };
    expect(() => validateGeneratedSeeds([seed], 1)).toThrow(
      BadRequestException,
    );
  });

  it('rejects a seed whose explanation contains "let me correct"', () => {
    const seed: GeneratedQuestionSeed = {
      ...validSeed,
      explanation: 'The correct answer is 58 m. Let me correct: actually the answer is 54 m.',
    };
    expect(() => validateGeneratedSeeds([seed], 1)).toThrow(
      BadRequestException,
    );
  });

  it('rejects a seed whose explanation contains "actually the correct answer"', () => {
    const seed: GeneratedQuestionSeed = {
      ...validSeed,
      explanation:
        "The statement is false. Actually the correct answer is 'False'.",
    };
    expect(() => validateGeneratedSeeds([seed], 1)).toThrow(
      BadRequestException,
    );
  });

  it('rejects a seed whose explanation contains "but correct answer is"', () => {
    const seed: GeneratedQuestionSeed = {
      ...validSeed,
      explanation:
        "The calculation shows 58 m. But correct answer is '54 m'.",
    };
    expect(() => validateGeneratedSeeds([seed], 1)).toThrow(
      BadRequestException,
    );
  });

  it('rejects a seed whose explanation contains "so correct answer should be"', () => {
    const seed: GeneratedQuestionSeed = {
      ...validSeed,
      explanation: 'Perimeter = 58 m. So correct answer should be 58 m.',
    };
    expect(() => validateGeneratedSeeds([seed], 1)).toThrow(
      BadRequestException,
    );
  });

  it('is case-insensitive', () => {
    const seed: GeneratedQuestionSeed = {
      ...validSeed,
      explanation: 'WAIT, let me recalculate the perimeter.',
    };
    expect(() => validateGeneratedSeeds([seed], 1)).toThrow(
      BadRequestException,
    );
  });

  it('still passes validateQuestionPayload for a clean seed', () => {
    expect(() =>
      validateGeneratedSeeds([validSeed], 1),
    ).not.toThrow();
  });

  // Indonesian reasoning markers (Bahasa Indonesia)
  it('rejects a seed whose explanation contains "tunggu," (Indonesian)', () => {
    const seed: GeneratedQuestionSeed = {
      ...validSeed,
      explanation:
        'Jawabannya adalah 58 m. Tunggu, saya perlu hitung ulang.',
    };
    expect(() => validateGeneratedSeeds([seed], 1)).toThrow(
      BadRequestException,
    );
  });

  it('rejects a seed whose explanation contains "biar saya hitung ulang" (Indonesian)', () => {
    const seed: GeneratedQuestionSeed = {
      ...validSeed,
      explanation:
        'Luas lingkaran = 154 cm². Biar saya hitung ulang: 154 / 3.14 ≈ 49 cm.',
    };
    expect(() => validateGeneratedSeeds([seed], 1)).toThrow(
      BadRequestException,
    );
  });

  it('rejects a seed whose explanation contains "jadi jawabannya harusnya" (Indonesian)', () => {
    const seed: GeneratedQuestionSeed = {
      ...validSeed,
      explanation:
        'Jadi jawabannya harusnya "True" karena pernyataan tersebut benar.',
    };
    expect(() => validateGeneratedSeeds([seed], 1)).toThrow(
      BadRequestException,
    );
  });
});
