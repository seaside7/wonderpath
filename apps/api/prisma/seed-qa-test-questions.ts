/**
 * QA/test-only seed script. Targets QA_DATABASE_URL (wonderpath_qa) — NEVER
 * the app's own DATABASE_URL. Reads OPENAI_API_KEY/DEEPSEEK_API_KEY and
 * QA_* config from the repo-root .env, not apps/api/.env.
 *
 * Usage: npx ts-node --transpile-only prisma/seed-qa-test-questions.ts [--max-subtopics=N] [--start-at=N]
 */
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '../generated/prisma/client';
import { Curriculum, Grade as PrismaGrade, QuestionType as PrismaQuestionType, Subject } from '../generated/prisma/enums';
import {
  DIFFICULTIES,
  GRADES,
  QA_PASS_SAMPLE_RATE,
  QUESTIONS_PER_DIFFICULTY,
  SUBJECT_STRUCTURE,
  SubtopicDef,
  providerFor,
} from './qa-seed/config';
import { generateQuestionBatch, qaCheckQuestion, GeneratedQuestion } from './qa-seed/generate';
import { Provider } from './qa-seed/llmGateway';

function findRepoRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 10; i += 1) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`Could not find repo root (pnpm-workspace.yaml) walking up from ${startDir}`);
}

function loadRootEnv(): void {
  const rootEnvPath = path.join(findRepoRoot(__dirname), '.env');
  const raw = fs.readFileSync(rootEnvPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#') || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^"|"$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

loadRootEnv();

const QA_DATABASE_URL = process.env.QA_DATABASE_URL;
if (!QA_DATABASE_URL) {
  throw new Error('QA_DATABASE_URL is required (check repo-root .env) - refusing to guess a database.');
}
if (!QA_DATABASE_URL.includes('wonderpath_qa')) {
  throw new Error(
    `QA_DATABASE_URL does not look like the QA test database ("wonderpath_qa" not found in: ${QA_DATABASE_URL}). Refusing to run against a database that isn't clearly the QA test DB.`,
  );
}

const prisma = new PrismaClient({ datasourceUrl: QA_DATABASE_URL });

interface Args {
  maxSubtopics: number;
  startAt: number;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const maxSubtopics = Number(args.find((a) => a.startsWith('--max-subtopics='))?.split('=')[1] ?? '27');
  const startAt = Number(args.find((a) => a.startsWith('--start-at='))?.split('=')[1] ?? '0');
  return { maxSubtopics, startAt };
}

interface FlatSubtopic {
  subject: 'Mathematics' | 'English';
  def: SubtopicDef;
}

function flattenSubtopics(): FlatSubtopic[] {
  const out: FlatSubtopic[] = [];
  for (const subject of Object.keys(SUBJECT_STRUCTURE) as Array<'Mathematics' | 'English'>) {
    for (const def of SUBJECT_STRUCTURE[subject]) {
      out.push({ subject, def });
    }
  }
  return out;
}

async function ensureHierarchy(subject: 'Mathematics' | 'English', def: SubtopicDef) {
  const subjectCode = subject === 'Mathematics' ? Subject.MATHEMATICS : Subject.ENGLISH;

  const subjectArea = await prisma.subjectArea.upsert({
    where: { code: subjectCode },
    create: { code: subjectCode, name: subject },
    update: {},
  });

  const topic = await prisma.topic.upsert({
    where: { subjectAreaId_name: { subjectAreaId: subjectArea.id, name: def.topic } },
    create: { name: def.topic, subjectAreaId: subjectArea.id },
    update: {},
  });

  const subtopic = await prisma.subtopic.upsert({
    where: { topicId_name: { topicId: topic.id, name: def.subtopic } },
    create: { name: def.subtopic, topicId: topic.id },
    update: {},
  });

  const learningObjective = await prisma.learningObjective.upsert({
    where: { subtopicId_name: { subtopicId: subtopic.id, name: def.learningObjective } },
    create: {
      name: def.learningObjective,
      description: def.description,
      estimatedMasteryTime: def.estimatedMasteryTime,
      subtopicId: subtopic.id,
    },
    update: {},
  });

  return { subjectArea, topic, subtopic, learningObjective };
}

function difficultyGroups(topic: string): number[][] {
  const alwaysOpenAi = ['Reading Comprehension', 'Writing'].includes(topic);
  if (alwaysOpenAi) return [[1, 2, 3, 4, 5]];
  return [[1, 2, 3], [4, 5]];
}

interface RunStats {
  totalQuestions: number;
  byProvider: Record<Provider, number>;
  byGradeSubject: Record<string, number>;
  totalTokens: number;
  qaChecked: number;
  qaFailed: Array<{ subtopic: string; grade: string; issue: string; questionText: string }>;
  samples: Partial<Record<Provider, GeneratedQuestion & { subtopic: string; grade: string }>>;
  completedSubtopics: string[];
}

async function insertQuestions(
  learningObjectiveId: string,
  grade: 'Grade 5' | 'Grade 6',
  questions: GeneratedQuestion[],
  provider: Provider,
  model: string,
) {
  for (const q of questions) {
    await prisma.question.create({
      data: {
        questionText: q.questionText,
        questionType: q.questionType === 'Multiple Choice' ? PrismaQuestionType.MULTIPLE_CHOICE : PrismaQuestionType.TRUE_FALSE,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        curriculum: Curriculum.IB,
        grade: grade === 'Grade 5' ? PrismaGrade.GRADE_5 : PrismaGrade.GRADE_6,
        difficulty: q.difficulty,
        learningObjectiveId,
        metadata: {
          isSeedData: true,
          seedProvider: provider,
          seedModel: model,
          seedBatch: new Date().toISOString().slice(0, 10),
        },
      },
    });
  }
}

async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.warn(`  retry ${i}/${attempts} for ${label}: ${(err as Error).message}`);
    }
  }
  throw new Error(`${label} failed after ${attempts} attempts: ${(lastError as Error)?.message}`);
}

async function main() {
  const { maxSubtopics, startAt } = parseArgs();
  const flat = flattenSubtopics();
  const slice = flat.slice(startAt, startAt + maxSubtopics);

  console.log(`QA seed run: subtopics ${startAt + 1}-${startAt + slice.length} of ${flat.length}`);
  console.log(`Target DB: ${QA_DATABASE_URL}`);

  const stats: RunStats = {
    totalQuestions: 0,
    byProvider: { openai: 0, deepseek: 0 },
    byGradeSubject: {},
    totalTokens: 0,
    qaChecked: 0,
    qaFailed: [],
    samples: {},
    completedSubtopics: [],
  };

  let subtopicCount = 0;

  for (const { subject, def } of slice) {
    const { learningObjective } = await ensureHierarchy(subject, def);

    for (const grade of GRADES) {
      const groups = difficultyGroups(def.topic);

      for (const difficulties of groups) {
        // All difficulties in a group route to the same provider by construction
        const provider = providerFor(def.topic, difficulties[0]);

        const outcome = await withRetry(
          () => generateQuestionBatch(def, grade, difficulties, provider),
          `${def.subtopic} (${grade}, ${provider}, diff ${difficulties.join(',')})`,
        );
        await insertQuestions(learningObjective.id, grade, outcome.questions, outcome.provider, outcome.model);

        stats.totalQuestions += outcome.questions.length;
        stats.byProvider[outcome.provider] += outcome.questions.length;
        stats.totalTokens += outcome.usage.totalTokens;
        const key = `${subject} ${grade}`;
        stats.byGradeSubject[key] = (stats.byGradeSubject[key] ?? 0) + outcome.questions.length;

        if (!stats.samples[outcome.provider]) {
          stats.samples[outcome.provider] = { ...outcome.questions[0], subtopic: def.subtopic, grade };
        }

        // QA-pass the cheap batch only
        if (outcome.provider === 'deepseek') {
          const sampleSize = Math.max(1, Math.round(outcome.questions.length * QA_PASS_SAMPLE_RATE));
          const shuffled = [...outcome.questions].sort(() => Math.random() - 0.5);
          for (const q of shuffled.slice(0, sampleSize)) {
            const check = await qaCheckQuestion(q, def.subtopic, grade);
            stats.qaChecked += 1;
            if (!check.ok) {
              stats.qaFailed.push({
                subtopic: def.subtopic,
                grade,
                issue: check.issue ?? 'unspecified',
                questionText: q.questionText,
              });
            }
          }
        }
      }
    }

    stats.completedSubtopics.push(`${subject} / ${def.topic} / ${def.subtopic}`);
    subtopicCount += 1;
    console.log(`  done: ${subject} / ${def.topic} / ${def.subtopic} (${subtopicCount}/${slice.length})`);
  }

  console.log('\n=== Batch complete ===');
  console.log(JSON.stringify(stats, null, 2));

  const reportPath = path.resolve(__dirname, 'qa-seed', `run-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(stats, null, 2));
  console.log(`\nReport written to ${reportPath}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
