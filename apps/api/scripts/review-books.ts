import 'dotenv/config';
import './register-prisma';
import { PrismaClient, BookStatus } from '../generated/prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [command, bookId] = process.argv.slice(2);
  if (command === '--list') {
    const books = await prisma.book.findMany({
      where: { status: BookStatus.IN_REVIEW },
      orderBy: { createdAt: 'asc' },
    });
    for (const book of books) {
      const audit = Array.isArray(book.auditResult) ? book.auditResult : [];
      const meta =
        book.generationMeta && typeof book.generationMeta === 'object'
          ? (book.generationMeta as { estimatedCostUsd?: number })
          : {};
      console.log(
        `${book.id}\t${book.title}\tflags=${audit.length}\tcost=$${meta.estimatedCostUsd ?? 0}`,
      );
    }
    return;
  }
  if (!bookId || !['--approve', '--reject'].includes(command)) {
    throw new Error(
      'Usage: pnpm tsx scripts/review-books.ts --list | --approve <bookId> | --reject <bookId>',
    );
  }
  if (command === '--approve') {
    const existing = await prisma.book.findUnique({ where: { id: bookId } });
    if (!existing) throw new Error(`Book not found: ${bookId}`);
    if (existing.status === BookStatus.REJECTED) {
      throw new Error(
        `Refusing to approve ${bookId}: it is REJECTED (failed audit or image generation). Regenerate it instead.`,
      );
    }
  }
  const updated = await prisma.book.update({
    where: { id: bookId },
    data:
      command === '--approve'
        ? { status: BookStatus.PUBLISHED, publishedAt: new Date() }
        : { status: BookStatus.REJECTED, publishedAt: null },
  });
  console.log(`${updated.id}: ${updated.status}`);
}

void main().finally(() => prisma.$disconnect());
