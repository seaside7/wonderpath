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

process.env.ATLAS_CONTENT_PROVIDER = 'mock';

const TEST_EMAIL_DOMAIN = 'wonderpath.test';
const TEST_PASSWORD = 'password123';
const ADMIN_PASSWORD = 'admin-password123';

interface AuthResponse {
  accessToken: string;
}

interface GenerationResponse {
  id: string;
  status: string;
  curriculum: string;
  grade: string;
  subject: { id: string; code: string; name: string };
  topic: { id: string; name: string };
  learningObjective: { id: string; name: string };
  questionType: string;
  difficulty: number;
  quantity: number;
  provider: string;
  model: string;
  generationMetadata: Record<string, unknown> | null;
  error: string | null;
  questions: Array<{
    id: string;
    questionText: string;
    correctAnswer: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const testResults: TestResult[] = [];
const trackScenario = createScenarioTracker(testResults);

function createTestEmail(prefix: string): string {
  return `${prefix}-${randomUUID()}@${TEST_EMAIL_DOMAIN}`;
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

function createGenerationPayload(
  learningObjectiveId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    learningObjectiveId,
    curriculum: 'IB',
    grade: 'Grade 5',
    questionType: 'Multiple Choice',
    difficulty: 2,
    quantity: 2,
    ...overrides,
  };
}

async function generateQuestions(
  app: INestApplication<App>,
  token: string,
  learningObjectiveId: string,
  overrides: Record<string, unknown> = {},
  expectedStatus = 201,
): Promise<GenerationResponse> {
  const response = await request(app.getHttpServer())
    .post('/generations')
    .set('Authorization', `Bearer ${token}`)
    .send(createGenerationPayload(learningObjectiveId, overrides))
    .expect(expectedStatus);

  return response.body as GenerationResponse;
}

async function retryGeneration(
  app: INestApplication<App>,
  token: string,
  generationId: string,
  body: Record<string, unknown> = {},
  expectedStatus = 201,
): Promise<GenerationResponse> {
  const response = await request(app.getHttpServer())
    .post(`/generations/${generationId}/retry`)
    .set('Authorization', `Bearer ${token}`)
    .send(body)
    .expect(expectedStatus);

  return response.body as GenerationResponse;
}

async function getGeneration(
  app: INestApplication<App>,
  token: string,
  generationId: string,
  expectedStatus = 200,
): Promise<GenerationResponse> {
  const response = await request(app.getHttpServer())
    .get(`/generations/${generationId}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(expectedStatus);

  return response.body as GenerationResponse;
}

describe('Content Generation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let adminEmail: string;
  let parentToken: string;
  let topicId: string;
  let learningObjectiveId: string;
  let completedGenerationId: string;
  let failedGenerationId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    adminEmail = createTestEmail('e2e-cg-admin');
    await prisma.admin.create({
      data: {
        email: adminEmail,
        password: await argon2.hash(ADMIN_PASSWORD),
      },
    });

    adminToken = await loginAdmin(app, adminEmail);
    parentToken = await registerParent(app, createTestEmail('e2e-cg-parent'));

    const existingSubject = await prisma.subjectArea.findUnique({
      where: { code: PrismaSubject.MATHEMATICS },
    });

    const subjectArea =
      existingSubject ??
      (await prisma.subjectArea.create({
        data: {
          code: PrismaSubject.MATHEMATICS,
          name: 'Mathematics',
        },
      }));

    const topic = await prisma.topic.create({
      data: {
        name: `E2E Content Generation ${randomUUID()}`,
        subjectAreaId: subjectArea.id,
        subtopics: {
          create: {
            name: `E2E Generated Learning ${randomUUID()}`,
            learningObjectives: {
              create: {
                name: 'Add all numbers up to one hundred',
                description: 'Add whole numbers whose sum is at most 100',
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
    printTestReport('Sprint 07 Test Report', testResults);
  });

  it(
    'Admin Authorization',
    trackScenario('Admin Authorization', async () => {
      const unknownId = randomUUID();

      await request(app.getHttpServer())
        .get(`/generations/${unknownId}`)
        .expect(401);
      await request(app.getHttpServer()).post('/generations').expect(401);
      await request(app.getHttpServer())
        .post(`/generations/${unknownId}/retry`)
        .expect(401);

      await request(app.getHttpServer())
        .get(`/generations/${unknownId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(401);

      await request(app.getHttpServer())
        .post('/generations')
        .set('Authorization', `Bearer ${parentToken}`)
        .send(createGenerationPayload(learningObjectiveId))
        .expect(401);
    }),
  );

  it(
    'Request Validation',
    trackScenario('Request Validation', async () => {
      await request(app.getHttpServer())
        .post('/generations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createGenerationPayload(learningObjectiveId, { quantity: 0 }))
        .expect(400);

      await request(app.getHttpServer())
        .post('/generations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createGenerationPayload(learningObjectiveId, { quantity: 21 }))
        .expect(400);

      await request(app.getHttpServer())
        .post('/generations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createGenerationPayload(learningObjectiveId, { difficulty: 6 }))
        .expect(400);

      await request(app.getHttpServer())
        .post('/generations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          curriculum: 'IB',
          grade: 'Grade 5',
          questionType: 'Multiple Choice',
          difficulty: 2,
          quantity: 2,
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/generations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createGenerationPayload(learningObjectiveId, { curriculum: 'X' }))
        .expect(400);

      await request(app.getHttpServer())
        .post('/generations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(
          createGenerationPayload(learningObjectiveId, {
            unknownField: true,
          }),
        )
        .expect(400);
    }),
  );

  it(
    'Successful Batch Generation',
    trackScenario('Successful Batch Generation', async () => {
      const body = await generateQuestions(
        app,
        adminToken,
        learningObjectiveId,
        {
          quantity: 2,
          difficulty: 3,
        },
      );

      completedGenerationId = body.id;

      expect(body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          status: 'Completed',
          curriculum: 'IB',
          grade: 'Grade 5',
          subject: expect.objectContaining({ code: 'Mathematics' }),
          topic: expect.objectContaining({ id: expect.any(String) }),
          learningObjective: expect.objectContaining({
            id: learningObjectiveId,
          }),
          questionType: 'Multiple Choice',
          difficulty: 3,
          quantity: 2,
          provider: 'mock',
          model: 'mock-v1',
          error: null,
        }),
      );

      expect(body.generationMetadata).toEqual(
        expect.objectContaining({ requestedAt: expect.any(String) }),
      );

      expect(body.questions).toHaveLength(2);
      for (const question of body.questions) {
        expect(question.questionText).toContain(
          'Add all numbers up to one hundred',
        );
        expect(question.correctAnswer).toBe('4');
      }
    }),
  );

  it(
    'Questions Persisted with Generation Link',
    trackScenario('Questions Persisted with Generation Link', async () => {
      const persisted = await prisma.question.findMany({
        where: { generationId: completedGenerationId },
        include: {
          learningObjective: {
            select: { id: true, name: true },
          },
        },
      });

      expect(persisted).toHaveLength(2);

      for (const question of persisted) {
        expect(question.generationId).toBe(completedGenerationId);
        expect(question.learningObjectiveId).toBe(learningObjectiveId);
        expect(question.questionType).toBe('MULTIPLE_CHOICE');
        expect(question.correctAnswer).toBe('4');
        expect(question.difficulty).toBe(3);
        expect(question.options).toEqual(['3', '4', '5']);
      }

      const fetched = await getGeneration(
        app,
        adminToken,
        completedGenerationId,
      );
      expect(fetched.questions).toHaveLength(2);
    }),
  );

  it(
    'Invalid AI Output is Marked Failed',
    trackScenario('Invalid AI Output is Marked Failed', async () => {
      const body = await generateQuestions(
        app,
        adminToken,
        learningObjectiveId,
        {
          quantity: 3,
          providerOptions: { invalid: true },
        },
      );

      failedGenerationId = body.id;

      expect(body.status).toBe('Failed');
      expect(body.questions).toHaveLength(0);
      expect(body.error).toContain(
        'Correct answer must be one of the provided options',
      );

      const persisted = await prisma.question.count({
        where: { generationId: failedGenerationId },
      });
      expect(persisted).toBe(0);

      const stored = await prisma.questionGeneration.findUnique({
        where: { id: failedGenerationId },
      });
      expect(stored?.status).toBe('FAILED');
    }),
  );

  it(
    'Retry Recovers a Failed Generation',
    trackScenario('Retry Recovers a Failed Generation', async () => {
      const body = await retryGeneration(app, adminToken, failedGenerationId, {
        providerOptions: { invalid: false },
      });

      expect(body.status).toBe('Completed');
      expect(body.error).toBeNull();
      expect(body.provider).toBe('mock');
      expect(body.model).toBe('mock-v1');
      expect(body.questions).toHaveLength(3);
      expect(body.generationMetadata).toEqual(
        expect.objectContaining({
          retriedAt: expect.any(String),
          providerOptions: { invalid: false },
        }),
      );

      const persisted = await prisma.question.count({
        where: { generationId: failedGenerationId },
      });
      expect(persisted).toBe(3);
    }),
  );

  it(
    'Completed Generation Cannot Be Retried',
    trackScenario('Completed Generation Cannot Be Retried', async () => {
      await retryGeneration(app, adminToken, completedGenerationId, {}, 400);
    }),
  );

  it(
    'Unknown Generation Not Found',
    trackScenario('Unknown Generation Not Found', async () => {
      const unknownId = randomUUID();

      await getGeneration(app, adminToken, unknownId, 404);
      await retryGeneration(app, adminToken, unknownId, {}, 404);
    }),
  );
});
