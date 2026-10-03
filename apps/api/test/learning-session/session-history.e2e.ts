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
  fullName: string;
}

interface SessionHistoryItem {
  id: string;
  subject: string;
  curriculum: string;
  status: string;
  startedAt: string;
  questionsAnswered: number;
  correctCount: number;
}

interface SessionHistoryResponse {
  childId: string;
  sessions: SessionHistoryItem[];
}

const testResults: TestResult[] = [];
const trackScenario = createScenarioTracker(testResults);

function createTestEmail(prefix: string): string {
  return `${prefix}-${randomUUID()}@${TEST_EMAIL_DOMAIN}`;
}

function createChildPayload(overrides: Record<string, unknown> = {}) {
  return {
    fullName: 'Emma Johnson',
    nickname: 'Em',
    dateOfBirth: '2015-03-15',
    gender: 'Girl',
    grade: 'Grade 5',
    curricula: ['IB', 'Nasional'],
    preferredLanguage: 'English',
    schoolName: 'WonderPath Elementary',
    ...overrides,
  };
}

describe('Session History (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let parentOneToken: string;
  let parentOneEmail: string;
  let parentTwoToken: string;
  let parentTwoEmail: string;
  let adminEmail: string;
  let childId: string;
  let topicId: string;
  let sessionAId: string;
  let sessionBId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    adminEmail = createTestEmail('e2e-history-admin');
    await prisma.admin.create({
      data: {
        email: adminEmail,
        password: await argon2.hash(ADMIN_PASSWORD),
      },
    });
    const adminLogin = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ email: adminEmail, password: ADMIN_PASSWORD })
      .expect(200);
    const adminToken = (adminLogin.body as AuthResponse).accessToken;

    parentOneEmail = createTestEmail('e2e-history-parent-one');
    parentOneToken = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: parentOneEmail, password: TEST_PASSWORD })
      .expect(201)
      .then((res) => (res.body as AuthResponse).accessToken);

    parentTwoEmail = createTestEmail('e2e-history-parent-two');
    parentTwoToken = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: parentTwoEmail, password: TEST_PASSWORD })
      .expect(201)
      .then((res) => (res.body as AuthResponse).accessToken);

    const child = await request(app.getHttpServer())
      .post('/children')
      .set('Authorization', `Bearer ${parentOneToken}`)
      .send(createChildPayload())
      .expect(201)
      .then((res) => res.body as ChildResponse);
    childId = child.id;

    const subjectArea = await prisma.subjectArea.upsert({
      where: { code: PrismaSubject.MATHEMATICS },
      create: { code: PrismaSubject.MATHEMATICS, name: 'Mathematics' },
      update: {},
    });

    const topic = await prisma.topic.create({
      data: {
        name: `E2E History ${randomUUID()}`,
        subjectAreaId: subjectArea.id,
        subtopics: {
          create: {
            name: `E2E History Subtopic ${randomUUID()}`,
            learningObjectives: {
              create: {
                name: 'Add whole numbers',
                description: 'Add two whole numbers up to 100',
                estimatedMasteryTime: 30,
              },
            },
          },
        },
      },
      include: {
        subtopics: { include: { learningObjectives: true } },
      },
    });
    topicId = topic.id;
    const learningObjectiveId = topic.subtopics[0].learningObjectives[0].id;

    async function createQuestion(
      text: string,
      options: string[],
      correctAnswer: string,
    ): Promise<string> {
      const res = await request(app.getHttpServer())
        .post('/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          questionText: text,
          questionType: 'Multiple Choice',
          options,
          correctAnswer,
          explanation: 'Test explanation.',
          learningObjectiveId,
          curriculum: 'IB',
          grade: 'Grade 5',
          difficulty: 2,
        })
        .expect(201);
      return (res.body as { id: string }).id;
    }

    const questionOneId = await createQuestion(
      'What is 2 + 2?',
      ['3', '4', '5'],
      '4',
    );
    const questionTwoId = await createQuestion(
      'What is 3 + 4?',
      ['6', '7', '8'],
      '7',
    );

    async function startSession(): Promise<string> {
      const res = await request(app.getHttpServer())
        .post('/learning-sessions')
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({ childId, curriculum: 'IB', subject: 'Mathematics' })
        .expect(201);
      return (res.body as { id: string }).id;
    }

    async function answer(
      sessionId: string,
      questionId: string,
      selectedAnswer: string,
    ): Promise<void> {
      await request(app.getHttpServer())
        .post('/attempts')
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({
          learningSessionId: sessionId,
          questionId,
          selectedAnswer,
          timeSpent: 12,
          hintUsed: false,
          perceivedDifficulty: 'Easy',
        })
        .expect(201);
    }

    // Session A: two attempts, one correct — then superseded.
    sessionAId = await startSession();
    await answer(sessionAId, questionOneId, '4');
    await answer(sessionAId, questionTwoId, '6');

    // Session B: supersedes A (A becomes Cancelled), one correct attempt.
    sessionBId = await startSession();
    await answer(sessionBId, questionOneId, '4');

    await request(app.getHttpServer())
      .post(`/learning-sessions/${sessionBId}/complete`)
      .set('Authorization', `Bearer ${parentOneToken}`)
      .expect(200);
  });

  afterAll(async () => {
    await prisma.admin.deleteMany({ where: { email: adminEmail } });
    await prisma.parent.deleteMany({
      where: { email: { in: [parentOneEmail, parentTwoEmail] } },
    });
    if (topicId) {
      await prisma.topic.delete({ where: { id: topicId } });
    }
    await app.close();

    printTestReport('Sprint 19 Test Report', testResults);
  });

  it(
    'Lists sessions most-recent-first with attempt counts',
    trackScenario('List session history', async () => {
      const response = await request(app.getHttpServer())
        .get(`/children/${childId}/learning-sessions`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);

      const body = response.body as SessionHistoryResponse;
      expect(body.childId).toBe(childId);
      expect(body.sessions).toHaveLength(2);

      const [latest, older] = body.sessions;
      expect(latest.id).toBe(sessionBId);
      expect(older.id).toBe(sessionAId);
      expect(new Date(latest.startedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(older.startedAt).getTime(),
      );

      expect(latest).toEqual(
        expect.objectContaining({
          subject: 'Mathematics',
          curriculum: 'IB',
          status: 'Completed',
          questionsAnswered: 1,
          correctCount: 1,
        }),
      );
      expect(older).toEqual(
        expect.objectContaining({
          subject: 'Mathematics',
          curriculum: 'IB',
          status: 'Cancelled',
          questionsAnswered: 2,
          correctCount: 1,
        }),
      );

      // No duration/end-time proxy: only the specified keys.
      for (const item of body.sessions) {
        expect(Object.keys(item).sort()).toEqual(
          [
            'correctCount',
            'curriculum',
            'id',
            'questionsAnswered',
            'startedAt',
            'status',
            'subject',
          ].sort(),
        );
      }
    }),
  );

  it(
    'Respects the limit query parameter',
    trackScenario('Limit session history', async () => {
      const response = await request(app.getHttpServer())
        .get(`/children/${childId}/learning-sessions?limit=1`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);

      const body = response.body as SessionHistoryResponse;
      expect(body.sessions).toHaveLength(1);
      expect(body.sessions[0].id).toBe(sessionBId);
    }),
  );

  it(
    'Rejects out-of-range limit values',
    trackScenario('Reject invalid limit', async () => {
      for (const limit of ['0', '51', 'abc']) {
        await request(app.getHttpServer())
          .get(`/children/${childId}/learning-sessions?limit=${limit}`)
          .set('Authorization', `Bearer ${parentOneToken}`)
          .expect(400);
      }
    }),
  );

  it(
    'Returns an empty list for a child with no sessions',
    trackScenario('Empty session history', async () => {
      const otherChild = await request(app.getHttpServer())
        .post('/children')
        .set('Authorization', `Bearer ${parentTwoToken}`)
        .send(createChildPayload({ fullName: 'Liam Smith' }))
        .expect(201)
        .then((res) => res.body as ChildResponse);

      const response = await request(app.getHttpServer())
        .get(`/children/${otherChild.id}/learning-sessions`)
        .set('Authorization', `Bearer ${parentTwoToken}`)
        .expect(200);

      expect(response.body).toEqual({
        childId: otherChild.id,
        sessions: [],
      });
    }),
  );

  it(
    'Enforces parent ownership',
    trackScenario('Session history ownership', async () => {
      await request(app.getHttpServer())
        .get(`/children/${childId}/learning-sessions`)
        .set('Authorization', `Bearer ${parentTwoToken}`)
        .expect(404);

      await request(app.getHttpServer())
        .get(`/children/${childId}/learning-sessions`)
        .expect(401);

      await request(app.getHttpServer())
        .get('/children/does-not-exist/learning-sessions')
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(404);
    }),
  );
});
