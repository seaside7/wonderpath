import { generate, Provider } from './llmGateway';
import { QUESTIONS_PER_DIFFICULTY, SubtopicDef } from './config';

export type QuestionType = 'Multiple Choice' | 'True / False';

export interface GeneratedQuestion {
  questionText: string;
  questionType: QuestionType;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: number;
}

export interface GenerationOutcome {
  questions: GeneratedQuestion[];
  provider: Provider;
  model: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
}

/**
 * curriculumLabel defaults to 'IB' so every existing call site (the
 * original seed-qa-test-questions.ts script) behaves exactly as before
 * without passing anything new.
 */
function systemPromptFor(curriculumLabel: string): string {
  return [
    'You write ORIGINAL practice questions for an EdTech app, in the general style and',
    `difficulty level of the ${curriculumLabel} curriculum for the stated grade. You have NOT seen and`,
    `must NOT reproduce any real ${curriculumLabel} exam paper, textbook, or copyrighted question -`,
    'write new questions from scratch, using only the general public knowledge of what',
    `topics ${curriculumLabel} covers at this grade level as a style/coverage guide.`,
    `Never claim these are official ${curriculumLabel} questions.`,
    'Always respond with a single JSON object: { "questions": [ ... ] }.',
  ].join(' ');
}

interface BuildPromptOptions {
  curriculumLabel?: string;
  languageInstruction?: string;
  questionsPerDifficulty?: number;
}

function buildPrompt(
  def: SubtopicDef,
  grade: 'Grade 5' | 'Grade 6',
  difficulties: readonly number[],
  options: BuildPromptOptions = {},
): string {
  const curriculumLabel = options.curriculumLabel ?? 'IB';
  const perDifficulty = options.questionsPerDifficulty ?? QUESTIONS_PER_DIFFICULTY;
  const total = perDifficulty * difficulties.length;

  return [
    ...(options.languageInstruction ? [options.languageInstruction] : []),
    `Generate ${total} original practice questions for ${grade} students, ${curriculumLabel} curriculum style,`,
    `on the topic "${def.topic}" / subtopic "${def.subtopic}".`,
    `Learning objective: ${def.learningObjective} — ${def.description}`,
    '',
    `Produce exactly ${perDifficulty} questions for EACH of these difficulty levels: ${difficulties.join(', ')} (1=easiest, 5=hardest).`,
    'Mix "Multiple Choice" and "True / False" question types across the set - not all one type.',
    '',
    'For each question, include exactly these fields:',
    '- questionText: string',
    '- questionType: "Multiple Choice" or "True / False"',
    '- options: array of strings (for True / False, exactly ["True", "False"]; for Multiple Choice, 3-5 plausible options)',
    '- correctAnswer: string, must exactly match one entry in options',
    '- explanation: short string explaining why the answer is correct',
    '- difficulty: integer 1-5 matching which tier this question belongs to',
    '',
    'Return JSON exactly as: { "questions": [ { "questionText": ..., "questionType": ..., "options": [...], "correctAnswer": ..., "explanation": ..., "difficulty": ... }, ... ] }',
  ].join('\n');
}

function parseAndValidate(
  raw: string,
  difficulties: readonly number[],
  questionsPerDifficulty: number = QUESTIONS_PER_DIFFICULTY,
): GeneratedQuestion[] {
  let parsed: { questions?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('LLM response was not valid JSON');
  }

  if (!Array.isArray(parsed.questions)) {
    throw new Error('LLM response missing "questions" array');
  }

  const questions = parsed.questions as GeneratedQuestion[];
  const expectedTotal = questionsPerDifficulty * difficulties.length;

  if (questions.length !== expectedTotal) {
    throw new Error(
      `Expected ${expectedTotal} questions, got ${questions.length}`,
    );
  }

  for (const q of questions) {
    if (
      typeof q.questionText !== 'string' ||
      !q.questionText.trim() ||
      (q.questionType !== 'Multiple Choice' && q.questionType !== 'True / False') ||
      !Array.isArray(q.options) ||
      q.options.length < 2 ||
      typeof q.correctAnswer !== 'string' ||
      !q.options.includes(q.correctAnswer) ||
      typeof q.explanation !== 'string' ||
      !q.explanation.trim() ||
      !difficulties.includes(q.difficulty)
    ) {
      throw new Error(`Malformed question: ${JSON.stringify(q).slice(0, 300)}`);
    }
  }

  const countByDifficulty = new Map<number, number>();
  for (const q of questions) {
    countByDifficulty.set(q.difficulty, (countByDifficulty.get(q.difficulty) ?? 0) + 1);
  }
  for (const d of difficulties) {
    if (countByDifficulty.get(d) !== questionsPerDifficulty) {
      throw new Error(
        `Expected ${questionsPerDifficulty} questions at difficulty ${d}, got ${countByDifficulty.get(d) ?? 0}`,
      );
    }
  }

  return questions;
}

export async function generateQuestionBatch(
  def: SubtopicDef,
  grade: 'Grade 5' | 'Grade 6',
  difficulties: readonly number[],
  provider: Provider,
  options: BuildPromptOptions = {},
): Promise<GenerationOutcome> {
  const prompt = buildPrompt(def, grade, difficulties, options);
  const result = await generate(provider, prompt, systemPromptFor(options.curriculumLabel ?? 'IB'));
  const questions = parseAndValidate(result.content, difficulties, options.questionsPerDifficulty);

  return { questions, provider: result.provider, model: result.model, usage: result.usage };
}

export interface QaCheckResult {
  ok: boolean;
  issue?: string;
}

const QA_CHECK_SYSTEM_PROMPT =
  'You are reviewing a practice question for correctness. Respond with a single JSON object: ' +
  '{ "ok": true } if the question is internally consistent (the correct answer actually matches ' +
  'the explanation, no contradictions, options are well-formed, difficulty seems reasonable), or ' +
  '{ "ok": false, "issue": "<short description>" } if there is a real problem.';

export async function qaCheckQuestion(
  question: GeneratedQuestion,
  subtopic: string,
  grade: string,
): Promise<QaCheckResult> {
  const prompt = [
    `Subtopic: ${subtopic}, Grade: ${grade}, Difficulty: ${question.difficulty}`,
    `Question: ${question.questionText}`,
    `Type: ${question.questionType}`,
    `Options: ${question.options.join(' | ')}`,
    `Correct answer: ${question.correctAnswer}`,
    `Explanation: ${question.explanation}`,
  ].join('\n');

  const result = await generate('openai', prompt, QA_CHECK_SYSTEM_PROMPT);

  try {
    const parsed = JSON.parse(result.content) as QaCheckResult;
    return { ok: Boolean(parsed.ok), issue: parsed.issue };
  } catch {
    return { ok: false, issue: 'QA-check response was not valid JSON' };
  }
}
