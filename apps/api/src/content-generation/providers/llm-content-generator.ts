import { QuestionType } from '../../question-bank/enums/question-bank.enums';
import {
  ContentGenerator,
  GeneratedQuestionSeed,
  GenerationRequest,
} from './content-generator.interface';

export interface LlmContentGeneratorConfig {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

/**
 * Works with any OpenAI-compatible chat-completions API (OpenAI, DeepSeek, etc.)
 * so Atlas is not tied to a single LLM provider.
 */
export class LlmContentGenerator implements ContentGenerator {
  readonly provider: string;

  readonly model: string;

  private readonly apiKey: string;

  private readonly baseUrl: string;

  constructor(config: LlmContentGeneratorConfig) {
    if (!config.apiKey) {
      throw new Error(
        `API key is required when ATLAS_CONTENT_PROVIDER=${config.provider}`,
      );
    }
    this.provider = config.provider;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.model = config.model;
  }

  async generateQuestions(
    request: GenerationRequest,
  ): Promise<GeneratedQuestionSeed[]> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You generate primary school educational questions as JSON. ' +
              'Always respond with a JSON object containing a "questions" array.',
          },
          {
            role: 'user',
            content: this.buildPrompt(request),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(
        `LLM generation failed with status ${response.status}: ${await response.text()}`,
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('LLM returned an empty response');
    }

    const parsed = JSON.parse(content) as {
      questions?: GeneratedQuestionSeed[];
    };

    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new Error('LLM output did not contain a questions array');
    }

    return parsed.questions;
  }

  private buildPrompt(request: GenerationRequest): string {
    const questionTypePrompt =
      request.questionType === QuestionType.TrueFalse
        ? 'a true/false question with exactly the two options "True" and "False"'
        : 'a multiple choice question with at least two options';

    return [
      `Generate ${request.quantity} ${questionTypePrompt}.`,
      `Curriculum: ${request.curriculum}`,
      `Grade: ${request.grade}`,
      `Subject: ${request.subject}`,
      `Topic: ${request.topicName}`,
      `Subtopic: ${request.subtopicName}`,
      `Learning Objective: ${request.learningObjective.name}`,
      `Level of difficulty (1-5): ${request.difficulty}`,
      '',
      'For each question include: questionText, questionType ("Multiple Choice" or "True / False"), options (array of strings, must include correctAnswer), correctAnswer, explanation, difficulty (1-5), metadata (object).',
      '',
      'Return JSON in the shape: { "questions": [ ... ] }',
    ].join('\n');
  }
}
