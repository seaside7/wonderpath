import { BadRequestException } from '@nestjs/common';
import { validateQuestionPayload } from '../../question-bank/question.validator';
import { GeneratedQuestionSeed } from './providers/content-generator.interface';

/**
 * Reasoning markers that indicate leaked LLM self-correction monologue.
 * Both English and Bahasa Indonesia variants are included so that the
 * guard fires regardless of which language the generation used.
 *
 * Note: this is a best-effort heuristic. It may miss patterns in other
 * languages or edge cases. A more robust solution would use an LLM-based
 * classifier or a multilingual model, but that is out of scope for now.
 */
const REASONING_MARKERS = [
  // English
  'wait,',
  'wait -',
  'let me recalculate',
  'let me correct',
  'let me check',
  "i'll fix",
  'so i need to',
  'actually the correct answer',
  'but correct answer is',
  'so correct answer should be',
  "let's recalculate",
  // Bahasa Indonesia
  'tunggu,',
  'tunggu -',
  'biar saya hitung ulang',
  'saya perlu hitung ulang',
  'jadi saya perlu',
  'sebenarnya jawabannya',
  'tapi jawabannya adalah',
  'jadi jawabannya harusnya',
  'mari kita hitung ulang',
] as const;

function explanationContainsReasoning(explanation: string): boolean {
  const lower = explanation.toLowerCase();
  return REASONING_MARKERS.some((marker) => lower.includes(marker));
}

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

    if (explanationContainsReasoning(seed.explanation)) {
      throw new BadRequestException(
        `Generated question contains leaked LLM self-correction reasoning in its explanation: "${seed.questionText.slice(0, 60)}..."`,
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
