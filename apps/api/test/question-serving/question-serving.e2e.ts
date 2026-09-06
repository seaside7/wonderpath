import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
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

interface AuthResponse {
  accessToken: string;
}

interface ChildResponse {
  id: string;
}

interface QuestionPayload {
  id: string;
  questionText: string;
  questionType: string;
  options: string[];
  difficulty: number;
}

interface NextQuestionResponse {
  question: QuestionPayload | null;
}

interface AttemptResponse {
  id: string;
  correct: boolean;
  explanation: string;
}

const testResults: TestResult[] = [];
const trackScenario = createScenarioTracker(testResults);

function createTestEmail(prefix: string): string {
  return `${prefix}-${randomUUID()}@${TEST_EMAIL_DOMAIN}`;
}

function createChildPayload(overrides: Record<string, unknown> = {}) {
  return {
    fullName: 'Kai Tanaka',
    nickname: 'Kai',
    dateOfBirth: '2015-03-20',
    gender: 'Boy',
    grade: 'Grade 5',
    curricula: ['IB'],
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
    questionText: 'Warm-up math question',
    questionType: 'Multiple Choice',
    options: ['1', '2', '3'],
    correctAnswer: '2',
    explanation: 'Because one plus one equals two.',
    learningObjectiveId,
    curriculum: 'IB',
    grade: 'Grade 5',
    difficulty: 1,
    ...overrides,
  };
}

async function startSession(
  app: INestApplication<App>,
  token: string,
  childIdToUse: string,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/learning-sessions')
    .set('Authorization', `Bearer ${token}`)
    .send({ childId: childIdToUse, curriculum: 'IB', subject: 'Mathematics' })
    .expect(201);

  return (response.body as { id: string }).id;
}

async function answerCurrentQuestion(
  app: INestApplication<App>,
  token: string,
  sessionId: string,
  selectedAnswer = '2',
): Promise<QuestionPayload> {
  const next = await request(app.getHttpServer())
    .get(`/learning-sessions/${sessionId}/next-question`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  const question = (next.body as NextQuestionResponse)
    .question as QuestionPayload;

  await request(app.getHttpServer())
    .post('/attempts')
    .set('Authorization', `Bearer ${token}`)
    .send({
      learningSessionId: sessionId,
      questionId: question.id,
      selectedAnswer,
      timeSpent: 10,
      hintUsed: false,
      perceivedDifficulty: 'Just Right',
    })
    .expect(201);

  return question;
}

describe('Question Serving & Session Completion (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let parentToken: string;
  let secondParentToken: string;
  let childId: string;
  let secondChildId: string;
  let learningObjectiveId: string;
  let topicId: string;
  let sessionId: string;
  let warmUpEasyId: string;
  let warmUpHardId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    async function registerParent(prefix: string): Promise<string> {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: createTestEmail(prefix), password: TEST_PASSWORD })
        .expect(201);

      return (response.body as AuthResponse).accessToken;
    }

    parentToken = await registerParent('e2e-qs-parent');
    secondParentToken = await registerParent('e2e-qs-parent2');

    const adminEmail = createTestEmail('e2e-qs-admin');
    const { hash } = await import('argon2');
    await prisma.admin.create({
      data: {
        email: adminEmail,
        password: await hash('admin-password123'),
      },
    });

    const login = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ email: adminEmail, password: 'admin-password123' })
      .expect(200);

    adminToken = (login.body as AuthResponse).accessToken;

    async function createChild(token: string): Promise<ChildResponse> {
      const response = await request(app.getHttpServer())
        .post('/children')
        .set('Authorization', `Bearer ${token}`)
        .send(createChildPayload())
        .expect(201);

      return response.body as ChildResponse;
    }

    const firstChild = await createChild(parentToken);
    childId = firstChild.id;
    const secondChild = await createChild(secondParentToken);
    secondChildId = secondChild.id;

    let subjectArea = await prisma.subjectArea.findUnique({
      where: { code: PrismaSubject.MATHEMATICS },
    });

    if (!subjectArea) {
      subjectArea = await prisma.subjectArea.create({
        data: { code: PrismaSubject.MATHEMATICS, name: 'Mathematics' },
      });
    }

    const topic = await prisma.topic.create({
      data: {
        name: `E2E Serving ${randomUUID()}`,
        subjectAreaId: subjectArea.id,
        subtopics: {
          create: {
            name: `E2E Serving Subtopic ${randomUUID()}`,
            learningObjectives: {
              create: {
                name: 'Understand Addition',
                description: 'Add numbers up to 100',
                estimatedMasteryTime: 30,
              },
            },
          },
        },
      },
      include: { subtopics: { include: { learningObjectives: true } } },
    });

    topicId = topic.id;
    learningObjectiveId = topic.subtopics[0].learningObjectives[0].id;

    sessionId = await startSession(app, parentToken, childId);

    async function createQuestion(
      text: string,
      difficulty: number,
    ): Promise<string> {
      const response = await request(app.getHttpServer())
        .post('/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(
          createQuestionPayload(learningObjectiveId, {
            questionText: text,
            difficulty,
          }),
        )
        .expect(201);

      return (response.body as { id: string }).id;
    }

    warmUpEasyId = await createQuestion('Serving warm-up A', 1);
    warmUpHardId = await createQuestion('Serving warm-up B', 5);
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
    printTestReport('Sprint 15 Test Report', testResults);
  });

  it(
    'Serves a parent-safe next question at the closest difficulty',
    trackScenario('Next question served', async () => {
      const response = await request(app.getHttpServer())
        .get(`/learning-sessions/${sessionId}/next-question`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      const body = response.body as NextQuestionResponse;
      const question = body.question as QuestionPayload;

      // Difficulty 1 is closer to the default target (3) than difficulty 5.
      expect(question.id).toBe(warmUpEasyId);
      expect(question.difficulty).toBe(1);
      expect(question).toEqual(
        expect.objectContaining({
          questionText: 'Serving warm-up A',
          questionType: 'Multiple Choice',
          options: ['1', '2', '3'],
        }),
      );

      expect(question).not.toHaveProperty('correctAnswer');
      expect(question).not.toHaveProperty('explanation');
    }),
  );

  it(
    'Excludes already-answered questions',
    trackScenario('No repeats within session', async () => {
      await answerCurrentQuestion(app, parentToken, sessionId);

      const response = await request(app.getHttpServer())
        .get(`/learning-sessions/${sessionId}/next-question`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      const next = (response.body as NextQuestionResponse)
        .question as QuestionPayload;

      expect(next.id).toBe(warmUpHardId);
      expect(next).not.toBeNull();
    }),
  );

  it(
    'Skips questions whose performance is RETIRED',
    trackScenario('Retired questions skipped', async () => {
      const retiredQuestionId = await request(app.getHttpServer())
        .post('/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(
          createQuestionPayload(learningObjectiveId, {
            questionText: 'Retired serving question',
            difficulty: 1,
          }),
        )
        .expect(201)
        .then((response) => (response.body as { id: string }).id);

      await prisma.questionPerformance.create({
        data: {
          questionId: retiredQuestionId,
          timesServed: 20,
          correctCount: 0,
          wrongCount: 20,
          status: 'RETIRED',
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/learning-sessions/${sessionId}/next-question`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      const body = response.body as NextQuestionResponse;

      // The only eligible question remaining is the hard warm-up.
      expect((body.question as QuestionPayload).id).toBe(warmUpHardId);
    }),
  );

  it(
    'Returns a parent-safe attempt response with explanation',
    trackScenario('Attempt includes explanation', async () => {
      const attempt = await request(app.getHttpServer())
        .post('/attempts')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          learningSessionId: sessionId,
          questionId: warmUpHardId,
          selectedAnswer: '2',
          timeSpent: 9,
          hintUsed: false,
          perceivedDifficulty: 'Easy',
        })
        .expect(201);

      const body = attempt.body as AttemptResponse;

      expect(body.correct).toBe(true);
      expect(body.explanation).toBe('Because one plus one equals two.');
    }),
  );

  it(
    'Returns null when the question pool is exhausted',
    trackScenario('Exhausted pool', async () => {
      const response = await request(app.getHttpServer())
        .get(`/learning-sessions/${sessionId}/next-question`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      const body = response.body as NextQuestionResponse;

      expect(body.question).toBeNull();
    }),
  );

  it(
    'Completes a session and blocks further question serving',
    trackScenario('Session completion', async () => {
      const activeSessionId = await startSession(app, parentToken, childId);

      const complete = await request(app.getHttpServer())
        .post(`/learning-sessions/${activeSessionId}/complete`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      expect((complete.body as { status: string }).status).toBe('Completed');

      await request(app.getHttpServer())
        .get(`/learning-sessions/${activeSessionId}/next-question`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(404);

      await request(app.getHttpServer())
        .post(`/learning-sessions/${activeSessionId}/complete`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(404);
    }),
  );

  it(
    'Enforces parent ownership for question serving and completion',
    trackScenario('Authorization', async () => {
      const sessionForOther = await startSession(
        app,
        secondParentToken,
        secondChildId,
      );

      await request(app.getHttpServer())
        .get(`/learning-sessions/${sessionForOther}/next-question`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(404);

      await request(app.getHttpServer())
        .post(`/learning-sessions/${sessionForOther}/complete`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(404);

      await request(app.getHttpServer())
        .get(`/learning-sessions/${sessionForOther}/next-question`)
        .expect(401);
    }),
  );
});
