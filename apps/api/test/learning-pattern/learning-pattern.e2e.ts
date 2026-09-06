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

interface LearningPattern {
  key: string;
  value: string;
  strength: number;
  evidenceCount: number;
  lastDetectedAt: string;
}

interface LearningPatternResponse {
  childId: string;
  patterns: LearningPattern[];
}

interface EncouragementResponse {
  message: string;
  data: {
    sessionsCompared: number;
    responseTimeImprovementPct: number | null;
    correctRateImprovementPct: number | null;
  };
}

const testResults: TestResult[] = [];
const trackScenario = createScenarioTracker(testResults);

function createTestEmail(prefix: string): string {
  return `${prefix}-${randomUUID()}@${TEST_EMAIL_DOMAIN}`;
}

function createChildPayload(overrides: Record<string, unknown> = {}) {
  return {
    fullName: 'Noah Lee',
    nickname: 'No',
    dateOfBirth: '2016-07-21',
    gender: 'Boy',
    grade: 'Grade 4',
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
    questionText: 'What is 2 + 3?',
    questionType: 'Multiple Choice',
    options: ['4', '5', '6'],
    correctAnswer: '5',
    explanation: 'Two plus three equals five.',
    learningObjectiveId,
    curriculum: 'IB',
    grade: 'Grade 4',
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
  overrides: Record<string, unknown> = {},
): Promise<void> {
  await request(app.getHttpServer())
    .post('/attempts')
    .set('Authorization', `Bearer ${token}`)
    .send({
      learningSessionId,
      questionId,
      selectedAnswer: '5',
      timeSpent: 5,
      hintUsed: false,
      perceivedDifficulty: 'Just Right',
      ...overrides,
    })
    .expect(201);
}

describe('Learning Patterns & Personality (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let parentOneToken: string;
  let parentTwoToken: string;
  let childId: string;
  let sessionId: string;
  let secondSessionId: string;
  let learningObjectiveId: string;
  let topicId: string;
  let storyQuestionId: string;
  let plainQuestionId: string;
  let adminToken: string;
  let adminEmail: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    adminEmail = createTestEmail('e2e-lp-admin');
    await prisma.admin.create({
      data: {
        email: adminEmail,
        password: await argon2.hash(ADMIN_PASSWORD),
      },
    });

    adminToken = await loginAdmin(app, adminEmail);
    parentOneToken = await registerParent(
      app,
      createTestEmail('e2e-lp-parent-one'),
    );
    parentTwoToken = await registerParent(
      app,
      createTestEmail('e2e-lp-parent-two'),
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
        name: `E2E Patterns ${randomUUID()}`,
        subjectAreaId: subjectArea.id,
        subtopics: {
          create: {
            name: `E2E Pattern Subtopic ${randomUUID()}`,
            learningObjectives: {
              create: {
                name: 'Add and subtract whole numbers',
                description: 'Add and subtract whole numbers up to 100',
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
          questionText: 'Story: Noah has 2 crayons and gets 3 more.',
          options: ['4', '5', '6'],
          correctAnswer: '5',
          metadata: {
            questionType: 'story',
            visual: true,
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
          questionText: 'What is 3 + 2?',
          options: ['4', '5', '6'],
          correctAnswer: '5',
        }),
      )
      .expect(201);

    plainQuestionId = (plainQuestion.body as { id: string }).id;

    for (let i = 0; i < 6; i += 1) {
      await recordAttempt(app, parentOneToken, sessionId, plainQuestionId);
    }

    for (let i = 0; i < 3; i += 1) {
      await recordAttempt(app, parentOneToken, sessionId, storyQuestionId);
    }
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
    printTestReport('Sprint 09 Test Report', testResults);
  });

  it(
    'Personality preference persistence',
    trackScenario('Personality preference persistence', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/children/${childId}/personality`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({
          favoriteAnimal: 'Otter',
          favoriteTheme: 'Space',
          favoriteColor: 'Teal',
          motivationStyle: 'Playful Buddy',
        })
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          favoriteAnimal: 'Otter',
          favoriteTheme: 'Space',
          favoriteColor: 'Teal',
          motivationStyle: 'Playful Buddy',
        }),
      );

      const partial = await request(app.getHttpServer())
        .patch(`/children/${childId}/personality`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({
          favoriteColor: 'Purple',
        })
        .expect(200);

      expect(partial.body).toEqual(
        expect.objectContaining({
          favoriteAnimal: 'Otter',
          favoriteTheme: 'Space',
          favoriteColor: 'Purple',
          motivationStyle: 'Playful Buddy',
        }),
      );

      const read = await request(app.getHttpServer())
        .get(`/children/${childId}/personality`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);

      expect(read.body).toEqual(partial.body);
    }),
  );

  it(
    'Learning pattern aggregation',
    trackScenario('Learning pattern aggregation', async () => {
      const response = await request(app.getHttpServer())
        .get(`/children/${childId}/learning-patterns`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);

      const body = response.body as LearningPatternResponse;

      expect(body.childId).toBe(childId);

      const byKey = new Map(
        body.patterns.map((pattern) => [pattern.key, pattern]),
      );

      expect(body.patterns.length).toBe(5);

      const pace = byKey.get('Response Pace');
      const difficulty = byKey.get('Perceived Difficulty');
      const studyTime = byKey.get('Best Study Time');
      const story = byKey.get('Story Problems');
      const visual = byKey.get('Visual Questions');

      expect(pace).toEqual(
        expect.objectContaining({
          value: 'Fast',
          evidenceCount: 9,
        }),
      );
      expect(difficulty).toEqual(
        expect.objectContaining({
          value: 'Comfortable',
          evidenceCount: 9,
        }),
      );
      expect(studyTime).toEqual(
        expect.objectContaining({
          evidenceCount: 9,
        }),
      );
      expect(['Morning', 'Afternoon', 'Evening']).toContain(studyTime?.value);
      expect(story).toEqual(
        expect.objectContaining({
          value: 'Strong',
          evidenceCount: 3,
        }),
      );
      expect(visual).toEqual(
        expect.objectContaining({
          value: 'Strong',
          evidenceCount: 3,
        }),
      );

      for (const pattern of body.patterns) {
        expect(pattern.strength).toBeGreaterThan(0);
        expect(pattern.strength).toBeLessThanOrEqual(1);
        expect(pattern.lastDetectedAt).toEqual(expect.any(String));
      }
    }),
  );

  it(
    'Encouragement before a second session',
    trackScenario('Encouragement single session', async () => {
      const response = await request(app.getHttpServer())
        .get(`/children/${childId}/encouragement`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);

      const body = response.body as EncouragementResponse;

      expect(body.data.sessionsCompared).toBe(1);
      expect(body.data.responseTimeImprovementPct).toBeNull();
      expect(body.message).toContain('correctly in your latest session');
    }),
  );

  it(
    'Data-driven encouragement after a faster session',
    trackScenario('Encouragement faster session', async () => {
      const second = await startSession(app, parentOneToken, childId);
      secondSessionId = second.id;

      for (let i = 0; i < 3; i += 1) {
        await recordAttempt(
          app,
          parentOneToken,
          secondSessionId,
          plainQuestionId,
          {
            timeSpent: 2,
          },
        );
      }

      const response = await request(app.getHttpServer())
        .get(`/children/${childId}/encouragement`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);

      const body = response.body as EncouragementResponse;

      expect(body.data.sessionsCompared).toBe(2);
      expect(body.data.responseTimeImprovementPct).toBeCloseTo(60, 0);
      expect(body.message).toContain('% faster than the previous one');
    }),
  );

  it(
    'Parent authorization for learning pattern endpoints',
    trackScenario('Parent Authorization', async () => {
      await request(app.getHttpServer())
        .get(`/children/${childId}/learning-patterns`)
        .expect(401);

      await request(app.getHttpServer())
        .get(`/children/${childId}/personality`)
        .expect(401);

      await request(app.getHttpServer())
        .get(`/children/${childId}/encouragement`)
        .expect(401);

      await request(app.getHttpServer())
        .get(`/children/${childId}/learning-patterns`)
        .set('Authorization', `Bearer ${parentTwoToken}`)
        .expect(404);

      await request(app.getHttpServer())
        .patch(`/children/${childId}/personality`)
        .set('Authorization', `Bearer ${parentTwoToken}`)
        .send({ favoriteColor: 'Red' })
        .expect(404);

      await request(app.getHttpServer())
        .get(`/children/${childId}/encouragement`)
        .set('Authorization', `Bearer ${parentTwoToken}`)
        .expect(404);
    }),
  );
});
