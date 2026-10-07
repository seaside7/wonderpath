/**
 * Focused unit tests for language threading through the generation pipeline.
 *
 * Tests (per spec step 3):
 * - CreateGenerationDto with language: BahasaIndonesia produces a prompt
 *   containing the Indonesian-language instruction.
 * - CreateGenerationDto with language: English does NOT add that instruction.
 * - No real LLM call is needed — we assert on the constructed prompt string.
 */

import { PreferredLanguage } from '../../src/child/enums/child.enums';
import { QuestionType } from '../../src/question-bank/enums/question-bank.enums';
import { LlmContentGenerator } from '../../src/atlas/content-generation/providers/llm-content-generator';

// LlmContentGenerator needs a minimal config — we only call buildPrompt which
// doesn't make network requests, so the URL/key values are irrelevant.
function buildPrompt(language?: PreferredLanguage): string {
  const gen = new LlmContentGenerator({
    provider: 'test',
    apiKey: 'test-key',
    baseUrl: 'http://localhost',
    model: 'test-model',
  });

  // Access private method via type cast (testing-only pattern)
  const request = {
    learningObjective: {
      id: 'test-lo',
      name: 'Add whole numbers',
      description: 'Add two whole numbers',
    },
    topicName: 'Number Sense',
    subtopicName: 'Addition',
    subject: 'MATHEMATICS',
    curriculum: 'Nasional' as const,
    grade: 'Grade 5' as const,
    questionType: QuestionType.MultipleChoice,
    difficulty: 2,
    quantity: 2,
    language,
  };

  return (gen as unknown as { buildPrompt: (r: typeof request) => string }).buildPrompt(request);
}

describe('language instruction in prompt', () => {
  it('injects Bahasa Indonesia instruction when language is BahasaIndonesia', () => {
    const prompt = buildPrompt(PreferredLanguage.BahasaIndonesia);
    expect(prompt).toContain('Bahasa Indonesia');
    expect(prompt).toContain('Write the question text, options, and explanation entirely in Bahasa Indonesia');
  });

  it('does NOT inject Bahasa Indonesia instruction when language is English', () => {
    const prompt = buildPrompt(PreferredLanguage.English);
    expect(prompt).not.toContain('Bahasa Indonesia');
    expect(prompt).not.toContain('Write the question text, options, and explanation entirely in Bahasa Indonesia');
  });

  it('does NOT inject language instruction when language is omitted', () => {
    const prompt = buildPrompt(undefined);
    expect(prompt).not.toContain('Bahasa Indonesia');
    expect(prompt).not.toContain('Write the question text, options, and explanation entirely in Bahasa Indonesia');
  });
});
