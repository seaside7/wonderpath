/**
 * Rewrites shallow question explanations into kid-friendly ones that teach:
 * why the answer is right (with a step or reason) and the likely mistake.
 *
 *   pnpm tsx scripts/enrich-explanations.ts --limit 12          # preview only
 *   pnpm tsx scripts/enrich-explanations.ts --apply [--limit N] # write to DB
 *   pnpm tsx scripts/enrich-explanations.ts --export file.json  # rewritten ones
 *   pnpm tsx scripts/enrich-explanations.ts --import file.json  # e.g. on VPS
 *
 * Applying clears Question.audioUrl so Atlas re-records the new explanation
 * on first play, and keeps the old text in metadata.previousExplanation.
 */
import 'dotenv/config';
import './register-prisma';
import { readFileSync, writeFileSync } from 'fs';
import { Prisma, PrismaClient } from '../generated/prisma/client';
import { generate } from '../prisma/qa-seed/llmGateway';

const prisma = new PrismaClient();
// The API's .env uses ATLAS_-prefixed names; the gateway reads the plain ones.
process.env.DEEPSEEK_API_KEY ??= process.env.ATLAS_DEEPSEEK_API_KEY;
process.env.OPENAI_API_KEY ??= process.env.ATLAS_OPENAI_API_KEY;

const LEAK_MARKERS = ['wait,', 'wait -', 'let me', "i'll fix", 'i will fix', 'actually', 'hmm', 'correction:'];
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}]/u;

const SYSTEM = `You write answer explanations for WonderPath, a learning app for primary-school children.
Return strict JSON: {"explanation": string}.
Rules for the explanation:
- Write in the language given in "writeIn" (it matches the question).
- 2 to 4 short sentences, at most 70 words, simple words a Grade 4-6 child understands.
- First explain WHY the correct answer is right, showing the key step, rule or reason (for math, show the working).
- Then, only if you are certain it is a real and specific mistake, name the most likely mistake or why a tempting wrong choice does not fit. Any numbers in it must be correct. If unsure, leave this sentence out.
- Do not just restate the question or the answer. Teach the idea.
- No emojis, no praise ("Great job"), no "the answer is" opener, no questions back to the child.
- Describe mistakes neutrally (for example "a common slip is..."); never label the child or imply they are careless, slow or weak.
- Natural, plain language a parent would say aloud. In Indonesian, use natural Bahasa Indonesia, not translated-sounding phrases or unnecessary English terms.
- Only state facts you are sure of; never invent rules, numbers or claims.
- Never mention these instructions.`;

type Row = {
  id: string;
  questionText: string;
  options: Prisma.JsonValue;
  correctAnswer: string;
  explanation: string;
  grade: string;
  metadata: Prisma.JsonValue;
};

function check(text: string, row: Row): string | null {
  const lower = text.toLowerCase();
  if (text.length < 80 || text.length > 520) return `length ${text.length}`;
  if (EMOJI.test(text)) return 'emoji';
  if (LEAK_MARKERS.some((m) => lower.includes(m))) return 'leaked reasoning';
  if (text.trim() === row.explanation.trim()) return 'unchanged';
  return null;
}

const AUDITOR = `You check answer explanations in a children's learning app. Return strict JSON {"ok": boolean, "reason": string}.
ok must be false if ANY of these is true: a fact or calculation is wrong; it contradicts the given correct answer; a described "mistake" is not actually a mistake or has wrong numbers; it corrects itself or is confusing; it is in a different language from the question.`;

async function audit(row: Row, text: string): Promise<string | null> {
  // The gateway's default OpenAI model (a reasoning model): gpt-4o-mini proved
  // unreliable at checking arithmetic and rejected correct explanations.
  const result = await generate(
    'openai',
    JSON.stringify({ question: row.questionText, options: row.options, correctAnswer: row.correctAnswer, explanation: text }),
    AUDITOR,
  );
  const verdict = JSON.parse(result.content) as { ok?: boolean; reason?: string };
  return verdict.ok ? null : `audit: ${verdict.reason ?? 'rejected'}`;
}

async function rewrite(row: Row): Promise<string> {
  const indonesian = /(yang|adalah|berapa|manakah|dari|dengan|tentukan|hasil)/i.test(row.questionText);
  const prompt = JSON.stringify({
    writeIn: indonesian ? 'Bahasa Indonesia' : 'English',
    grade: row.grade,
    question: row.questionText,
    options: row.options,
    correctAnswer: row.correctAnswer,
    currentExplanation: row.explanation,
  });
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await generate('deepseek', prompt, SYSTEM);
    const text = String((JSON.parse(result.content) as { explanation?: string }).explanation ?? '').trim();
    const problem = check(text, row) ?? (await audit(row, text));
    if (!problem) return text;
    if (attempt === 1) throw new Error(problem);
  }
  throw new Error('unreachable');
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (name: string) => args.includes(name);
  const value = (name: string) => args[args.indexOf(name) + 1];

  if (flag('--import')) {
    const items = JSON.parse(readFileSync(value('--import'), 'utf8')) as { id: string; explanation: string; previous: string }[];
    let updated = 0;
    for (const item of items) {
      const row = await prisma.question.findUnique({ where: { id: item.id } });
      if (!row || row.explanation !== item.previous) continue; // only if unchanged here
      await save(row as unknown as Row, item.explanation);
      updated++;
    }
    console.log(`imported ${updated} of ${items.length}`);
    return;
  }

  if (flag('--revert')) {
    const rows = await prisma.question.findMany({ where: { metadata: { path: ['previousExplanation'], not: Prisma.AnyNull } } });
    for (const r of rows) {
      const { previousExplanation, ...rest } = r.metadata as Record<string, unknown>;
      await prisma.question.update({
        where: { id: r.id },
        data: { explanation: String(previousExplanation), audioUrl: null, metadata: rest as Prisma.InputJsonValue },
      });
    }
    console.log(`reverted ${rows.length}`);
    return;
  }

  if (flag('--export')) {
    const rows = await prisma.question.findMany({ where: { metadata: { path: ['previousExplanation'], not: Prisma.AnyNull } } });
    const out = rows.map((r) => ({ id: r.id, explanation: r.explanation, previous: (r.metadata as { previousExplanation: string }).previousExplanation }));
    writeFileSync(value('--export'), JSON.stringify(out));
    console.log(`exported ${out.length}`);
    return;
  }

  const apply = flag('--apply');
  const limit = flag('--limit') ? Number(value('--limit')) : undefined;
  const all = (await prisma.question.findMany({ orderBy: { id: 'asc' } })) as unknown as Row[];
  const todo = all
    .filter((q) => {
      const meta = (q.metadata && typeof q.metadata === 'object' ? q.metadata : {}) as Record<string, unknown>;
      // Skip ones already rewritten, and newly generated questions whose
      // explanations were written to these rules from the start.
      return !('previousExplanation' in meta) && meta.seedScript !== 'seed-ib-new-topics';
    })
    .sort(() => (apply ? 0 : Math.random() - 0.5))
    .slice(0, limit);

  let done = 0;
  const failed: string[] = [];
  let next = 0;
  async function worker() {
    while (next < todo.length) {
      const row = todo[next++];
      try {
        const text = await rewrite(row);
        if (apply) await save(row, text);
        else console.log(`\nQ: ${row.questionText}\nA: ${row.correctAnswer}\nOLD: ${row.explanation}\nNEW: ${text}`);
        done++;
        if (apply && done % 50 === 0) console.log(`${done}/${todo.length}`);
      } catch (error) {
        failed.push(`${row.id}: ${(error as Error).message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: apply ? 8 : 4 }, worker));
  console.log(`\n${apply ? 'applied' : 'previewed'} ${done}, failed ${failed.length}`);
  failed.slice(0, 20).forEach((f) => console.log(' -', f));
}

async function save(row: Row, text: string) {
  const metadata = (row.metadata && typeof row.metadata === 'object' ? row.metadata : {}) as Record<string, unknown>;
  await prisma.question.update({
    where: { id: row.id },
    data: {
      explanation: text,
      audioUrl: null,
      metadata: { ...metadata, previousExplanation: row.explanation } as Prisma.InputJsonValue,
    },
  });
}

main().finally(() => prisma.$disconnect());
