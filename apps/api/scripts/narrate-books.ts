/**
 * Pre-records Story Trail narration with ElevenLabs (books are fixed content,
 * and ElevenLabs takes ~15s per page - too slow to generate on first listen).
 *
 *   pnpm tsx scripts/narrate-books.ts <bookId> [...bookIds]
 *     Generates every page, saves uploads/books/<id>/page-N-el.mp3 plus
 *     narration.json (word timings), and points the pages at them.
 *
 *   pnpm tsx scripts/narrate-books.ts --import <bookId> [...bookIds]
 *     No API calls: re-links already-recorded files (e.g. after copying them
 *     to the VPS, or after re-seeding the books).
 */
import 'dotenv/config';
import './register-prisma';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Prisma, PrismaClient } from '../generated/prisma/client';
import { narrateWithElevenLabs } from '../src/atlas/tts/elevenlabs';

const prisma = new PrismaClient();
const uploads = process.env.BOOK_UPLOADS_DIR ?? 'uploads/books';

type Manifest = Record<string, { text: string; wordTimings: unknown }>;

async function main() {
  const args = process.argv.slice(2);
  const importOnly = args[0] === '--import';
  const bookIds = importOnly ? args.slice(1) : args;
  if (bookIds.length === 0) throw new Error('Pass at least one book id');

  for (const bookId of bookIds) {
    const pages = await prisma.bookPage.findMany({
      where: { bookId },
      orderBy: { pageNumber: 'asc' },
    });
    if (pages.length === 0) throw new Error(`No pages for ${bookId}`);
    const dir = join(uploads, bookId);
    mkdirSync(dir, { recursive: true });
    const manifestPath = join(dir, 'narration.json');
    const manifest: Manifest = existsSync(manifestPath)
      ? (JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest)
      : {};

    let characters = 0;
    for (const page of pages) {
      const file = `page-${page.pageNumber}-el.mp3`;
      const recorded = manifest[page.pageNumber];
      // Re-record only when the page text changed since the last recording.
      if (!importOnly && (recorded?.text !== page.text || !existsSync(join(dir, file)))) {
        const narration = await narrateWithElevenLabs(page.text);
        writeFileSync(join(dir, file), narration.audio);
        manifest[page.pageNumber] = { text: page.text, wordTimings: narration.wordTimings };
        writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
        characters += page.text.length;
        console.log(`${bookId} p${page.pageNumber} recorded`);
      }
      const entry = manifest[page.pageNumber];
      if (!entry || entry.text !== page.text || !existsSync(join(dir, file))) {
        console.log(`${bookId} p${page.pageNumber} skipped (no matching recording)`);
        continue;
      }
      await prisma.bookPage.update({
        where: { id: page.id },
        data: {
          audioUrl: `/book-media/${bookId}/${file}`,
          wordTimings: (entry.wordTimings ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        },
      });
    }
    console.log(`${bookId}: ${pages.length} pages linked, ${characters} characters sent to ElevenLabs`);
  }
}

main().finally(() => prisma.$disconnect());
