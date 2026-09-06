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

interface LearningSessionResponse {
  id: string;
  child: ChildResponse;
  curriculum: string;
  subject: string;
  status: string;
  startedAt: string;
}

interface QuestionResponse {
  id: string;
  questionText: string;
  correctAnswer: string;
}

interface AttemptResponse {
  id: string;
  childId: string;
  learningSessionId: string;
  questionId: string;
  learningObjectiveId: string;
  selectedAnswer: string;
  correct: boolean;
  timeSpent: number;
  hintUsed: boolean;
  perceivedDifficulty: string;
  attemptNumber: number;
  reasonCodes: string[];
  createdAt: string;
}

interface MasteryRecord {
  learningObjectiveId: string;
  learningObjectiveName: string;
  masteryScore: number;
  confidenceScore: number;
  totalAttempts: number;
  correctAttempts: number;
  wrongAttempts: number;
  averageResponseTime: number;
  hintUsageCount: number;
  lastPracticedAt: string;
  reviewRecommended: boolean;
  reasonCodes: string[];
}

interface MasteryResponse {
  childId: string;
  mastery: MasteryRecord[];
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

function createQuestionPayload(
  learningObjectiveId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    questionText: 'What is 2 + 2?',
    questionType: 'Multiple Choice',
    options: ['3', '4', '5'],
    correctAnswer: '4',
    explanation: 'Two plus two equals four.',
    learningObjectiveId,
    curriculum: 'IB',
    grade: 'Grade 5',
    difficulty: 2,
    ...overrides,
  };
}

async function registerParent(
  app: INestApplication<App>,
  email: string,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, password: TEST_PASSWORD })
    .expect(201);

  return (response.body as AuthResponse).accessToken;
}

async function loginAdmin(
  app: INestApplication<App>,
  email: string,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/admin/auth/login')
    .send({ email, password: ADMIN_PASSWORD })
    .expect(200);

  return (response.body as AuthResponse).accessToken;
}

async function createChild(
  app: INestApplication<App>,
  token: string,
  overrides: Record<string, unknown> = {},
): Promise<ChildResponse> {
  const response = await request(app.getHttpServer())
    .post('/children')
    .set('Authorization', `Bearer ${token}`)
    .send(createChildPayload(overrides))
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

async function createQuestion(
  app: INestApplication<App>,
  adminToken: string,
  learningObjectiveId: string,
  overrides: Record<string, unknown> = {},
): Promise<QuestionResponse> {
  const response = await request(app.getHttpServer())
    .post('/questions')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(createQuestionPayload(learningObjectiveId, overrides))
    .expect(201);

  return response.body as QuestionResponse;
}

describe('Student Model (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let parentOneToken: string;
  let parentTwoToken: string;
  let childId: string;
  let sessionId: string;
  let learningObjectiveId: string;
  let topicId: string;
  let questionOneId: string;
  let questionTwoId: string;
  let adminToken: string;
  let adminEmail: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    adminEmail = createTestEmail('e2e-sm-admin');
    await prisma.admin.create({
      data: {
        email: adminEmail,
        password: await argon2.hash(ADMIN_PASSWORD),
      },
    });

    adminToken = await loginAdmin(app, adminEmail);
    parentOneToken = await registerParent(
      app,
      createTestEmail('e2e-sm-parent-one'),
    );
    parentTwoToken = await registerParent(
      app,
      createTestEmail('e2e-sm-parent-two'),
    );

    const child = await createChild(app, parentOneToken);
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
        name: `E2E Fractions ${randomUUID()}`,
        subjectAreaId: subjectArea.id,
        subtopics: {
          create: {
            name: `E2E Equivalent Fractions ${randomUUID()}`,
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
        subtopics: {
          include: {
            learningObjectives: true,
          },
        },
      },
    });

    topicId = topic.id;
    learningObjectiveId = topic.subtopics[0].learningObjectives[0].id;

    const session = await startSession(app, parentOneToken, childId);
    sessionId = session.id;

    const questionOne = await createQuestion(
      app,
      adminToken,
      learningObjectiveId,
      {
        questionText: 'What is 2 + 2?',
        options: ['3', '4', '5'],
        correctAnswer: '4',
      },
    );
    questionOneId = questionOne.id;

    const questionTwo = await createQuestion(
      app,
      adminToken,
      learningObjectiveId,
      {
        questionText: 'What is 3 + 4?',
        options: ['6', '7', '8'],
        correctAnswer: '7',
      },
    );
    questionTwoId = questionTwo.id;
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
    printTestReport('Sprint 05 Test Report', testResults);
  });

  it(
    'Record Attempt',
    trackScenario('Record Attempt', async () => {
      const response = await request(app.getHttpServer())
        .post('/attempts')
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({
          learningSessionId: sessionId,
          questionId: questionOneId,
          selectedAnswer: '4',
          timeSpent: 8,
          hintUsed: false,
          perceivedDifficulty: 'Just Right',
        })
        .expect(201);

      const body = response.body as AttemptResponse;

      expect(body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          childId,
          learningSessionId: sessionId,
          questionId: questionOneId,
          learningObjectiveId,
          selectedAnswer: '4',
          correct: true,
          timeSpent: 8,
          hintUsed: false,
          perceivedDifficulty: 'Just Right',
          attemptNumber: 1,
          createdAt: expect.any(String),
        }),
      );
      expect(body.reasonCodes).toEqual(
        expect.arrayContaining(['CORRECT_ANSWER', 'FAST_RESPONSE']),
      );
      expect(body.reasonCodes).not.toContain('WRONG_ANSWER');
    }),
  );

  it(
    'Multiple Attempts',
    trackScenario('Multiple Attempts', async () => {
      const response = await request(app.getHttpServer())
        .post('/attempts')
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({
          learningSessionId: sessionId,
          questionId: questionTwoId,
          selectedAnswer: '7',
          timeSpent: 8,
          hintUsed: false,
          perceivedDifficulty: 'Just Right',
        })
        .expect(201);

      const body = response.body as AttemptResponse;

      expect(body).toEqual(
        expect.objectContaining({
          correct: true,
          attemptNumber: 2,
        }),
      );

      const masteryResponse = await request(app.getHttpServer())
        .get(`/children/${childId}/mastery`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);

      const masteryBody = masteryResponse.body as MasteryResponse;
      const record = masteryBody.mastery.find(
        (entry) => entry.learningObjectiveId === learningObjectiveId,
      );

      expect(record).toEqual(
        expect.objectContaining({
          totalAttempts: 2,
          correctAttempts: 2,
          wrongAttempts: 0,
          confidenceScore: 40,
        }),
      );
    }),
  );

  it(
    'Mastery Calculation',
    trackScenario('Mastery Calculation', async () => {
      const response = await request(app.getHttpServer())
        .post('/attempts')
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({
          learningSessionId: sessionId,
          questionId: questionOneId,
          selectedAnswer: '5',
          timeSpent: 15,
          hintUsed: false,
          perceivedDifficulty: 'Just Right',
        })
        .expect(201);

      const body = response.body as AttemptResponse;

      expect(body).toEqual(
        expect.objectContaining({
          correct: false,
          attemptNumber: 3,
        }),
      );
      expect(body.reasonCodes).toContain('WRONG_ANSWER');

      const masteryResponse = await request(app.getHttpServer())
        .get(`/children/${childId}/mastery`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);

      const masteryBody = masteryResponse.body as MasteryResponse;
      const record = masteryBody.mastery.find(
        (entry) => entry.learningObjectiveId === learningObjectiveId,
      );

      expect(record).toEqual(
        expect.objectContaining({
          masteryScore: 67,
          confidenceScore: 60,
          totalAttempts: 3,
          correctAttempts: 2,
          wrongAttempts: 1,
          hintUsageCount: 0,
          reviewRecommended: false,
        }),
      );
      expect(record?.averageResponseTime).toBeCloseTo(31 / 3, 1);
    }),
  );

  it(
    'Update Mastery',
    trackScenario('Update Mastery', async () => {
      const response = await request(app.getHttpServer())
        .post('/attempts')
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({
          learningSessionId: sessionId,
          questionId: questionTwoId,
          selectedAnswer: '9',
          timeSpent: 40,
          hintUsed: true,
          perceivedDifficulty: 'Easy',
        })
        .expect(201);

      const body = response.body as AttemptResponse;

      expect(body).toEqual(
        expect.objectContaining({
          correct: false,
          hintUsed: true,
          timeSpent: 40,
          attemptNumber: 4,
        }),
      );
      expect(body.reasonCodes).toEqual(
        expect.arrayContaining(['WRONG_ANSWER', 'SLOW_RESPONSE', 'HINT_USED']),
      );

      const masteryResponse = await request(app.getHttpServer())
        .get(`/children/${childId}/mastery`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);

      const masteryBody = masteryResponse.body as MasteryResponse;
      const record = masteryBody.mastery.find(
        (entry) => entry.learningObjectiveId === learningObjectiveId,
      );

      expect(record).toEqual(
        expect.objectContaining({
          masteryScore: 50,
          confidenceScore: 80,
          totalAttempts: 4,
          correctAttempts: 2,
          wrongAttempts: 2,
          hintUsageCount: 1,
          reviewRecommended: true,
        }),
      );
      expect(record?.averageResponseTime).toBeCloseTo(71 / 4, 1);
      expect(record?.reasonCodes).toContain('LOW_MASTERY');
    }),
  );

  it(
    'Read Mastery',
    trackScenario('Read Mastery', async () => {
      const response = await request(app.getHttpServer())
        .get(`/children/${childId}/mastery`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);

      const body = response.body as MasteryResponse;

      expect(body.childId).toBe(childId);
      expect(body.mastery).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            learningObjectiveId,
            learningObjectiveName: 'Add whole numbers',
            lastPracticedAt: expect.any(String),
          }),
        ]),
      );
    }),
  );

  it(
    'Parent Authorization',
    trackScenario('Parent Authorization', async () => {
      await request(app.getHttpServer())
        .post('/attempts')
        .send({
          learningSessionId: sessionId,
          questionId: questionOneId,
          selectedAnswer: '4',
          timeSpent: 5,
          hintUsed: false,
          perceivedDifficulty: 'Easy',
        })
        .expect(401);

      await request(app.getHttpServer())
        .get(`/children/${childId}/mastery`)
        .expect(401);
    }),
  );

  it(
    'Wrong-Parent Rejection',
    trackScenario('Wrong-Parent Rejection', async () => {
      await request(app.getHttpServer())
        .post('/attempts')
        .set('Authorization', `Bearer ${parentTwoToken}`)
        .send({
          learningSessionId: sessionId,
          questionId: questionOneId,
          selectedAnswer: '4',
          timeSpent: 5,
          hintUsed: false,
          perceivedDifficulty: 'Easy',
        })
        .expect(404);

      await request(app.getHttpServer())
        .get(`/children/${childId}/mastery`)
        .set('Authorization', `Bearer ${parentTwoToken}`)
        .expect(404);
    }),
  );
});
