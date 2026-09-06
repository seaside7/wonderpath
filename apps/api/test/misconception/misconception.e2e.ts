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

interface MisconceptionSignal {
  id: string;
  signalType: string;
  status: string;
  evidenceCount: number;
  confidence: number;
  firstDetectedAt: string;
  lastDetectedAt: string;
  supportingAttemptIds: string[];
  learningObjective: { id: string; name: string };
}

interface MisconceptionResponse {
  childId: string;
  signals: MisconceptionSignal[];
}

interface AdaptiveDifficultyResponse {
  childId: string;
  subject: string;
  currentDifficulty: number;
  direction: string;
  rationale: string;
}

interface AdaptiveDifficultyListResponse {
  childId: string;
  difficulty: Array<{ subject: string; currentDifficulty: number }>;
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

async function recordAttempt(
  app: INestApplication<App>,
  token: string,
  learningSessionId: string,
  questionId: string,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string }> {
  const response = await request(app.getHttpServer())
    .post('/attempts')
    .set('Authorization', `Bearer ${token}`)
    .send({
      learningSessionId,
      questionId,
      selectedAnswer: '4',
      timeSpent: 8,
      hintUsed: false,
      perceivedDifficulty: 'Just Right',
      ...overrides,
    })
    .expect(201);

  return response.body as { id: string };
}

describe('Misconception & Adaptive Difficulty (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let parentOneToken: string;
  let parentTwoToken: string;
  let childId: string;
  let sessionId: string;
  let learningObjectiveId: string;
  let topicId: string;
  let storyQuestionId: string;
  let plainQuestionId: string;
  let adminToken: string;
  let adminEmail: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    adminEmail = createTestEmail('e2e-mis-admin');
    await prisma.admin.create({
      data: {
        email: adminEmail,
        password: await argon2.hash(ADMIN_PASSWORD),
      },
    });

    adminToken = await loginAdmin(app, adminEmail);
    parentOneToken = await registerParent(
      app,
      createTestEmail('e2e-mis-parent-one'),
    );
    parentTwoToken = await registerParent(
      app,
      createTestEmail('e2e-mis-parent-two'),
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
        name: `E2E Misconceptions ${randomUUID()}`,
        subjectAreaId: subjectArea.id,
        subtopics: {
          create: {
            name: `E2E Misconception Subtopic ${randomUUID()}`,
            learningObjectives: {
              create: {
                name: 'Understand whole numbers',
                description: 'Match written numerals with amounts up to 100',
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

    const storyQuestion = await request(app.getHttpServer())
      .post('/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        createQuestionPayload(learningObjectiveId, {
          questionText: 'Story: Maya has 2 apples and gets 2 more.',
          options: ['3', '4', '5'],
          correctAnswer: '4',
          metadata: {
            questionType: 'story',
            visual: true,
            languageComplexity: 'high',
          },
        }),
      )
      .expect(201);

    storyQuestionId = (storyQuestion.body as { id: string }).id;

    const plainQuestion = await request(app.getHttpServer())
      .post('/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        createQuestionPayload(learningObjectiveId, {
          questionText: 'What is 3 + 4?',
          options: ['6', '7', '8'],
          correctAnswer: '7',
        }),
      )
      .expect(201);

    plainQuestionId = (plainQuestion.body as { id: string }).id;
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
    printTestReport('Sprint 08 Test Report', testResults);
  });

  it(
    'Question metadata is persisted and returned',
    trackScenario('Question metadata is persisted', async () => {
      const response = await request(app.getHttpServer())
        .get(`/questions/${storyQuestionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: storyQuestionId,
          metadata: {
            questionType: 'story',
            visual: true,
            languageComplexity: 'high',
          },
        }),
      );
    }),
  );

  it(
    'Repeated struggles surface misconception signals',
    trackScenario('Repeated struggles surface signals', async () => {
      const attemptIds: string[] = [];

      for (let i = 0; i < 5; i += 1) {
        const attempt = await recordAttempt(
          app,
          parentOneToken,
          sessionId,
          storyQuestionId,
          {
            selectedAnswer: '5',
            timeSpent: 45,
            hintUsed: true,
            perceivedDifficulty: 'Difficult',
          },
        );
        attemptIds.push(attempt.id);
      }

      const response = await request(app.getHttpServer())
        .get(`/children/${childId}/misconceptions`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);

      const body = response.body as MisconceptionResponse;

      expect(body.childId).toBe(childId);

      const repeated = body.signals.find(
        (signal) => signal.signalType === 'REPEATED_MISTAKE',
      );
      const story = body.signals.find(
        (signal) => signal.signalType === 'STORY_PROBLEM',
      );
      const visual = body.signals.find(
        (signal) => signal.signalType === 'VISUAL_REPRESENTATION',
      );
      const language = body.signals.find(
        (signal) => signal.signalType === 'HIGH_LANGUAGE_COMPLEXITY',
      );
      const hints = body.signals.find(
        (signal) => signal.signalType === 'HINTS_OVERUSED',
      );

      expect(repeated).toEqual(
        expect.objectContaining({
          evidenceCount: 5,
          confidence: 95,
          status: 'CONFIRMED',
          learningObjective: expect.objectContaining({
            id: learningObjectiveId,
            name: 'Understand whole numbers',
          }),
        }),
      );
      expect(repeated?.supportingAttemptIds).toEqual(
        expect.arrayContaining([
          attemptIds[0],
          attemptIds[attemptIds.length - 1],
        ]),
      );

      expect(story).toEqual(
        expect.objectContaining({
          evidenceCount: 5,
          confidence: 75,
          status: 'SUGGESTED',
        }),
      );
      expect(visual).toEqual(
        expect.objectContaining({
          evidenceCount: 5,
          confidence: 75,
          status: 'SUGGESTED',
        }),
      );
      expect(language).toEqual(
        expect.objectContaining({
          evidenceCount: 5,
          confidence: 75,
          status: 'SUGGESTED',
        }),
      );
      expect(hints).toEqual(
        expect.objectContaining({
          evidenceCount: 5,
          confidence: 50,
          status: 'POTENTIAL',
        }),
      );
    }),
  );

  it(
    'Adaptive difficulty decreases after struggles',
    trackScenario('Adaptive difficulty decreases', async () => {
      const response = await request(app.getHttpServer())
        .get(`/children/${childId}/adaptive-difficulty`)
        .query({ subject: 'Mathematics' })
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);

      const body = response.body as AdaptiveDifficultyResponse;

      expect(body).toEqual(
        expect.objectContaining({
          childId,
          subject: 'Mathematics',
          currentDifficulty: 1,
          direction: 'decrease',
        }),
      );
      expect(typeof body.rationale).toBe('string');
      expect(body.rationale.length).toBeGreaterThan(0);

      const listResponse = await request(app.getHttpServer())
        .get(`/children/${childId}/adaptive-difficulty`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);

      const listBody = listResponse.body as AdaptiveDifficultyListResponse;

      expect(listBody.childId).toBe(childId);
      expect(listBody.difficulty).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: 'Mathematics',
            currentDifficulty: 1,
          }),
        ]),
      );
    }),
  );

  it(
    'Adaptive difficulty increases with fast success',
    trackScenario('Adaptive difficulty increases', async () => {
      for (let i = 0; i < 6; i += 1) {
        await recordAttempt(app, parentOneToken, sessionId, plainQuestionId, {
          selectedAnswer: '7',
          timeSpent: 5,
          hintUsed: false,
          perceivedDifficulty: 'Easy',
        });
      }

      const response = await request(app.getHttpServer())
        .get(`/children/${childId}/adaptive-difficulty`)
        .query({ subject: 'Mathematics' })
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);

      const body = response.body as AdaptiveDifficultyResponse;

      expect(body).toEqual(
        expect.objectContaining({
          childId,
          subject: 'Mathematics',
          currentDifficulty: 4,
          direction: 'increase',
        }),
      );
    }),
  );

  it(
    'Correct attempts do not create misconception signals',
    trackScenario('Correct attempts no signals', async () => {
      const response = await request(app.getHttpServer())
        .get(`/children/${childId}/misconceptions`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);

      const body = response.body as MisconceptionResponse;

      const plainRepeated = body.signals.filter(
        (signal) =>
          signal.signalType === 'REPEATED_MISTAKE' &&
          signal.learningObjective.id === learningObjectiveId,
      );

      expect(plainRepeated.length).toBe(1);
    }),
  );

  it(
    'Parent authorization for misconception endpoints',
    trackScenario('Parent Authorization', async () => {
      await request(app.getHttpServer())
        .get(`/children/${childId}/misconceptions`)
        .expect(401);

      await request(app.getHttpServer())
        .get(`/children/${childId}/adaptive-difficulty`)
        .query({ subject: 'Mathematics' })
        .expect(401);

      await request(app.getHttpServer())
        .get(`/children/${childId}/misconceptions`)
        .set('Authorization', `Bearer ${parentTwoToken}`)
        .expect(404);

      await request(app.getHttpServer())
        .get(`/children/${childId}/adaptive-difficulty`)
        .query({ subject: 'Mathematics' })
        .set('Authorization', `Bearer ${parentTwoToken}`)
        .expect(404);
    }),
  );
});
