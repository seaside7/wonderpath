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
  context: string;
  startedAt: string;
}

interface QuestionResponse {
  id: string;
  correctAnswer: string;
}

interface RecommendationItem {
  learningObjective: {
    id: string;
    name: string;
    description: string;
    estimatedMasteryTime: number;
    hierarchy: {
      subject: { id: string; code: string; name: string };
      topic: { id: string; name: string };
      subtopic: { id: string; name: string };
    };
  };
  action: string;
  reasonCodes: string[];
  explanation: string;
  score: number;
}

interface RecommendationResponse {
  childId: string;
  session: {
    id: string;
    curriculum: string;
    subject: string;
    context: string;
  };
  recommendations: RecommendationItem[];
}

interface SessionFocusResponse {
  id: string;
  childId: string;
  curriculum: string;
  subject: string;
  context: string;
  focusLearningObjective: { id: string; name: string } | null;
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
  overrides: Record<string, unknown> = {},
): Promise<LearningSessionResponse> {
  const response = await request(app.getHttpServer())
    .post('/learning-sessions')
    .set('Authorization', `Bearer ${token}`)
    .send({ childId, curriculum: 'IB', subject: 'Mathematics', ...overrides })
    .expect(201);

  return response.body as LearningSessionResponse;
}

async function recordAttempt(
  app: INestApplication<App>,
  token: string,
  sessionId: string,
  questionId: string,
  selectedAnswer: string,
): Promise<void> {
  await request(app.getHttpServer())
    .post('/attempts')
    .set('Authorization', `Bearer ${token}`)
    .send({
      learningSessionId: sessionId,
      questionId,
      selectedAnswer,
      timeSpent: 8,
      hintUsed: false,
      perceivedDifficulty: 'Just Right',
    })
    .expect(201);
}

async function getRecommendations(
  app: INestApplication<App>,
  token: string,
  childId: string,
): Promise<RecommendationResponse> {
  const response = await request(app.getHttpServer())
    .get(`/children/${childId}/recommendations`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  return response.body as RecommendationResponse;
}

describe('Recommendation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let adminEmail: string;
  let parentOneToken: string;
  let parentTwoToken: string;
  let childId: string;
  let normalSessionId: string;
  let examSessionId: string;
  let weakLoId: string;
  let staleLoId: string;
  let otherLoId: string;
  let topicId: string;
  let weakQuestionId: string;
  let staleQuestionId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    adminEmail = createTestEmail('e2e-rec-admin');
    await prisma.admin.create({
      data: {
        email: adminEmail,
        password: await argon2.hash(ADMIN_PASSWORD),
      },
    });

    adminToken = await loginAdmin(app, adminEmail);
    parentOneToken = await registerParent(
      app,
      createTestEmail('e2e-rec-parent-one'),
    );
    parentTwoToken = await registerParent(
      app,
      createTestEmail('e2e-rec-parent-two'),
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
        name: `E2E Recommendation ${randomUUID()}`,
        subjectAreaId: subjectArea.id,
        subtopics: {
          create: [
            {
              name: `E2E Addition ${randomUUID()}`,
              learningObjectives: {
                create: {
                  name: 'Add whole numbers',
                  description: 'Add two whole numbers up to 100',
                  estimatedMasteryTime: 30,
                },
              },
            },
            {
              name: `E2E Multiplication ${randomUUID()}`,
              learningObjectives: {
                create: {
                  name: 'Multiply whole numbers',
                  description: 'Multiply two single digit numbers',
                  estimatedMasteryTime: 30,
                },
              },
            },
            {
              name: `E2E Cambridge Only ${randomUUID()}`,
              learningObjectives: {
                create: {
                  name: 'Cambridge subtraction',
                  description: 'Subtract whole numbers (Cambridge only)',
                  estimatedMasteryTime: 30,
                },
              },
            },
          ],
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
    weakLoId = topic.subtopics[0].learningObjectives[0].id;
    staleLoId = topic.subtopics[1].learningObjectives[0].id;
    otherLoId = topic.subtopics[2].learningObjectives[0].id;

    normalSessionId = (await startSession(app, parentOneToken, childId)).id;

    const weakQuestion = await createQuestion(app, adminToken, weakLoId, {
      questionText: 'What is 2 + 2?',
      options: ['3', '4', '5'],
      correctAnswer: '4',
      curriculum: 'IB',
    });
    weakQuestionId = weakQuestion.id;

    const staleQuestion = await createQuestion(app, adminToken, staleLoId, {
      questionText: 'What is 3 + 4?',
      options: ['6', '7', '8'],
      correctAnswer: '7',
      curriculum: 'IB',
    });
    staleQuestionId = staleQuestion.id;

    await createQuestion(app, adminToken, otherLoId, {
      questionText: 'What is 5 - 2?',
      options: ['2', '3', '4'],
      correctAnswer: '3',
      curriculum: 'Cambridge',
    });

    await recordAttempt(
      app,
      parentOneToken,
      normalSessionId,
      weakQuestionId,
      '5',
    );
    await recordAttempt(
      app,
      parentOneToken,
      normalSessionId,
      weakQuestionId,
      '3',
    );
    await recordAttempt(
      app,
      parentOneToken,
      normalSessionId,
      staleQuestionId,
      '7',
    );
    await recordAttempt(
      app,
      parentOneToken,
      normalSessionId,
      staleQuestionId,
      '7',
    );

    const staleMastery = await prisma.studentMastery.findUnique({
      where: {
        childId_learningObjectiveId: {
          childId,
          learningObjectiveId: staleLoId,
        },
      },
    });

    if (staleMastery) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await prisma.studentMastery.update({
        where: { id: staleMastery.id },
        data: {
          lastPracticedAt: thirtyDaysAgo,
          reviewRecommended: true,
          reasonCodes: ['LONG_TIME_NO_PRACTICE'],
        },
      });
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
      const attempts = await prisma.questionAttempt.count({
        where: {
          learningObjectiveId: { in: [weakLoId, staleLoId, otherLoId] },
        },
      });
      if (attempts === 0) {
        await prisma.topic.delete({ where: { id: topicId } });
      }
    }

    await app.close();
    printTestReport('Sprint 06 Test Report', testResults);
  });

  it(
    'Recommendation for Weak Objective',
    trackScenario('Recommendation for Weak Objective', async () => {
      const body = await getRecommendations(app, parentOneToken, childId);

      const weak = body.recommendations.find(
        (item) => item.learningObjective.id === weakLoId,
      );

      expect(weak).toBeDefined();
      expect(weak?.reasonCodes).toContain('LOW_MASTERY');
      expect(['REVIEW', 'PRACTICE']).toContain(weak?.action);
    }),
  );

  it(
    'Recommendation for Review due to Recency',
    trackScenario('Recommendation for Review due to Recency', async () => {
      const body = await getRecommendations(app, parentOneToken, childId);

      const stale = body.recommendations.find(
        (item) => item.learningObjective.id === staleLoId,
      );

      expect(stale).toBeDefined();
      expect(stale?.action).toBe('REVIEW');
      expect(stale?.reasonCodes).toEqual(
        expect.arrayContaining(['HIGH_MASTERY', 'LONG_TIME_NO_PRACTICE']),
      );
    }),
  );

  it(
    'Curriculum Filtering',
    trackScenario('Curriculum Filtering', async () => {
      const body = await getRecommendations(app, parentOneToken, childId);

      const recommendedIds = body.recommendations.map(
        (item) => item.learningObjective.id,
      );

      expect(recommendedIds).toContain(weakLoId);
      expect(recommendedIds).toContain(staleLoId);
      expect(recommendedIds).not.toContain(otherLoId);
    }),
  );

  it(
    'Explainability Reason',
    trackScenario('Explainability Reason', async () => {
      const body = await getRecommendations(app, parentOneToken, childId);

      expect(body.recommendations.length).toBeGreaterThan(0);

      for (const item of body.recommendations) {
        expect(item.reasonCodes.length).toBeGreaterThan(0);
        expect(item.explanation.length).toBeGreaterThan(0);
      }
    }),
  );

  it(
    'Session Context',
    trackScenario('Session Context', async () => {
      examSessionId = (
        await startSession(app, parentOneToken, childId, {
          context: 'Exam Tomorrow',
        })
      ).id;

      const body = await getRecommendations(app, parentOneToken, childId);

      expect(body.session.context).toBe('Exam Tomorrow');

      const withExamContext = body.recommendations.find((item) =>
        item.reasonCodes.includes('EXAM_TOMORROW'),
      );

      expect(withExamContext).toBeDefined();
    }),
  );

  it(
    'Parent Override',
    trackScenario('Parent Override', async () => {
      const body = await getRecommendations(app, parentOneToken, childId);

      const topRecommendedId = body.recommendations[0]?.learningObjective.id;

      const overrideId = topRecommendedId === weakLoId ? staleLoId : weakLoId;

      const response = await request(app.getHttpServer())
        .post(`/learning-sessions/${examSessionId}/recommendation/accept`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({ learningObjectiveId: overrideId })
        .expect(201);

      const focus = response.body as SessionFocusResponse;

      expect(focus).toEqual(
        expect.objectContaining({
          id: examSessionId,
          childId,
          context: 'Exam Tomorrow',
          focusLearningObjective: expect.objectContaining({
            id: overrideId,
          }),
        }),
      );
      expect(overrideId).not.toBe(topRecommendedId);
    }),
  );

  it(
    'Parent Authorization',
    trackScenario('Parent Authorization', async () => {
      await request(app.getHttpServer())
        .get(`/children/${childId}/recommendations`)
        .expect(401);

      await request(app.getHttpServer())
        .post(`/learning-sessions/${normalSessionId}/recommendation/accept`)
        .send({ learningObjectiveId: weakLoId })
        .expect(401);
    }),
  );

  it(
    'Wrong-Parent Rejection',
    trackScenario('Wrong-Parent Rejection', async () => {
      await request(app.getHttpServer())
        .get(`/children/${childId}/recommendations`)
        .set('Authorization', `Bearer ${parentTwoToken}`)
        .expect(404);

      await request(app.getHttpServer())
        .post(`/learning-sessions/${examSessionId}/recommendation/accept`)
        .set('Authorization', `Bearer ${parentTwoToken}`)
        .send({ learningObjectiveId: weakLoId })
        .expect(404);
    }),
  );
});

async function createQuestion(
  app: INestApplication<App>,
  token: string,
  learningObjectiveId: string,
  overrides: Record<string, unknown> = {},
): Promise<QuestionResponse> {
  const response = await request(app.getHttpServer())
    .post('/questions')
    .set('Authorization', `Bearer ${token}`)
    .send({
      questionType: 'Multiple Choice',
      options: ['3', '4', '5'],
      correctAnswer: '4',
      explanation: 'Simple explanation.',
      learningObjectiveId,
      curriculum: 'IB',
      grade: 'Grade 5',
      difficulty: 2,
      ...overrides,
    })
    .expect(201);

  return response.body as QuestionResponse;
}
