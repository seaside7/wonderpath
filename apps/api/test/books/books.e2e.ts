import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TtsService } from '../../src/atlas/tts/tts.service';
import { createTestApp } from '../helpers/create-test-app';
import {
  createScenarioTracker,
  printTestReport,
  TestResult,
} from '../helpers/test-report';

const TEST_EMAIL_DOMAIN = 'wonderpath.test';
const TEST_PASSWORD = 'password123';

interface AuthResponse {
  accessToken: string;
}

interface ChildResponse {
  id: string;
}

const testResults: TestResult[] = [];
const trackScenario = createScenarioTracker(testResults);

function createTestEmail(prefix: string): string {
  return `${prefix}-${randomUUID()}@${TEST_EMAIL_DOMAIN}`;
}

describe('Story Trail books (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let narrate: jest.SpyInstance;
  let parentOneToken: string;
  let parentTwoToken: string;
  let parentOneEmail: string;
  let parentTwoEmail: string;
  let adminEmail: string;
  let childId: string;
  let bookId: string;
  let reviewBookId: string;
  let quizQuestionIds: string[];
  let uploadsDir: string;
  let previousUploadsDir: string | undefined;

  beforeAll(async () => {
    uploadsDir = join('uploads', `test-books-${randomUUID()}`);
    previousUploadsDir = process.env.BOOK_UPLOADS_DIR;
    process.env.BOOK_UPLOADS_DIR = uploadsDir;

    narrate = jest
      .spyOn(TtsService.prototype, 'synthesizeWithWordTimings')
      .mockResolvedValue(null);

    app = await createTestApp();
    prisma = app.get(PrismaService);

    adminEmail = createTestEmail('e2e-books-admin');
    await prisma.admin.create({
      data: {
        email: adminEmail,
        password: await argon2.hash('admin-password123'),
      },
    });

    parentOneEmail = createTestEmail('e2e-books-parent-one');
    parentTwoEmail = createTestEmail('e2e-books-parent-two');
    for (const [email, target] of [
      [parentOneEmail, 'one'],
      [parentTwoEmail, 'two'],
    ] as const) {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: TEST_PASSWORD })
        .expect(201);
      if (target === 'one')
        parentOneToken = (response.body as AuthResponse).accessToken;
      else parentTwoToken = (response.body as AuthResponse).accessToken;
    }

    const child = await request(app.getHttpServer())
      .post('/children')
      .set('Authorization', `Bearer ${parentOneToken}`)
      .send({
        fullName: 'Book Reader',
        nickname: 'Reader',
        dateOfBirth: '2015-03-15',
        gender: 'Girl',
        grade: 'Grade 5',
        curricula: ['IB'],
        preferredLanguage: 'English',
        schoolName: 'WonderPath Elementary',
      })
      .expect(201);
    childId = (child.body as ChildResponse).id;

    const book = await prisma.book.create({
      data: {
        title: `The Quiet River ${randomUUID()}`,
        summary: 'A gentle science adventure.',
        grade: 'GRADE_5',
        trailStop: 1,
        status: 'PUBLISHED',
        wordCount: 700,
        readabilityGrade: 5.0,
        pages: {
          create: [
            { pageNumber: 1, text: 'A river moved slowly past the village.' },
            {
              pageNumber: 2,
              text: 'Mira watched the water carry leaves away.',
            },
          ],
        },
        characters: {
          create: [
            {
              name: 'Mira',
              description: 'A curious girl with a yellow raincoat.',
              referenceImageUrl: '/book-media/placeholder/mira.jpg',
            },
          ],
        },
        quizQuestions: {
          create: [
            {
              order: 1,
              prompt: 'Where did the river flow?',
              options: ['Past the village', 'Up the mountain'],
              correctAnswer: 'Past the village',
              explanation:
                'The first page says the river moved past the village.',
            },
            {
              order: 2,
              prompt: 'What did the water carry?',
              options: ['Leaves', 'Stones'],
              correctAnswer: 'Leaves',
              explanation: 'Mira watched the water carry leaves away.',
            },
          ],
        },
      },
      include: { quizQuestions: { orderBy: { order: 'asc' } } },
    });
    bookId = book.id;
    quizQuestionIds = book.quizQuestions.map((question) => question.id);

    const reviewBook = await prisma.book.create({
      data: {
        title: `Unreviewed Draft ${randomUUID()}`,
        summary: 'Not yet approved.',
        grade: 'GRADE_5',
        trailStop: 2,
        status: 'IN_REVIEW',
        wordCount: 650,
        readabilityGrade: 5.0,
        pages: { create: [{ pageNumber: 1, text: 'A draft page.' }] },
      },
    });
    reviewBookId = reviewBook.id;
  }, 60000);

  afterAll(async () => {
    await prisma.admin.deleteMany({ where: { email: adminEmail } });
    await prisma.parent.deleteMany({
      where: { email: { in: [parentOneEmail, parentTwoEmail] } },
    });
    await prisma.book.deleteMany({
      where: { id: { in: [bookId, reviewBookId] } },
    });
    await rm(uploadsDir, { recursive: true, force: true });
    if (previousUploadsDir === undefined) delete process.env.BOOK_UPLOADS_DIR;
    else process.env.BOOK_UPLOADS_DIR = previousUploadsDir;
    await app.close();
    printTestReport('Sprint 23 Test Report', testResults);
  });

  it(
    'Lists published books with reading progress',
    trackScenario('Book listing', async () => {
      const response = await request(app.getHttpServer())
        .get(`/children/${childId}/books`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);
      const books = response.body as Array<{
        id: string;
        title: string;
        reading: unknown;
      }>;
      expect(books.map((book) => book.id)).toContain(bookId);
      expect(books.map((book) => book.id)).not.toContain(reviewBookId);
      expect(books.find((book) => book.id === bookId)?.reading).toBeNull();
    }),
  );

  it(
    'Book detail never exposes quiz answers',
    trackScenario('Quiz answer hiding', async () => {
      const response = await request(app.getHttpServer())
        .get(`/children/${childId}/books/${bookId}`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);
      const body = response.body as {
        pages: unknown[];
        characters: unknown[];
        quizQuestions: Record<string, unknown>[];
      };
      expect(body.pages).toHaveLength(2);
      expect(body.characters).toHaveLength(1);
      expect(body.quizQuestions).toHaveLength(2);
      for (const question of body.quizQuestions) {
        expect(question).not.toHaveProperty('correctAnswer');
        expect(question).not.toHaveProperty('explanation');
      }
    }),
  );

  it(
    'In-review books stay invisible unless preview is enabled',
    trackScenario('Preview gating', async () => {
      await request(app.getHttpServer())
        .get(`/children/${childId}/books/${reviewBookId}`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(404);

      process.env.BOOKS_ALLOW_PREVIEW = 'true';
      try {
        const list = await request(app.getHttpServer())
          .get(`/children/${childId}/books`)
          .set('Authorization', `Bearer ${parentOneToken}`)
          .expect(200);
        const preview = (
          list.body as Array<{ id: string; preview: boolean }>
        ).find((book) => book.id === reviewBookId);
        expect(preview?.preview).toBe(true);

        const detail = await request(app.getHttpServer())
          .get(`/children/${childId}/books/${reviewBookId}`)
          .set('Authorization', `Bearer ${parentOneToken}`)
          .expect(200);
        expect((detail.body as { preview: boolean }).preview).toBe(true);
      } finally {
        delete process.env.BOOKS_ALLOW_PREVIEW;
      }
    }),
  );

  it(
    'Narration generates once, saves a file, and reuses it',
    trackScenario('Narration caching', async () => {
      narrate.mockReset().mockResolvedValue({
        audio: Buffer.from('fake-mp3-bytes'),
        wordTimings: [{ word: 'A', startSec: 0 }],
      });

      const first = await request(app.getHttpServer())
        .get(`/books/${bookId}/pages/1/narration`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);
      expect(first.body.audioUrl).toBe(`/book-media/${bookId}/page-1.mp3`);
      expect(narrate).toHaveBeenCalledTimes(1);
      const stored = await stat(join(uploadsDir, bookId, 'page-1.mp3'));
      expect(stored.size).toBeGreaterThan(0);

      const second = await request(app.getHttpServer())
        .get(`/books/${bookId}/pages/1/narration`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);
      expect(second.body.audioUrl).toBe(first.body.audioUrl);
      expect(narrate).toHaveBeenCalledTimes(1);
    }),
  );

  it(
    'Concurrent first narrations share one synthesis',
    trackScenario('Narration concurrency', async () => {
      await prisma.bookPage.update({
        where: { bookId_pageNumber: { bookId, pageNumber: 2 } },
        data: { audioUrl: null, wordTimings: null },
      });
      narrate.mockReset().mockResolvedValue({
        audio: Buffer.from('fake-mp3-bytes-page-2'),
        wordTimings: [{ word: 'Mira', startSec: 0 }],
      });

      const [first, second] = await Promise.all([
        request(app.getHttpServer())
          .get(`/books/${bookId}/pages/2/narration`)
          .set('Authorization', `Bearer ${parentOneToken}`),
        request(app.getHttpServer())
          .get(`/books/${bookId}/pages/2/narration`)
          .set('Authorization', `Bearer ${parentOneToken}`),
      ]);
      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(first.body.audioUrl).toBe(`/book-media/${bookId}/page-2.mp3`);
      expect(second.body.audioUrl).toBe(first.body.audioUrl);
      expect(narrate).toHaveBeenCalledTimes(1);
    }),
  );

  it(
    'Mock TTS returns null narration without failing',
    trackScenario('Narration mock mode', async () => {
      await prisma.bookPage.update({
        where: { bookId_pageNumber: { bookId, pageNumber: 2 } },
        data: { audioUrl: null, wordTimings: null },
      });
      narrate.mockReset().mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get(`/books/${bookId}/pages/2/narration`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);
      expect(response.body).toEqual({ audioUrl: null, wordTimings: null });
    }),
  );

  it(
    'Progress upserts reading state and validates page range',
    trackScenario('Reading progress', async () => {
      const started = await request(app.getHttpServer())
        .put(`/children/${childId}/books/${bookId}/progress`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({ mode: 'LISTEN', lastPage: 1 })
        .expect(200);
      expect(started.body).toMatchObject({ lastPage: 1, mode: 'LISTEN' });

      const finished = await request(app.getHttpServer())
        .put(`/children/${childId}/books/${bookId}/progress`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({ mode: 'READ', lastPage: 2, completed: true })
        .expect(200);
      expect(finished.body.completedAt).not.toBeNull();

      await request(app.getHttpServer())
        .put(`/children/${childId}/books/${bookId}/progress`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({ mode: 'READ', lastPage: 99 })
        .expect(400);
    }),
  );

  it(
    'Quiz scores answers, stores attempts, and rejects malformed input',
    trackScenario('Book quiz', async () => {
      const response = await request(app.getHttpServer())
        .post(`/children/${childId}/books/${bookId}/quiz`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({
          answers: [
            {
              questionId: quizQuestionIds[0],
              selectedAnswer: 'Past the village',
            },
            { questionId: quizQuestionIds[1], selectedAnswer: 'Stones' },
          ],
        })
        .expect(201);
      expect(response.body.score).toBe(1);
      expect(response.body.total).toBe(2);
      expect(response.body.results[0]).toMatchObject({
        correct: true,
        correctAnswer: 'Past the village',
      });
      expect(response.body.results[1].correct).toBe(false);

      const attempts = await prisma.bookQuizAttempt.count({
        where: { childId },
      });
      expect(attempts).toBe(2);
      const reading = await prisma.bookReading.findUnique({
        where: { childId_bookId: { childId, bookId } },
      });
      expect(reading?.quizScore).toBe(1);

      await request(app.getHttpServer())
        .post(`/children/${childId}/books/${bookId}/quiz`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({
          answers: [{ questionId: quizQuestionIds[0], selectedAnswer: 'X' }],
        })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/children/${childId}/books/${bookId}/quiz`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({
          answers: [
            { questionId: quizQuestionIds[0], selectedAnswer: 'X' },
            { questionId: quizQuestionIds[0], selectedAnswer: 'Y' },
          ],
        })
        .expect(400);
    }),
  );

  it(
    'Another parent gets 404 on every child-scoped book route',
    trackScenario('Book ownership', async () => {
      await request(app.getHttpServer())
        .get(`/children/${childId}/books`)
        .set('Authorization', `Bearer ${parentTwoToken}`)
        .expect(404);
      await request(app.getHttpServer())
        .get(`/children/${childId}/books/${bookId}`)
        .set('Authorization', `Bearer ${parentTwoToken}`)
        .expect(404);
      await request(app.getHttpServer())
        .put(`/children/${childId}/books/${bookId}/progress`)
        .set('Authorization', `Bearer ${parentTwoToken}`)
        .send({ mode: 'READ', lastPage: 1 })
        .expect(404);
      await request(app.getHttpServer())
        .post(`/children/${childId}/books/${bookId}/quiz`)
        .set('Authorization', `Bearer ${parentTwoToken}`)
        .send({
          answers: [{ questionId: quizQuestionIds[0], selectedAnswer: 'X' }],
        })
        .expect(404);
    }),
  );
});
