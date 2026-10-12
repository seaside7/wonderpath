/**
 * Adds new IB Mathematics content so Grade 5 and Grade 6 no longer share the
 * exact same topic list:
 *   GRADE_5: Ratio & Proportion (2 introductory LOs)
 *   GRADE_6: Ratio & Proportion (2 deeper LOs), Negative Numbers (2),
 *            Algebra (2), and the 3 existing Data & Probability LOs.
 * 20 IB questions per LO and grade (4 per difficulty 1-5, about 12 multiple
 * choice + 8 true/false), written by DeepSeek, checked deterministically and
 * then audited one by one by the gateway's default OpenAI model.
 *
 * Generation only runs against the QA database (URL must contain
 * "wonderpath_qa"). It is resumable: a difficulty slot that already has its
 * 4 questions for that LO and grade is skipped.
 *
 *   DATABASE_URL=<qa url> npx ts-node --transpile-only scripts/seed-ib-new-topics.ts            # generate + insert
 *   DATABASE_URL=<qa url> npx ts-node --transpile-only scripts/seed-ib-new-topics.ts --dry-run  # generate, print, no insert
 *   ... --only <loKey>[,<loKey>]   restrict to some LOs (keys below)
 *   ... --export file.json         topics/subtopics/LOs + full question rows made by this script
 *   ... --import file.json         upsert structure by name, insert questions by id if absent (e.g. on VPS)
 */
import 'dotenv/config';
import './register-prisma';
import { readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Prisma, PrismaClient } from '../generated/prisma/client';
import { Curriculum, Grade, QuestionType, Subject } from '../generated/prisma/enums';
import { generate } from '../prisma/qa-seed/llmGateway';
import { validateGeneratedSeeds } from '../src/atlas/content-generation/content-generation.validator';
import { CONTENT_POLICY_BANNED_WORDS, contentPolicyPrompt } from '../src/atlas/books/content-policy';
import { QuestionType as AppQuestionType } from '../src/question-bank/enums/question-bank.enums';

// The API's .env uses ATLAS_-prefixed names; the gateway reads the plain ones.
process.env.DEEPSEEK_API_KEY ??= process.env.ATLAS_DEEPSEEK_API_KEY;
process.env.OPENAI_API_KEY ??= process.env.ATLAS_OPENAI_API_KEY;

const prisma = new PrismaClient();

const SCRIPT_TAG = 'seed-ib-new-topics';
const PER_DIFFICULTY = 4;
const DIFFICULTIES = [1, 2, 3, 4, 5] as const;
/** True/false quota per difficulty: 2+1+2+1+2 = 8 of 20. */
const TF_PER_DIFFICULTY: Record<number, number> = { 1: 2, 2: 1, 3: 2, 4: 1, 5: 2 };
const MAX_ROUNDS = 4;

interface LoSpec {
  key: string;
  grade: 'GRADE_5' | 'GRADE_6';
  topic: string;
  subtopic: string;
  name: string;
  description: string;
  estimatedMasteryTime: number;
  /** What the questions should cover and how difficulty should grow. */
  scope: string;
}

const LOS: LoSpec[] = [
  {
    key: 'g5-ratio-write',
    grade: 'GRADE_5',
    topic: 'Ratio & Proportion',
    subtopic: 'Understanding Ratios',
    name: 'Write and interpret simple ratios',
    description:
      'Students use a ratio a:b to compare two quantities, understand that order matters, tell part-to-part from part-to-whole comparisons, and simplify simple ratios.',
    estimatedMasteryTime: 25,
    scope:
      'Introductory ratio for a Grade 5 child meeting ratio for the first time. Writing a ratio from a described group (e.g. 3 red beads and 5 blue beads gives red:blue = 3:5), order matters (3:5 is not 5:3), part-to-part vs part-to-whole (red to all beads = 3:8), reading "for every ... there are ..." statements, and at higher difficulty simplifying a ratio by dividing both parts by a common factor (e.g. 6:9 = 2:3). Whole numbers only, quantities up to about 60. Difficulty 1: write a ratio straight from two counts. Difficulty 5: groups of three kinds or simplifying a part-to-whole ratio.',
  },
  {
    key: 'g5-ratio-share',
    grade: 'GRADE_5',
    topic: 'Ratio & Proportion',
    subtopic: 'Equivalent Ratios & Sharing',
    name: 'Find equivalent ratios and share an amount in a given ratio',
    description:
      'Students find equivalent ratios by multiplying or dividing both parts by the same number and share a whole-number amount in a two-part ratio.',
    estimatedMasteryTime: 30,
    scope:
      'Grade 5 introduction. Equivalent ratios (multiply or divide both parts by the same number), finding a missing number in an equivalent ratio (2:3 = 8:?), recognising which ratios are equivalent, and sharing an amount in a two-part ratio (share 20 marbles in the ratio 2:3: total parts 5, one part 4, so 8 and 12). Whole-number answers only, amounts up to about 120 (or Rupiah amounts like Rp 30,000). Difficulty 1: double or halve a ratio. Difficulty 5: two-step sharing problems (e.g. find how much more one person gets).',
  },
  {
    key: 'g6-ratio-rate',
    grade: 'GRADE_6',
    topic: 'Ratio & Proportion',
    subtopic: 'Rates & Proportional Reasoning',
    name: 'Find unit rates and use them to solve proportion problems',
    description:
      'Students find unit rates (cost per item, distance per hour, amount per person), compare rates to find the better buy, and solve missing-value proportion problems.',
    estimatedMasteryTime: 35,
    scope:
      'Grade 6, beyond simple ratio. Unit rates (price per item, kilometres per hour, pages per day, litres per minute), using a unit rate to scale up or down (5 pencils cost Rp 10,000, so 8 pencils cost?), comparing two offers to find the better value, and missing-value proportions (3 notebooks for Rp 18,000, how many for Rp 42,000?). Speed questions use constant speed only. Answers may be whole numbers or simple decimals (one or two decimal places). Difficulty 1: one-step unit rate. Difficulty 5: compare two rates or a two-step proportion.',
  },
  {
    key: 'g6-ratio-scale',
    grade: 'GRADE_6',
    topic: 'Ratio & Proportion',
    subtopic: 'Scaling & Ratio Problems',
    name: 'Solve ratio problems by scaling',
    description:
      'Students solve multi-step ratio problems: scaling recipes, using map and model scales, three-part ratios, and finding totals from one part or from the difference between parts.',
    estimatedMasteryTime: 35,
    scope:
      'Grade 6 ratio problem solving. Scaling recipes up or down (a recipe for 4 people needs 300 g flour, how much for 10?), map or model scales (1 cm represents 2 km), three-part ratios (share 90 in the ratio 2:3:4), finding the total or other part when one part is known (boys:girls = 3:4 and there are 12 boys), finding amounts when the difference between parts is known, and simplifying ratios that need a unit change first (50 cm : 2 m). Whole-number or simple decimal answers. Difficulty 1: one scaling step. Difficulty 5: given the difference between parts, or a three-part ratio with a follow-up step.',
  },
  {
    key: 'g6-neg-order',
    grade: 'GRADE_6',
    topic: 'Negative Numbers',
    subtopic: 'Comparing & Ordering Integers',
    name: 'Compare and order integers, including on a number line and with temperatures',
    description:
      'Students place integers on a number line, compare and order positive and negative numbers, and interpret negative values in temperature, sea level and floor-level contexts.',
    estimatedMasteryTime: 25,
    scope:
      'Grade 6 introduction to negative numbers. Position on a number line (which number is 3 to the left of 1?), comparing with < and > (-7 < -2), ordering lists of integers from smallest to largest, the number halfway between two integers, distance between two integers on a number line, and contexts: temperatures in degrees Celsius (which is colder, -5 or -12?), heights above and below sea level, floors below ground level in a building. Integers between -50 and 50. Use the minus sign "-" for negatives. Do not state real temperatures of real places as facts; use "a mountain town", "a freezer" and similar. Difficulty 1: compare two integers. Difficulty 5: order five integers or reason about distance across zero.',
  },
  {
    key: 'g6-neg-addsub',
    grade: 'GRADE_6',
    topic: 'Negative Numbers',
    subtopic: 'Adding & Subtracting Integers',
    name: 'Add and subtract integers',
    description:
      'Students add and subtract positive and negative integers, using a number line and contexts such as temperature changes and lifts going below ground.',
    estimatedMasteryTime: 35,
    scope:
      'Grade 6. Adding and subtracting integers: -3 + 5, 4 - 9, -6 - 4, -2 + (-5), 3 - (-4) (only at difficulty 4-5), temperature rising or falling (the temperature is -4 degrees C and rises by 7 degrees), lifts moving between floors above and below ground, a diver or submarine moving up and down relative to sea level, the difference between two temperatures. Integers between -50 and 50. Use the minus sign "-" for negatives and brackets around a negative number that follows + or - (e.g. 5 + (-3)). Do not state real temperatures of real places as facts. Difficulty 1: add or subtract a small number crossing zero. Difficulty 5: subtracting a negative or a two-step context problem.',
  },
  {
    key: 'g6-alg-expr',
    grade: 'GRADE_6',
    topic: 'Algebra',
    subtopic: 'Expressions',
    name: 'Write and evaluate simple algebraic expressions',
    description:
      'Students use a letter to stand for an unknown number, write simple expressions from words, and evaluate expressions by substituting a value.',
    estimatedMasteryTime: 30,
    scope:
      'Grade 6 introduction to algebra. A letter stands for a number. Writing expressions from words (5 more than n is n + 5; 3 times a number is 3n; a number halved is n/2 or n ÷ 2), writing an expression from a context (each box holds b pencils, how many pencils in 4 boxes? 4b), evaluating expressions by substitution (find 2x + 3 when x = 4), knowing that 3n means 3 x n, and order of operations when substituting. One variable only, whole numbers, values up to 100. Use "x" or a letter for the variable and "×" only for multiplication between numbers; write 3n not 3×n. Difficulty 1: evaluate n + 6 for a given n. Difficulty 5: write a two-operation expression from a context or evaluate something like 3(a + 2) or 20 - 2y.',
  },
  {
    key: 'g6-alg-eq',
    grade: 'GRADE_6',
    topic: 'Algebra',
    subtopic: 'Equations',
    name: 'Solve one-step equations',
    description:
      'Students solve one-step equations of the form x + a = b, x - a = b, ax = b and x ÷ a = b using inverse operations, and check a solution by substitution.',
    estimatedMasteryTime: 30,
    scope:
      'Grade 6. One-step equations solved with the inverse operation: x + 7 = 15, y - 4 = 9, 6m = 42, n ÷ 3 = 5 (or n/3 = 5). Checking whether a value is a solution by substituting, choosing the correct inverse operation, and short word problems that lead to a one-step equation (Mei had some stickers, got 8 more and now has 23). Whole-number solutions only, up to 100. Never two-step equations. Difficulty 1: x + a = b with small numbers. Difficulty 5: a word problem where the child must form the equation, or a multiplication/division equation with larger numbers.',
  },
  {
    key: 'g6-data-tables',
    grade: 'GRADE_6',
    topic: 'Data & Probability',
    subtopic: 'Reading & Interpreting Data',
    name: 'Read and interpret data from tables and bar charts',
    description:
      'Students read and interpret data presented in tables and bar charts, identifying trends and drawing simple conclusions.',
    estimatedMasteryTime: 30,
    scope:
      'Grade 6. The app shows the question as one plain-text paragraph with no line breaks, no tables and no pictures, so describe the data inline in one sentence, for example: "A bar chart shows the books read by four classes: 5A read 24, 5B read 31, 5C read 18 and 5D read 27." Questions: find the greatest or least, totals, differences, how many times more, what fraction of the total, which statement the data supports, changes over time (a trend across days or months). Keep 3 to 6 data values, whole numbers up to 500. Difficulty 1: read the greatest value. Difficulty 5: a two-step comparison or judging which conclusion is supported.',
  },
  {
    key: 'g6-data-mean',
    grade: 'GRADE_6',
    topic: 'Data & Probability',
    subtopic: 'Reading & Interpreting Data',
    name: 'Find the mean (average) of a simple data set',
    description:
      'Students calculate the mean of a small set of whole numbers by summing the values and dividing by the count.',
    estimatedMasteryTime: 20,
    scope:
      'Grade 6. Mean of 3 to 6 values (sum divided by count), mean that is a decimal with one decimal place, finding a missing value when the mean is known (the mean of 4 scores is 7, three are 6, 8 and 5, find the fourth), how the mean changes when a value is added or removed, and the total from the mean and count. Describe data inline (no tables, no line breaks). Whole-number data up to 100. Difficulty 1: mean of three small numbers with a whole-number answer. Difficulty 5: missing value from a known mean or the effect of adding a new value.',
  },
  {
    key: 'g6-data-likelihood',
    grade: 'GRADE_6',
    topic: 'Data & Probability',
    subtopic: 'Basic Probability',
    name: 'Describe the likelihood of simple events (certain, likely, unlikely, impossible)',
    description:
      'Students use everyday language (certain, likely, unlikely, impossible) to describe the chance of simple events happening.',
    estimatedMasteryTime: 25,
    scope:
      'Grade 6. Describe chance with the words impossible, unlikely, even chance, likely, certain; place events on a 0 to 1 probability scale; write a probability as a fraction for equally likely outcomes (a bag has 3 red and 5 blue counters: P(red) = 3/8); compare which of two events is more likely; spinners with equal sections; a fair six-sided dice. Use counters, marbles, spinners, number cards, dice. Do not use coins in a betting context, cards from a gambling deck, raffles, lotteries or prizes for guessing. Fractions should be in simplest form when the question says so. Difficulty 1: choose the likelihood word for a clear event. Difficulty 5: probability as a fraction then compare, or what must change to make two events equally likely.',
  },
];

const LEAK_MARKERS = [
  'wait,', 'wait -', 'let me', "i'll fix", 'i will fix', 'actually', 'hmm', 'correction:',
  'so i need to', 'but correct answer is', 'so correct answer should be', "let's recalculate", 'recalculate',
];
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}]/u;
const PRAISE = /\b(great job|well done|good job|awesome|amazing|excellent work|correct!)/i;

const GENERATOR_SYSTEM = `You write maths practice questions for WonderPath, a learning app for primary-school children following the IB curriculum (Primary Years Programme, international school in Jakarta, Indonesia). Write in clear international English.
Return strict JSON: {"questions": [ {"questionType": "MULTIPLE_CHOICE" | "TRUE_FALSE", "questionText": string, "options": string[], "correctAnswer": string, "explanation": string, "difficulty": number} ]}.

Question rules:
- Every question must be mathematically correct, with exactly ONE correct answer. Work each answer out carefully before writing it.
- MULTIPLE_CHOICE: exactly 4 different options. correctAnswer must be copied character for character from options. The 3 wrong options must be plausible results of a real mistake (for example reversing the ratio, adding instead of multiplying, a sign error), never silly, and none of them may also be correct or defensible.
- TRUE_FALSE: questionText starts with "True or False: " followed by one clear statement. options are exactly ["True", "False"]. correctAnswer is "True" or "False". Mix true and false statements.
- One plain-text paragraph: no line breaks, no tables, no markdown, no pictures referred to ("look at the picture"). Short sentences a Grade 5-6 child can read.
- Format numbers the same way in the question, options and explanation. Use "Rp 15,000" for Rupiah, "km", "kg", "g", "ml", "°C". Write fractions like 3/8.
- Contexts: everyday school, home, market, sport, cooking, travel and nature settings. Use a mix of Indonesian and international first names (Aisyah, Raka, Dewi, Bima, Mei, Omar, Priya, Sam, Hana, Leo and similar). Realistic numbers and prices.
- Do not state facts about the real world (real temperatures of real places, real records, real prices). No brand names or real products.
- Content policy: ${contentPolicyPrompt().replace(/\n/g, ' ')} Also: no food or drink that is not halal, no money lending or debt, no betting, raffles or prizes for chance games.
- No emojis anywhere.
- Every question in the batch must be clearly different from the others and from the "avoidQuestions" list (different numbers AND a different situation or skill).

Explanation rules:
- 2 to 4 short sentences, at most 70 words, simple words a Grade 5-6 child understands.
- First explain WHY the correct answer is right, showing the working (for example "2 + 3 = 5 parts, 20 ÷ 5 = 4, so Raka gets 2 × 4 = 8").
- For a FALSE statement, give the correct value or fact.
- Then, only if you are certain it is a real and specific mistake, name the most likely mistake or why a tempting wrong option does not fit. Any numbers in it must be correct. If unsure, leave this sentence out.
- Do not just restate the question or the answer. Teach the idea.
- No praise ("Great job"), no "The answer is" opener, no questions back to the child, no emojis.
- Describe mistakes neutrally (for example "a common slip is..."); never label the child.
- Never show self-correction or thinking aloud ("wait", "actually", "let me"). Only state facts you are sure of.`;

const AUDITOR_SYSTEM = `You are a strict maths editor checking practice questions for children aged 10-12 (IB Primary Years, Grade 5-6) before they go into a learning app.
Return strict JSON {"solvedAnswer": string, "ok": boolean, "reason": string}.
Step 1: solve the question yourself from questionText and options only, and put the option you get (copied exactly) in solvedAnswer.
Step 2: set ok to false if ANY of these is true:
- the proposed correctAnswer is wrong, or differs from your solvedAnswer;
- more than one option could be argued correct, or the statement (true/false) is ambiguous;
- any number, calculation or fact in the question or explanation is wrong;
- the explanation contradicts the correct answer, corrects itself, is confusing, or describes a "mistake" that is not really a mistake or has wrong numbers;
- the question is outside the learning objective and scope given, or is far beyond what the stated grade can do. Difficulty (1-5) is relative to this learning objective's scope for a child meeting it at this grade, so do NOT reject a question only for being somewhat easier or harder than its difficulty number;
- the wording is unclear, refers to a picture or table that is not shown, or the context is unrealistic;
- it breaks the content policy (no romance, pork, alcohol, gambling or betting, violence, scary content, unsafe behaviour, religious figures, brand names), or states invented real-world facts;
- it contains praise, emojis, or labels the child.
reason: one short sentence (say "fine" when ok is true).`;

interface Candidate {
  questionType: 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: number;
}

const rejections: Array<{ lo: string; difficulty: number; reason: string; questionText: string }> = [];
let auditModel = '';
let generatorModel = '';

function normalize(text: string): string {
  return text.toLowerCase().replace(/^true or false:\s*/, '').replace(/[^a-z0-9]/g, '');
}

function checkCandidate(c: Candidate, difficulty: number): string | null {
  if (c.questionType !== 'MULTIPLE_CHOICE' && c.questionType !== 'TRUE_FALSE') return 'bad questionType';
  if (typeof c.questionText !== 'string' || typeof c.explanation !== 'string') return 'missing text';
  if (!Array.isArray(c.options) || c.options.some((o) => typeof o !== 'string' || !o.trim())) return 'bad options';
  c.questionText = c.questionText.trim();
  c.explanation = c.explanation.trim();
  c.options = c.options.map((o) => o.trim());
  c.correctAnswer = String(c.correctAnswer ?? '').trim();
  // Each call asks for one difficulty only, so a missing value means that one.
  if (c.difficulty === undefined || c.difficulty === null) c.difficulty = difficulty;
  if (c.difficulty !== difficulty) return `difficulty ${c.difficulty} != ${difficulty}`;
  if (/[\r\n|]/.test(c.questionText)) return 'line break or table in question';
  if (c.questionType === 'MULTIPLE_CHOICE') {
    if (c.options.length !== 4) return `${c.options.length} options`;
    if (new Set(c.options.map((o) => o.toLowerCase())).size !== 4) return 'duplicate options';
  } else {
    if (c.options.length !== 2 || c.options[0] !== 'True' || c.options[1] !== 'False') return 'bad true/false options';
    if (!c.questionText.startsWith('True or False: ')) return 'true/false text prefix';
  }
  if (!c.options.includes(c.correctAnswer)) return 'correctAnswer not in options';
  const all = [c.questionText, ...c.options, c.explanation].join(' ');
  if (EMOJI.test(all)) return 'emoji';
  const lowerAll = all.toLowerCase();
  const banned = CONTENT_POLICY_BANNED_WORDS.find((w) => new RegExp(`\\b${w}`, 'i').test(lowerAll));
  if (banned) return `banned word "${banned}"`;
  const lowerExpl = c.explanation.toLowerCase();
  if (LEAK_MARKERS.some((m) => lowerExpl.includes(m))) return 'leaked reasoning';
  if (PRAISE.test(c.explanation)) return 'praise';
  if (/^the (correct )?answer is/i.test(c.explanation)) return '"the answer is" opener';
  const words = c.explanation.split(/\s+/).length;
  if (words < 12 || words > 80) return `explanation ${words} words`;
  try {
    validateGeneratedSeeds(
      [{ ...c, questionType: c.questionType === 'MULTIPLE_CHOICE' ? AppQuestionType.MultipleChoice : AppQuestionType.TrueFalse }],
      1,
    );
  } catch (err) {
    return `validator: ${(err as Error).message}`;
  }
  return null;
}

/** Numeric options read best in ascending order (matches the existing bank); others are shuffled. */
function arrangeOptions(c: Candidate): void {
  if (c.questionType !== 'MULTIPLE_CHOICE') return;
  const asNumber = (o: string) => {
    const s = o.replace(/^Rp\s?/, '').replace(/\s?(°C|km|kg|ml|cm|m|g|minutes|hours)$/, '').replace(/,/g, '');
    return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
  };
  if (c.options.every((o) => !Number.isNaN(asNumber(o)))) {
    c.options.sort((a, b) => asNumber(a) - asNumber(b));
  } else {
    for (let i = c.options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [c.options[i], c.options[j]] = [c.options[j], c.options[i]];
    }
  }
}

async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 3): Promise<T> {
  let last: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      console.warn(`  retry ${i}/${attempts} ${label}: ${(err as Error).message.slice(0, 200)}`);
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

async function audit(spec: LoSpec, c: Candidate): Promise<string | null> {
  const result = await withRetry(
    () =>
      generate(
        'openai',
        JSON.stringify({
          grade: spec.grade === 'GRADE_5' ? 'Grade 5' : 'Grade 6',
          learningObjective: spec.name,
          scope: spec.scope,
          difficulty: c.difficulty,
          questionType: c.questionType,
          questionText: c.questionText,
          options: c.options,
          correctAnswer: c.correctAnswer,
          explanation: c.explanation,
        }),
        AUDITOR_SYSTEM,
      ),
    'audit',
  );
  auditModel = result.model;
  const verdict = JSON.parse(result.content) as { solvedAnswer?: string; ok?: boolean; reason?: string };
  if (String(verdict.solvedAnswer ?? '').trim() !== c.correctAnswer) {
    return `audit solved "${verdict.solvedAnswer}" not "${c.correctAnswer}": ${verdict.reason ?? ''}`;
  }
  return verdict.ok ? null : `audit: ${verdict.reason ?? 'rejected'}`;
}

async function generateBatch(spec: LoSpec, difficulty: number, mc: number, tf: number, avoid: string[]): Promise<Candidate[]> {
  const prompt = JSON.stringify({
    grade: spec.grade === 'GRADE_5' ? 'Grade 5 (age 10-11)' : 'Grade 6 (age 11-12)',
    curriculum: 'IB Primary Years Programme mathematics',
    topic: spec.topic,
    learningObjective: spec.name,
    scope: spec.scope,
    difficulty: `${difficulty} on a scale of 1 (easiest for this grade) to 5 (hardest for this grade)`,
    write: `${mc} MULTIPLE_CHOICE and ${tf} TRUE_FALSE questions (at least ${Math.floor(tf / 2)} of the TRUE_FALSE statements must be false), all with difficulty ${difficulty}`,
    avoidQuestions: avoid.slice(-40),
  });
  const result = await withRetry(() => generate('deepseek', prompt, GENERATOR_SYSTEM), 'generate');
  generatorModel = result.model;
  const parsed = JSON.parse(result.content) as { questions?: Candidate[] };
  return Array.isArray(parsed.questions) ? parsed.questions : [];
}

async function pMap<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

async function ensureLo(spec: Pick<LoSpec, 'topic' | 'subtopic' | 'name' | 'description' | 'estimatedMasteryTime'>) {
  const subjectArea = await prisma.subjectArea.upsert({
    where: { code: Subject.MATHEMATICS },
    create: { code: Subject.MATHEMATICS, name: 'Mathematics' },
    update: {},
  });
  const topic = await prisma.topic.upsert({
    where: { subjectAreaId_name: { subjectAreaId: subjectArea.id, name: spec.topic } },
    create: { name: spec.topic, subjectAreaId: subjectArea.id },
    update: {},
  });
  const subtopic = await prisma.subtopic.upsert({
    where: { topicId_name: { topicId: topic.id, name: spec.subtopic } },
    create: { name: spec.subtopic, topicId: topic.id },
    update: {},
  });
  return prisma.learningObjective.upsert({
    where: { subtopicId_name: { subtopicId: subtopic.id, name: spec.name } },
    create: {
      name: spec.name,
      description: spec.description,
      estimatedMasteryTime: spec.estimatedMasteryTime,
      subtopicId: subtopic.id,
    },
    update: {},
  });
}

/** Fill one difficulty slot for one LO; returns accepted candidates (not yet inserted). */
async function fillSlot(spec: LoSpec, difficulty: number, existing: { questionType: string; questionText: string }[], avoid: string[]) {
  const accepted: Candidate[] = [];
  const have = (type: string) => existing.filter((e) => e.questionType === type).length + accepted.filter((a) => a.questionType === type).length;
  const seen = new Set(avoid.map(normalize));
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const total = existing.length + accepted.length;
    if (total >= PER_DIFFICULTY) break;
    const tfNeed = Math.max(0, TF_PER_DIFFICULTY[difficulty] - have('TRUE_FALSE'));
    const mcNeed = Math.max(0, PER_DIFFICULTY - TF_PER_DIFFICULTY[difficulty] - have('MULTIPLE_CHOICE'));
    // Over-ask by about half so audit rejections rarely need another round.
    const tfAsk = tfNeed ? tfNeed + 1 : 0;
    const mcAsk = mcNeed ? mcNeed + 1 + Math.floor(mcNeed / 2) : 0;
    const label = `${spec.key} d${difficulty} r${round}`;
    let candidates: Candidate[];
    try {
      candidates = await generateBatch(spec, difficulty, mcAsk || (tfAsk ? 0 : 2), tfAsk, [...avoid, ...accepted.map((a) => a.questionText)]);
    } catch (err) {
      console.error(`  ${label}: generation failed: ${(err as Error).message.slice(0, 200)}`);
      continue;
    }
    const checked: Candidate[] = [];
    for (const c of candidates) {
      const problem = checkCandidate(c, difficulty) ?? (seen.has(normalize(c.questionText)) ? 'duplicate' : null);
      if (problem) {
        rejections.push({ lo: spec.key, difficulty, reason: problem, questionText: String(c.questionText ?? '').slice(0, 160) });
        continue;
      }
      seen.add(normalize(c.questionText));
      arrangeOptions(c);
      checked.push(c);
    }
    const verdicts = await pMap(checked, 4, async (c) => {
      try {
        return await audit(spec, c);
      } catch (err) {
        return `audit error: ${(err as Error).message.slice(0, 120)}`;
      }
    });
    checked.forEach((c, i) => {
      const problem = verdicts[i];
      if (problem) {
        rejections.push({ lo: spec.key, difficulty, reason: problem, questionText: c.questionText.slice(0, 160) });
        return;
      }
      const type = c.questionType;
      const quota = type === 'TRUE_FALSE' ? TF_PER_DIFFICULTY[difficulty] : PER_DIFFICULTY - TF_PER_DIFFICULTY[difficulty];
      const totalNow = existing.length + accepted.length;
      if (totalNow >= PER_DIFFICULTY) return;
      // Respect the MC/TF mix while the other type can still fill; after round 2 take whatever passes.
      if (have(type) >= quota && round <= 2) return;
      accepted.push(c);
    });
    console.log(`  ${label}: ${candidates.length} generated, ${checked.length} passed checks, total now ${existing.length + accepted.length}/${PER_DIFFICULTY}`);
  }
  return accepted;
}

async function runLo(spec: LoSpec, dryRun: boolean) {
  const lo = await ensureLo(spec);
  const existingRows = await prisma.question.findMany({
    where: { learningObjectiveId: lo.id, curriculum: Curriculum.IB, grade: spec.grade },
    select: { questionText: true, questionType: true, difficulty: true },
  });
  if (existingRows.length >= DIFFICULTIES.length * PER_DIFFICULTY) {
    console.log(`${spec.key}: already has ${existingRows.length} IB ${spec.grade} questions, skipping`);
    return { key: spec.key, inserted: 0, total: existingRows.length };
  }
  console.log(`${spec.key}: ${existingRows.length} existing, filling to ${DIFFICULTIES.length * PER_DIFFICULTY}`);
  // Other curricula's questions on the shared Data & Probability LOs also go in the avoid list.
  const siblingTexts = (
    await prisma.question.findMany({ where: { learningObjectiveId: lo.id }, select: { questionText: true }, take: 60 })
  ).map((q) => q.questionText);
  const avoid = [...new Set([...existingRows.map((r) => r.questionText), ...siblingTexts])];

  let inserted = 0;
  const results = await pMap([...DIFFICULTIES], 3, async (d) => {
    const slotExisting = existingRows.filter((r) => r.difficulty === d);
    if (slotExisting.length >= PER_DIFFICULTY) return [] as Candidate[];
    return fillSlot(spec, d, slotExisting, avoid);
  });
  // Cross-difficulty duplicate guard (slots ran in parallel).
  const seen = new Set(existingRows.map((r) => normalize(r.questionText)));
  for (const c of results.flat()) {
    const n = normalize(c.questionText);
    if (seen.has(n)) {
      rejections.push({ lo: spec.key, difficulty: c.difficulty, reason: 'duplicate across difficulties', questionText: c.questionText.slice(0, 160) });
      continue;
    }
    seen.add(n);
    if (dryRun) {
      console.log(`\n[${spec.key} d${c.difficulty} ${c.questionType}] ${c.questionText}\n  options: ${JSON.stringify(c.options)}\n  answer: ${c.correctAnswer}\n  explanation: ${c.explanation}`);
      continue;
    }
    await prisma.question.create({
      data: {
        questionText: c.questionText,
        questionType: c.questionType === 'MULTIPLE_CHOICE' ? QuestionType.MULTIPLE_CHOICE : QuestionType.TRUE_FALSE,
        options: c.options,
        correctAnswer: c.correctAnswer,
        explanation: c.explanation,
        curriculum: Curriculum.IB,
        grade: spec.grade === 'GRADE_5' ? Grade.GRADE_5 : Grade.GRADE_6,
        difficulty: c.difficulty,
        learningObjectiveId: lo.id,
        metadata: {
          isSeedData: true,
          seedProvider: 'deepseek',
          seedModel: generatorModel,
          auditModel,
          seedBatch: new Date().toISOString().slice(0, 10),
          seedScript: SCRIPT_TAG,
          language: 'English',
        },
      },
    });
    inserted++;
  }
  const total = await prisma.question.count({ where: { learningObjectiveId: lo.id, curriculum: Curriculum.IB, grade: spec.grade } });
  console.log(`${spec.key}: inserted ${inserted}, now ${total}`);
  return { key: spec.key, inserted, total };
}

interface ExportFile {
  version: 1;
  exportedAt: string;
  learningObjectives: Array<{ key: string; topic: string; subtopic: string; name: string; description: string; estimatedMasteryTime: number }>;
  questions: Array<{
    id: string;
    loKey: string;
    questionText: string;
    questionType: QuestionType;
    options: Prisma.JsonValue;
    correctAnswer: string;
    explanation: string;
    curriculum: Curriculum;
    grade: Grade;
    difficulty: number;
    metadata: Prisma.JsonValue;
  }>;
}

const loKeyOf = (topic: string, subtopic: string, name: string) => `${topic} || ${subtopic} || ${name}`;

async function exportTo(file: string) {
  const rows = await prisma.question.findMany({
    where: { metadata: { path: ['seedScript'], equals: SCRIPT_TAG } },
    include: { learningObjective: { include: { subtopic: { include: { topic: true } } } } },
    orderBy: [{ learningObjectiveId: 'asc' }, { grade: 'asc' }, { difficulty: 'asc' }],
  });
  const los = new Map<string, ExportFile['learningObjectives'][number]>();
  const questions: ExportFile['questions'] = rows.map((r) => {
    const lo = r.learningObjective;
    const key = loKeyOf(lo.subtopic.topic.name, lo.subtopic.name, lo.name);
    los.set(key, {
      key,
      topic: lo.subtopic.topic.name,
      subtopic: lo.subtopic.name,
      name: lo.name,
      description: lo.description,
      estimatedMasteryTime: lo.estimatedMasteryTime,
    });
    return {
      id: r.id,
      loKey: key,
      questionText: r.questionText,
      questionType: r.questionType,
      options: r.options,
      correctAnswer: r.correctAnswer,
      explanation: r.explanation,
      curriculum: r.curriculum,
      grade: r.grade,
      difficulty: r.difficulty,
      metadata: r.metadata,
    };
  });
  const out: ExportFile = { version: 1, exportedAt: new Date().toISOString(), learningObjectives: [...los.values()], questions };
  writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`exported ${los.size} learning objectives and ${questions.length} questions to ${file}`);
}

async function importFrom(file: string) {
  const data = JSON.parse(readFileSync(file, 'utf8')) as ExportFile;
  if (data.version !== 1) throw new Error(`unsupported export version ${String(data.version)}`);
  const loIds = new Map<string, string>();
  for (const lo of data.learningObjectives) {
    loIds.set(lo.key, (await ensureLo(lo)).id);
  }
  let inserted = 0;
  let skipped = 0;
  for (const q of data.questions) {
    if (await prisma.question.findUnique({ where: { id: q.id }, select: { id: true } })) {
      skipped++;
      continue;
    }
    const learningObjectiveId = loIds.get(q.loKey);
    if (!learningObjectiveId) throw new Error(`question ${q.id} references unknown LO ${q.loKey}`);
    await prisma.question.create({
      data: {
        id: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options as Prisma.InputJsonValue,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        curriculum: q.curriculum,
        grade: q.grade,
        difficulty: q.difficulty,
        metadata: (q.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        learningObjectiveId,
      },
    });
    inserted++;
  }
  console.log(`imported ${inserted} questions (${skipped} already present) across ${loIds.size} learning objectives`);
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (name: string) => args.includes(name);
  const value = (name: string) => args[args.indexOf(name) + 1];

  if (flag('--export')) return exportTo(value('--export'));
  if (flag('--import')) return importFrom(value('--import'));

  if (!process.env.DATABASE_URL?.includes('wonderpath_qa')) {
    throw new Error('Generation only runs against the QA database: set DATABASE_URL to the wonderpath_qa URL.');
  }
  const dryRun = flag('--dry-run');
  const only = flag('--only') ? value('--only').split(',') : undefined;
  const specs = LOS.filter((s) => !only || only.includes(s.key));
  console.log(`IB new topics: ${specs.length} LOs${dryRun ? ' (dry run)' : ''}`);

  const summary: Array<{ key: string; inserted: number; total: number; error?: string }> = [];
  for (const spec of specs) {
    try {
      summary.push(await runLo(spec, dryRun));
    } catch (err) {
      console.error(`${spec.key} FAILED: ${(err as Error).message}`);
      summary.push({ key: spec.key, inserted: 0, total: -1, error: (err as Error).message });
    }
  }

  const reasonCounts: Record<string, number> = {};
  for (const r of rejections) {
    const bucket = r.reason.startsWith('audit') ? 'audit' : r.reason.replace(/\d+/g, 'N');
    reasonCounts[bucket] = (reasonCounts[bucket] ?? 0) + 1;
  }
  console.log('\n=== Summary ===');
  console.table(summary);
  console.log(`rejected ${rejections.length}:`, reasonCounts);
  const reportPath = join(tmpdir(), `${SCRIPT_TAG}-report-${Date.now()}.json`);
  writeFileSync(reportPath, JSON.stringify({ summary, reasonCounts, rejections }, null, 2));
  console.log(`report: ${reportPath}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
