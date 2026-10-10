import 'dotenv/config';
import './register-prisma';
import * as fs from 'fs';
import * as path from 'path';
import {
  PrismaClient,
  BookStatus,
  Grade,
  PreferredLanguage,
  Prisma,
} from '../generated/prisma/client';
import { generate, generateWithImages } from '../prisma/qa-seed/llmGateway';
import {
  CONTENT_POLICY_BANNED_WORDS,
  contentPolicyPrompt,
} from '../src/atlas/books/content-policy';
import { downloadImage, generateImage } from './higgsfield';

const ART_STYLE =
  "soft colorful children's book illustration, warm lighting, rounded shapes";
const BOOK_LEVELS = {
  1: { minWords: 600, maxWords: 1000, pages: [8, 10], fk: [4.5, 5.5] },
  2: { minWords: 600, maxWords: 1000, pages: [8, 10], fk: [4.5, 5.5] },
  3: { minWords: 600, maxWords: 1000, pages: [8, 10], fk: [4.5, 5.5] },
} as const;
const REASONING_MARKERS = [
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
  'tunggu,',
  'tunggu -',
  'sebenarnya jawabannya',
  'tapi jawabannya adalah',
  'jadi jawabannya harusnya',
];
const prisma = new PrismaClient();

interface GeneratedBook {
  title: string;
  summary: string;
  characters: Array<{ name: string; description: string }>;
  pages: Array<{ text: string }>;
  quiz: Array<{
    prompt: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  }>;
}

interface AuditResult {
  pass: boolean;
  violations: Array<{ rule: string; quote: string; reason: string }>;
}

function loadRootEnv(): void {
  let directory = __dirname;
  for (let i = 0; i < 10; i += 1) {
    const envPath = path.join(directory, '.env');
    if (fs.existsSync(envPath)) {
      for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        if (!line.trim() || line.trim().startsWith('#') || !line.includes('='))
          continue;
        const index = line.indexOf('=');
        const key = line.slice(0, index).trim();
        const value = line
          .slice(index + 1)
          .trim()
          .replace(/^"|"$/g, '');
        if (!process.env[key]) process.env[key] = value;
      }
      return;
    }
    const parent = path.dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const value = (name: string, fallback: string) =>
    args
      .find((arg) => arg.startsWith(`${name}=`))
      ?.split('=')
      .slice(1)
      .join('=') ?? fallback;
  const count = Number(value('--count', '3'));
  const grade = value('--grade', 'Grade 5');
  const trailStop = Number(value('--trail-stop', '3'));
  if (!Number.isInteger(count) || count < 1)
    throw new Error('--count must be a positive integer');
  if (
    !Number.isInteger(trailStop) ||
    !BOOK_LEVELS[trailStop as keyof typeof BOOK_LEVELS]
  )
    throw new Error('--trail-stop must be 1, 2, or 3');
  return { count, grade, trailStop };
}

function parseJson<T>(content: string): T {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  return JSON.parse(cleaned) as T;
}

function gradeValue(value: string): Grade {
  const match = value.match(/([1-6])/);
  if (!match) throw new Error(`Unsupported grade: ${value}`);
  return `GRADE_${match[1]}` as Grade;
}

function words(text: string): string[] {
  return text.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) ?? [];
}

function syllables(word: string): number {
  const normalized = word.toLowerCase().replace(/[^a-z]/g, '');
  if (normalized.length <= 3) return 1;
  const groups = normalized.replace(/e$/, '').match(/[aeiouy]+/g)?.length ?? 1;
  return Math.max(1, groups);
}

function readabilityGrade(text: string): number {
  const sentenceCount = Math.max(
    1,
    text.split(/[.!?]+/).filter(Boolean).length,
  );
  const wordList = words(text);
  const syllableCount = wordList.reduce(
    (sum, word) => sum + syllables(word),
    0,
  );
  return (
    0.39 * (wordList.length / sentenceCount) +
    11.8 * (syllableCount / Math.max(1, wordList.length)) -
    15.59
  );
}

function ruleCheck(book: GeneratedBook, level: (typeof BOOK_LEVELS)[1]) {
  const text = [
    book.title,
    book.summary,
    ...book.pages.map((page) => page.text),
    ...book.quiz.map(
      (question) => `${question.prompt} ${question.explanation}`,
    ),
  ].join(' ');
  const lower = text.toLowerCase();
  const wordCount = words(text).length;
  const fk = readabilityGrade(text);
  const issues: string[] = [];
  if (wordCount < level.minWords || wordCount > level.maxWords)
    issues.push(
      `word count ${wordCount} outside ${level.minWords}-${level.maxWords}`,
    );
  if (fk < level.fk[0] || fk > level.fk[1])
    issues.push(
      `Flesch-Kincaid grade ${fk.toFixed(2)} outside ${level.fk.join('-')}`,
    );
  for (const banned of CONTENT_POLICY_BANNED_WORDS) {
    const pattern = new RegExp(
      `(^|\\W)${banned.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}(\\W|$)`,
      'i',
    );
    if (pattern.test(lower)) issues.push(`banned policy term: ${banned}`);
  }
  for (const question of book.quiz) {
    if (
      question.options.length !== 4 ||
      !question.options.includes(question.correctAnswer)
    )
      issues.push(`invalid options for quiz question: ${question.prompt}`);
    if (
      REASONING_MARKERS.some((marker) =>
        question.explanation.toLowerCase().includes(marker),
      )
    )
      issues.push(`reasoning marker in quiz explanation: ${question.prompt}`);
  }
  return { issues, wordCount, fk };
}

async function writeBook(grade: Grade, trailStop: number, index: number) {
  const level = BOOK_LEVELS[trailStop as keyof typeof BOOK_LEVELS];
  const writerPrompt = `Write one original English ${grade.replace('GRADE_', 'Grade ')} children's story for trail stop ${trailStop}. Alternate fiction and non-fiction across calls. Return strict JSON with title, summary, characters (name and detailed visual description), ${level.pages[0]}-${level.pages[1]} pages with text only, and exactly 3 multiple-choice quiz questions with four options, correctAnswer, and a short explanation. Target ${level.minWords}-${level.maxWords} words and Flesch-Kincaid ${level.fk[0]}-${level.fk[1]}. Policy:\n${contentPolicyPrompt()}`;
  const auditTrail: unknown[] = [];
  let result = parseJson<GeneratedBook>(
    (
      await generate(
        'deepseek',
        writerPrompt,
        "You are a careful children's book writer. Output JSON only.",
        'deepseek-chat',
      )
    ).content,
  );
  let checks = ruleCheck(result, level);
  for (let rewrite = 0; checks.issues.length > 0 && rewrite < 2; rewrite += 1) {
    result = parseJson<GeneratedBook>(
      (
        await generate(
          'deepseek',
          `Rewrite this book to fix these deterministic issues: ${checks.issues.join('; ')}. Preserve the useful premise and return the complete strict JSON book.\n${JSON.stringify(result)}`,
          `Policy:\n${contentPolicyPrompt()}`,
          'deepseek-chat',
        )
      ).content,
    );
    checks = ruleCheck(result, level);
  }

  const auditPrompt = `Audit this complete story and quiz against this policy. Return strict JSON {"pass":boolean,"violations":[{"rule":string,"quote":string,"reason":string}]}.\nPolicy:\n${contentPolicyPrompt()}\nBook:\n${JSON.stringify(result)}`;
  let audit = parseJson<AuditResult>(
    (
      await generate(
        'openai',
        auditPrompt,
        'You are an independent content auditor. Output JSON only.',
        process.env.BOOK_AUDITOR_MODEL ?? 'gpt-4o-mini',
      )
    ).content,
  );
  auditTrail.push({ type: 'text', ...audit });
  for (let rewrite = 0; !audit.pass && rewrite < 2; rewrite += 1) {
    result = parseJson<GeneratedBook>(
      (
        await generate(
          'deepseek',
          `Rewrite this book to address these auditor violations: ${JSON.stringify(audit.violations)}. Return the complete strict JSON book.\n${JSON.stringify(result)}`,
          `Policy:\n${contentPolicyPrompt()}`,
          'deepseek-chat',
        )
      ).content,
    );
    checks = ruleCheck(result, level);
    audit = parseJson<AuditResult>(
      (
        await generate(
          'openai',
          `Audit this rewritten story and quiz against this policy. Return strict JSON {"pass":boolean,"violations":[{"rule":string,"quote":string,"reason":string}]}.\nPolicy:\n${contentPolicyPrompt()}\nBook:\n${JSON.stringify(result)}`,
          'You are an independent content auditor. Output JSON only.',
          process.env.BOOK_AUDITOR_MODEL ?? 'gpt-4o-mini',
        )
      ).content,
    );
    auditTrail.push({ type: 'text-rewrite', rewrite: rewrite + 1, ...audit });
  }

  const wordCount = words(
    [result.summary, ...result.pages.map((page) => page.text)].join(' '),
  ).length;
  const book = await prisma.book.create({
    data: {
      title: result.title,
      summary: result.summary,
      grade,
      trailStop,
      language: PreferredLanguage.ENGLISH,
      status:
        audit.pass && checks.issues.length === 0
          ? BookStatus.IN_REVIEW
          : BookStatus.REJECTED,
      wordCount,
      readabilityGrade: checks.fk,
      auditResult: auditTrail as unknown as Prisma.InputJsonValue,
      generationMeta: {
        writer: 'deepseek-chat',
        auditor: process.env.BOOK_AUDITOR_MODEL ?? 'gpt-4o-mini',
        imageCount: 0,
        estimatedCostUsd: 0,
      },
      pages: {
        create: result.pages.map((page, pageIndex) => ({
          pageNumber: pageIndex + 1,
          text: page.text,
        })),
      },
      characters: {
        create: result.characters.map((character) => ({
          name: character.name,
          description: character.description,
          referenceImageUrl: '',
        })),
      },
      quizQuestions: {
        create: result.quiz.map((question, questionIndex) => ({
          order: questionIndex + 1,
          prompt: question.prompt,
          options: question.options,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
        })),
      },
    },
  });

  // Image generation is intentionally after text approval. Missing media is
  // recorded as a rejection instead of pretending the pilot is complete.
  let finalStatus = book.status;
  if (book.status === BookStatus.IN_REVIEW) {
    try {
      if (!process.env.HIGGSFIELD_API_KEY)
        throw new Error(
          'HIGGSFIELD_API_KEY is required to generate book images',
        );
      const directory = path.join(
        process.env.BOOK_UPLOADS_DIR ?? 'uploads/books',
        book.id,
      );
      let imageCount = 0;
      // Higgsfield can only fetch public remote URLs, never our local
      // /book-media paths — keep the remote sheet URLs for image_urls and
      // download to local storage separately.
      const referenceRemoteUrls: string[] = [];
      for (const character of result.characters) {
        const { url } = await generateAuditedImage(
          {
            model: 'higgsfield-ai/soul/v2/standard',
            prompt: `${ART_STYLE}. Full-body character reference for ${character.description}. No text, letters, words, logos, or symbols in the image.`,
          },
          `character reference: ${character.name}`,
          auditTrail,
        );
        const filename = `character-${character.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.jpg`;
        await downloadImage(url, directory, filename);
        const localUrl = `/book-media/${book.id}/${filename}`;
        referenceRemoteUrls.push(url);
        await prisma.bookCharacter.updateMany({
          where: { bookId: book.id, name: character.name },
          data: { referenceImageUrl: localUrl },
        });
        imageCount += 1;
      }
      const cover = await generateAuditedImage(
        {
          model: 'xai/grok-imagine-image-2.0',
          prompt: `${ART_STYLE}. A cover illustration for ${result.title}: ${result.summary}. No text, letters, words, logos, or symbols in the image.`,
          image_urls: referenceRemoteUrls,
        },
        'cover',
        auditTrail,
      );
      await downloadImage(cover.url, directory, 'cover.jpg');
      imageCount += 1;
      for (const [pageIndex, page] of result.pages.entries()) {
        const { url } = await generateAuditedImage(
          {
            model: 'xai/grok-imagine-image-2.0',
            prompt: `${ART_STYLE}. Illustrate this page: ${page.text}. No text, letters, words, logos, or symbols in the image.`,
            image_urls: referenceRemoteUrls,
          },
          `page ${pageIndex + 1}`,
          auditTrail,
        );
        const filename = `page-${pageIndex + 1}.jpg`;
        await downloadImage(url, directory, filename);
        await prisma.bookPage.update({
          where: {
            bookId_pageNumber: { bookId: book.id, pageNumber: pageIndex + 1 },
          },
          data: { imageUrl: `/book-media/${book.id}/${filename}` },
        });
        imageCount += 1;
      }
      const flaggedImages = auditTrail.filter(
        (entry) =>
          typeof entry === 'object' &&
          entry !== null &&
          (entry as { type?: string }).type === 'image' &&
          (entry as { pass?: boolean }).pass === false,
      );
      await prisma.book.update({
        where: { id: book.id },
        data: {
          coverImageUrl: `/book-media/${book.id}/cover.jpg`,
          auditResult: auditTrail as unknown as Prisma.InputJsonValue,
          generationMeta: {
            writer: 'deepseek-chat',
            auditor: process.env.BOOK_AUDITOR_MODEL ?? 'gpt-4o-mini',
            imageCount,
            estimatedCostUsd:
              Number(process.env.BOOK_ESTIMATED_IMAGE_COST_USD ?? 0) *
              imageCount,
          },
        },
      });
      if (flaggedImages.length > 0) {
        console.warn(
          `Book ${book.id}: ${flaggedImages.length} image(s) failed audit twice and are flagged for human review (kept, status stays IN_REVIEW)`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      finalStatus = BookStatus.REJECTED;
      await prisma.book.update({
        where: { id: book.id },
        data: {
          status: BookStatus.REJECTED,
          auditResult: [
            ...auditTrail,
            {
              type: 'image',
              pass: false,
              violations: [
                { rule: 'Image generation', quote: '', reason: message },
              ],
            },
          ] as unknown as Prisma.InputJsonValue,
        },
      });
      console.error(`Book ${book.id} image generation failed: ${message}`);
    }
  }
  console.log(
    `Book ${index}: ${book.id} ${finalStatus}, estimated cost recorded in generationMeta`,
  );
  return { ...book, status: finalStatus };
}

interface ImageAuditVerdict {
  pass: boolean;
  violations: Array<{ rule: string; quote: string; reason: string }>;
}

async function auditImage(
  imageUrl: string,
  label: string,
): Promise<ImageAuditVerdict> {
  const findings = await generateWithImages(
    `Audit this children's book illustration (${label}) for three things: (1) violations of this content policy, (2) any visible text, letters, numbers, words, or symbols in the image, (3) obvious defects such as extra limbs or fingers, distorted faces, or mangled hands. Return strict JSON {"pass":boolean,"violations":[{"rule":string,"quote":string,"reason":string}]}. Describe visible text under rule "No text in images".\nPolicy:\n${contentPolicyPrompt()}`,
    "You are an independent image auditor for children's books. Output JSON only.",
    process.env.BOOK_AUDITOR_MODEL ?? 'gpt-4o-mini',
    [imageUrl],
  );
  return parseJson<ImageAuditVerdict>(findings.content);
}

async function generateAuditedImage(
  request: { model: string; prompt: string; image_urls?: string[] },
  label: string,
  auditTrail: unknown[],
): Promise<{ url: string }> {
  let url = await generateImage(request);
  let audit = await auditImage(url, label);
  if (!audit.pass) {
    auditTrail.push({ type: 'image', label, attempt: 1, ...audit });
    url = await generateImage(request);
    audit = await auditImage(url, label);
  }
  auditTrail.push({
    type: 'image',
    label,
    attempt: audit.pass ? 1 : 2,
    ...audit,
  });
  return { url };
}

async function main() {
  loadRootEnv();
  const args = parseArgs();
  const grade = gradeValue(args.grade);
  const outcomes: Array<{ id: string; status: string }> = [];
  for (let index = 1; index <= args.count; index += 1) {
    try {
      const book = await writeBook(grade, args.trailStop, index);
      outcomes.push({ id: book.id, status: book.status });
    } catch (error) {
      console.error(
        `Book ${index} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  console.log(
    `Story Trail summary: ${outcomes.length}/${args.count} books saved`,
  );
  for (const outcome of outcomes)
    console.log(`  ${outcome.id}: ${outcome.status}`);
}

void main().finally(() => prisma.$disconnect());
