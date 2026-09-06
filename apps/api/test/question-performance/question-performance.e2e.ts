import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { Subject as PrismaSubject } from '../../generated/prisma/client';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createTestApp } from '../helpers/create-test-app';
import {
  createScenarioTracker,
  printTestReport,
  TestResult,
} from '../helpers/test-report';

const TEST_EMAIL_DOMAIN = 'wonderpath.test';
const TEST_PASSWORD = 'password123';
const ADMIN_PASSWORD = 'admin-password123';

interface AuthResponse {
  accessToken: string;
}

interface ChildResponse {
  id: string;
}

interface LearningSessionResponse {
  id: string;
}

interface PerformanceRecord {
  questionId: string;
  timesServed: number;
  correctCount: number;
  wrongCount: number;
  correctRate: number;
  avgResponseTimeMs: number;
  hintUsageCount: number;
  status: string;
}

interface InventoryEntry {
  learningObjectiveId: string;
  name: string;
  subject: string;
  available: number;
  total: number;
  needsReplenishment: boolean;
  shortfall: number;
}

interface InventoryResponse {
  threshold: number;
  entries: InventoryEntry[];
}

interface ReplenishResponse {
  generatedCount: number;
  replenished: Array<{
    learningObjectiveId: string;
    generated: number;
    available: number;
    source: string;
  }>;
}

const testResults: TestResult[] = [];
const trackScenario = createScenarioTracker(testResults);

function createTestEmail(prefix: string): string {
  return `${prefix}-${randomUUID()}@${TEST_EMAIL_DOMAIN}`;
}

function createChildPayload(overrides: Record<string, unknown> = {}) {
  return {
    fullName: 'Mia Chen',
    nickname: 'Mi',
    dateOfBirth: '2015-11-02',
    gender: 'Girl',
    grade: 'Grade 5',
    curricula: ['IB', 'Nasional'],
    preferredLanguage: 'English',
    schoolName: 'WonderPath Elementary',
    ...overrides,
  };
}

function createQuestionPayload(
  learningObjectiveId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    questionText: 'What is 6 + 1?',
    questionType: 'Multiple Choice',
    options: ['6', '7', '8', '9', '10', '11'],
    correctAnswer: '7',
    explanation: 'Six plus one equals seven.',
    learningObjectiveId,
    curriculum: 'IB',
    grade: 'Grade 5',
    difficulty: 2,
    ...overrides,
  };
}

async function registerParent(app: INestApplication<App>, email: string) {
  const response = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, password: TEST_PASSWORD })
    .expect(201);

  return (response.body as AuthResponse).accessToken;
}

async function loginAdmin(app: INestApplication<App>, email: string) {
  const response = await request(app.getHttpServer())
    .post('/admin/auth/login')
    .send({ email, password: ADMIN_PASSWORD })
    .expect(200);

  return (response.body as AuthResponse).accessToken;
}

async function createChild(app: INestApplication<App>, token: string) {
  const response = await request(app.getHttpServer())
    .post('/children')
    .set('Authorization', `Bearer ${token}`)
    .send(createChildPayload())
    .expect(201);

  return response.body as ChildResponse;
}

async function startSession(
  app: INestApplication<App>,
  token: string,
  childId: string,
): Promise<LearningSessionResponse> {
  const response = await request(app.getHttpServer())
    .post('/learning-sessions')
    .set('Authorization', `Bearer ${token}`)
    .send({ childId, curriculum: 'IB', subject: 'Mathematics' })
    .expect(201);

  return response.body as LearningSessionResponse;
}

async function recordAttempt(
  app: INestApplication<App>,
  token: string,
  learningSessionId: string,
  questionId: string,
  correctAnswer: string,
  overrides: Record<string, unknown> = {},
): Promise<void> {
  await request(app.getHttpServer())
    .post('/attempts')
    .set('Authorization', `Bearer ${token}`)
    .send({
      learningSessionId,
      questionId,
      selectedAnswer: correctAnswer,
      timeSpent: 10,
      hintUsed: false,
      perceivedDifficulty: 'Just Right',
      ...overrides,
    })
    .expect(201);
}

describe('Living Question Bank (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let parentToken: string;
  let childId: string;
  let sessionId: string;
  let learningObjectiveId: string;
  let topicId: string;
  let goodQuestionId: string;
  let retiredQuestionId: string;
  let lowPerformanceQuestionId: string;
  let adminToken: string;
  let adminEmail: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    adminEmail = createTestEmail('e2e-qb-admin');
    await prisma.admin.create({
      data: {
        email: adminEmail,
        password: await argon2.hash(ADMIN_PASSWORD),
      },
    });

    adminToken = await loginAdmin(app, adminEmail);
    parentToken = await registerParent(app, createTestEmail('e2e-qb-parent'));

    const child = await createChild(app, parentToken);
    childId = child.id;

    let subjectArea = await prisma.subjectArea.findUnique({
      where: { code: PrismaSubject.MATHEMATICS },
    });

    if (!subjectArea) {
      subjectArea = await prisma.subjectArea.create({
        data: {
          code: PrismaSubject.MATHEMATICS,
          name: 'Mathematics',
        },
      });
    }

    const topic = await prisma.topic.create({
      data: {
        name: `E2E Inventory ${randomUUID()}`,
        subjectAreaId: subjectArea.id,
        subtopics: {
          create: {
            name: `E2E Inventory Subtopic ${randomUUID()}`,
            learningObjectives: {
              create: {
                name: 'Add numbers up to 100',
                description: 'Add whole numbers up to 100',
                estimatedMasteryTime: 30,
              },
            },
          },
        },
      },
      include: {
        subtopics: {
          include: {
            learningObjectives: true,
          },
        },
      },
    });

    topicId = topic.id;
    learningObjectiveId = topic.subtopics[0].learningObjectives[0].id;

    const session = await startSession(app, parentToken, childId);
    sessionId = session.id;

    async function createQuestion(
      text: string,
      answer: string,
    ): Promise<string> {
      const response = await request(app.getHttpServer())
        .post('/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(
          createQuestionPayload(learningObjectiveId, {
            questionText: text,
            correctAnswer: answer,
          }),
        )
        .expect(201);

      return (response.body as { id: string }).id;
    }

    goodQuestionId = await createQuestion('What is 6 + 1?', '7');
    retiredQuestionId = await createQuestion('What is 9 + 2?', '11');
    lowPerformanceQuestionId = await createQuestion('What is 4 + 3?', '7');
  });

  afterAll(async () => {
    await prisma.admin.deleteMany({
      where: { email: { endsWith: `@${TEST_EMAIL_DOMAIN}` } },
    });

    await prisma.parent.deleteMany({
      where: { email: { endsWith: `@${TEST_EMAIL_DOMAIN}` } },
    });

    if (topicId) {
      await prisma.topic.delete({ where: { id: topicId } });
    }

    await app.close();
    printTestReport('Sprint 10 Test Report', testResults);
  });

  it(
    'Question performance is tracked from attempts',
    trackScenario('Question performance tracked', async () => {
      await recordAttempt(app, parentToken, sessionId, goodQuestionId, '7', {
        timeSpent: 8,
      });
      await recordAttempt(app, parentToken, sessionId, goodQuestionId, '7', {
        timeSpent: 12,
      });
      await recordAttempt(app, parentToken, sessionId, goodQuestionId, '7', {
        timeSpent: 10,
        hintUsed: true,
      });
      await recordAttempt(app, parentToken, sessionId, goodQuestionId, '8', {
        timeSpent: 30,
      });
      await recordAttempt(app, parentToken, sessionId, goodQuestionId, '8', {
        timeSpent: 90,
      });

      const response = await request(app.getHttpServer())
        .get('/admin/question-performance')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = response.body as PerformanceRecord[];
      const record = body.find((entry) => entry.questionId === goodQuestionId);

      expect(record).toEqual(
        expect.objectContaining({
          timesServed: 5,
          correctCount: 3,
          wrongCount: 2,
          correctRate: 60,
          avgResponseTimeMs: 30,
          hintUsageCount: 1,
          status: 'ACTIVE',
        }),
      );
    }),
  );

  it(
    'Consistently poor questions are retired',
    trackScenario('Low-quality question retirement', async () => {
      for (let i = 0; i < 10; i += 1) {
        await recordAttempt(
          app,
          parentToken,
          sessionId,
          retiredQuestionId,
          '7',
          { selectedAnswer: '7', timeSpent: 60, hintUsed: true },
        );
      }

      const response = await request(app.getHttpServer())
        .get('/admin/question-performance')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = response.body as PerformanceRecord[];
      const record = body.find(
        (entry) => entry.questionId === retiredQuestionId,
      );

      expect(record).toEqual(
        expect.objectContaining({
          timesServed: 10,
          correctCount: 0,
          wrongCount: 10,
          correctRate: 0,
          status: 'RETIRED',
        }),
      );
    }),
  );

  it(
    'Borderline questions are flagged as low performance',
    trackScenario('Low performance flagging', async () => {
      for (let i = 0; i < 6; i += 1) {
        await recordAttempt(
          app,
          parentToken,
          sessionId,
          lowPerformanceQuestionId,
          '7',
          { selectedAnswer: '8' },
        );
      }
      for (let i = 0; i < 4; i += 1) {
        await recordAttempt(
          app,
          parentToken,
          sessionId,
          lowPerformanceQuestionId,
          '7',
          { timeSpent: 9 },
        );
      }

      const response = await request(app.getHttpServer())
        .get('/admin/question-performance')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = response.body as PerformanceRecord[];
      const record = body.find(
        (entry) => entry.questionId === lowPerformanceQuestionId,
      );

      expect(record).toEqual(
        expect.objectContaining({
          timesServed: 10,
          correctCount: 4,
          wrongCount: 6,
          correctRate: 40,
          status: 'LOW_PERFORMANCE',
        }),
      );
    }),
  );

  it(
    'Inventory reports shortfall and replenishes on demand',
    trackScenario('Inventory replenishment', async () => {
      const before = await request(app.getHttpServer())
        .get('/admin/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const beforeBody = before.body as InventoryResponse;
      const entry = beforeBody.entries.find(
        (item) => item.learningObjectiveId === learningObjectiveId,
      );

      expect(beforeBody.threshold).toBe(5);
      expect(entry).toEqual(
        expect.objectContaining({
          available: 1,
          total: 3,
          needsReplenishment: true,
          shortfall: 4,
        }),
      );

      const replenish = await request(app.getHttpServer())
        .post('/admin/inventory/replenish')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const replenishBody = replenish.body as ReplenishResponse;

      expect(replenishBody.generatedCount).toBe(4);
      expect(replenishBody.replenished).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            learningObjectiveId,
            generated: 4,
            available: 5,
            source: 'content-generation',
          }),
        ]),
      );

      const after = await request(app.getHttpServer())
        .get('/admin/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const afterBody = after.body as InventoryResponse;
      const afterEntry = afterBody.entries.find(
        (item) => item.learningObjectiveId === learningObjectiveId,
      );

      expect(afterEntry).toEqual(
        expect.objectContaining({
          available: 5,
          total: 7,
          needsReplenishment: false,
          shortfall: 0,
        }),
      );
    }),
  );

  it(
    'Replenishment does not over-generate',
    trackScenario('No duplicate generation', async () => {
      const replenish = await request(app.getHttpServer())
        .post('/admin/inventory/replenish')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = replenish.body as ReplenishResponse;

      expect(body.generatedCount).toBe(0);
      expect(body.replenished).toEqual([]);
    }),
  );

  it(
    'Admin-only access for inventory and performance',
    trackScenario('Authorization', async () => {
      await request(app.getHttpServer())
        .get('/admin/question-performance')
        .expect(401);

      await request(app.getHttpServer())
        .get('/admin/inventory')
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(401);

      await request(app.getHttpServer())
        .post('/admin/inventory/replenish')
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(401);
    }),
  );
});
