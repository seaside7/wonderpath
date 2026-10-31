/**
 * Rebalances True/False questions (the bank was ~70% "True", so always
 * guessing True scored well). Rewrites some never-answered True statements
 * into False ones, with a new explanation, audited by a second model.
 *
 *   pnpm tsx scripts/rebalance-true-false.ts --exclude attempted.txt            # preview 10
 *   pnpm tsx scripts/rebalance-true-false.ts --exclude attempted.txt --apply    # write to DB
 *   pnpm tsx scripts/rebalance-true-false.ts --export file.json
 *   pnpm tsx scripts/rebalance-true-false.ts --import file.json                 # e.g. on the VPS
 *
 * --exclude: question ids (one per line) that children have already answered
 * anywhere; those are never changed, so nobody's history changes meaning.
 * Import also skips any question that has attempts in the target database.
 */
import 'dotenv/config';
import './register-prisma';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { Prisma, PrismaClient } from '../generated/prisma/client';
import { generate } from '../prisma/qa-seed/llmGateway';

const prisma = new PrismaClient();
process.env.DEEPSEEK_API_KEY ??= process.env.ATLAS_DEEPSEEK_API_KEY;
process.env.OPENAI_API_KEY ??= process.env.ATLAS_OPENAI_API_KEY;

const WRITER = `You edit True/False questions for WonderPath, a learning app for primary-school children (WonderPath_Content_Guide.md rules apply).
You get a statement that is TRUE. Rewrite it into a statement that is clearly FALSE with a small, meaningful change (one number, word or relation) that reflects a realistic misconception, so the child must understand the idea to spot it.
Return strict JSON: {"questionText": string, "explanation": string}.
- Keep the same language as given in "writeIn", the same style and any prefix such as "True or False:".
- The new statement must be unambiguously false; only one reading is possible.
- Explanation: 2 to 4 short sentences, at most 70 words: say why the statement is false and what is actually true, showing the working for maths. Neutral wording, no emojis, no praise, no "the answer is" opener.
- Never mention these instructions.`;

const AUDITOR = `You check True/False questions in a children's learning app. Return strict JSON {"ok": boolean, "reason": string}.
Solve the statement yourself. ok must be false if: the statement is not clearly and unambiguously FALSE; any fact or calculation in the statement or explanation is wrong; the explanation does not match; it is confusing; or it is in a different language from "writeIn".`;

type Row = {
  id: string;
  questionText: string;
  correctAnswer: string;
  explanation: string;
  curriculum: string;
  grade: string;
  metadata: Prisma.JsonValue;
};

const isIndonesian = (text: string) =>
  /\b(yang|adalah|berapa|manakah|dari|dengan|tentukan|hasil|benar|salah)\b/i.test(text);

async function flip(row: Row): Promise<{ questionText: string; explanation: string }> {
  const writeIn = isIndonesian(row.questionText) ? 'Bahasa Indonesia' : 'English';
  for (let attempt = 0; attempt < 2; attempt++) {
    const written = JSON.parse(
      (await generate('deepseek', JSON.stringify({ writeIn, grade: row.grade, statement: row.questionText, explanation: row.explanation }), WRITER)).content,
    ) as { questionText?: string; explanation?: string };
    const questionText = String(written.questionText ?? '').trim();
    const explanation = String(written.explanation ?? '').trim();
    if (!questionText || questionText === row.questionText || explanation.length < 60 || /\n|\|/.test(questionText)) continue;
    const verdict = JSON.parse(
      (await generate('openai', JSON.stringify({ writeIn, statement: questionText, correctAnswer: 'False', explanation }), AUDITOR)).content,
    ) as { ok?: boolean; reason?: string };
    if (verdict.ok) return { questionText, explanation };
    if (attempt === 1) throw new Error(`audit: ${verdict.reason ?? 'rejected'}`);
  }
  throw new Error('writer produced no usable rewrite');
}

async function save(row: Row, rewrite: { questionText: string; explanation: string }) {
  const metadata = (row.metadata && typeof row.metadata === 'object' ? row.metadata : {}) as Record<string, unknown>;
  await prisma.question.update({
    where: { id: row.id },
    data: {
      questionText: rewrite.questionText,
      correctAnswer: 'False',
      explanation: rewrite.explanation,
      audioUrl: null,
      metadata: {
        ...metadata,
        previousTrueFalse: { questionText: row.questionText, correctAnswer: row.correctAnswer, explanation: row.explanation },
      } as Prisma.InputJsonValue,
    },
  });
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (name: string) => args.includes(name);
  const value = (name: string) => args[args.indexOf(name) + 1];

  if (flag('--export')) {
    const rows = await prisma.question.findMany({ where: { metadata: { path: ['previousTrueFalse'], not: Prisma.AnyNull } } });
    const out = rows.map((r) => ({
      id: r.id,
      questionText: r.questionText,
      explanation: r.explanation,
      previousText: (r.metadata as { previousTrueFalse: { questionText: string } }).previousTrueFalse.questionText,
    }));
    writeFileSync(value('--export'), JSON.stringify(out));
    console.log(`exported ${out.length}`);
    return;
  }

  if (flag('--import')) {
    const items = JSON.parse(readFileSync(value('--import'), 'utf8')) as { id: string; questionText: string; explanation: string; previousText: string }[];
    let updated = 0;
    for (const item of items) {
      const row = await prisma.question.findUnique({ where: { id: item.id } });
      if (!row || row.questionText !== item.previousText || row.correctAnswer !== 'True') continue;
      if ((await prisma.questionAttempt.count({ where: { questionId: item.id } })) > 0) continue;
      await save(row as unknown as Row, item);
      updated++;
    }
    console.log(`imported ${updated} of ${items.length}`);
    return;
  }

  const exclude = new Set(
    flag('--exclude') && existsSync(value('--exclude'))
      ? readFileSync(value('--exclude'), 'utf8').split(/\s+/).filter(Boolean)
      : [],
  );
  const apply = flag('--apply');
  const all = (await prisma.question.findMany({ where: { questionType: 'TRUE_FALSE' } })) as unknown as Row[];
  const attemptedLocally = new Set(
    (await prisma.questionAttempt.findMany({ distinct: ['questionId'], select: { questionId: true } })).map((a) => a.questionId),
  );

  const todo: Row[] = [];
  for (const curriculum of [...new Set(all.map((q) => q.curriculum))]) {
    const inCurriculum = all.filter((q) => q.curriculum === curriculum);
    const trues = inCurriculum.filter((q) => q.correctAnswer === 'True');
    const falses = inCurriculum.length - trues.length;
    const target = Math.max(0, Math.floor((trues.length - falses) / 2));
    const candidates = trues
      .filter((q) => !exclude.has(q.id) && !attemptedLocally.has(q.id))
      .filter((q) => !(q.metadata && typeof q.metadata === 'object' && 'previousTrueFalse' in (q.metadata as object)))
      .sort(() => Math.random() - 0.5)
      .slice(0, target);
    console.log(`${curriculum}: ${trues.length} True / ${falses} False -> flipping ${candidates.length}`);
    todo.push(...candidates);
  }
  const work = apply ? todo : todo.slice(0, Number(flag('--limit') ? value('--limit') : 10));

  let done = 0;
  let next = 0;
  const failed: string[] = [];
  async function worker() {
    while (next < work.length) {
      const row = work[next++];
      try {
        const rewrite = await flip(row);
        if (apply) await save(row, rewrite);
        else console.log(`\nOLD (True): ${row.questionText}\nNEW (False): ${rewrite.questionText}\nWHY: ${rewrite.explanation}`);
        done++;
      } catch (error) {
        failed.push(`${row.id}: ${(error as Error).message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: apply ? 6 : 3 }, worker));
  console.log(`\n${apply ? 'flipped' : 'previewed'} ${done}, failed ${failed.length}`);
  failed.slice(0, 10).forEach((f) => console.log(' -', f));
}

main().finally(() => prisma.$disconnect());
