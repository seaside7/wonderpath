import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { Subject as PrismaSubject } from '../../generated/prisma/client';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createTestApp } from '../helpers/create-test-app';
import { createScenarioTracker, TestResult } from '../helpers/test-report';

const TEST_EMAIL_DOMAIN = 'wonderpath.test';
const TEST_PASSWORD = 'password123';
const ADMIN_PASSWORD = 'admin-password123';

interface AuthResponse {
  accessToken: string;
}

interface QuestionResponse {
  id: string;
  questionText: string;
  questionType: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  curriculum: string;
  grade: string;
  difficulty: number;
  hierarchy: {
    subject: { id: string; code: string; name: string };
    topic: { id: string; name: string };
    subtopic: { id: string; name: string };
    learningObjective: {
      id: string;
      name: string;
      description: string;
      estimatedMasteryTime: number;
    };
  };
}

const testResults: TestResult[] = [];
const trackScenario = createScenarioTracker(testResults);

function createTestEmail(prefix: string): string {
  return `${prefix}-${randomUUID()}@${TEST_EMAIL_DOMAIN}`;
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

function printSprint04Report(results: TestResult[]): void {
  const passed = results.filter((result) => result.status === 'PASSED').length;
  const failed = results.filter((result) => result.status === 'FAILED').length;

  console.log('\n====================================');
  console.log('Sprint 04 Test Report');
  console.log('====================================');

  for (const result of results) {
    const icon = result.status === 'PASSED' ? '✅' : '❌';
    console.log(`${icon} ${result.scenario}`);
  }

  console.log('====================================');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('====================================\n');
}

describe('Question Bank (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let parentToken: string;
  let learningObjectiveId: string;
  let topicId: string;
  let adminEmail: string;
  let questionId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    adminEmail = createTestEmail('e2e-admin');
    await prisma.admin.create({
      data: {
        email: adminEmail,
        password: await argon2.hash(ADMIN_PASSWORD),
      },
    });

    adminToken = await loginAdmin(app, adminEmail);
    parentToken = await registerParent(
      app,
      createTestEmail('e2e-question-parent'),
    );

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

    subjectAreaId = subjectArea.id;

    const topic = await prisma.topic.create({
      data: {
        name: `E2E Numbers ${randomUUID()}`,
        subjectAreaId: subjectArea.id,
        subtopics: {
          create: {
            name: `E2E Addition ${randomUUID()}`,
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
  });

  afterAll(async () => {
    if (topicId) {
      await prisma.topic.delete({ where: { id: topicId } });
    }

    await prisma.admin.deleteMany({
      where: { email: { endsWith: `@${TEST_EMAIL_DOMAIN}` } },
    });

    await prisma.parent.deleteMany({
      where: { email: { endsWith: `@${TEST_EMAIL_DOMAIN}` } },
    });

    await app.close();
    printSprint04Report(testResults);
  });

  it(
    'Create Question',
    trackScenario('Create Question', async () => {
      const response = await request(app.getHttpServer())
        .post('/questions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createQuestionPayload(learningObjectiveId))
        .expect(201);

      const body = response.body as QuestionResponse;

      expect(body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          questionText: 'What is 2 + 2?',
          questionType: 'Multiple Choice',
          options: ['3', '4', '5'],
          correctAnswer: '4',
          explanation: 'Two plus two equals four.',
          curriculum: 'IB',
          grade: 'Grade 5',
          difficulty: 2,
          hierarchy: expect.objectContaining({
            subject: expect.objectContaining({
              code: 'Mathematics',
            }),
            topic: expect.objectContaining({
              id: topicId,
            }),
            learningObjective: expect.objectContaining({
              id: learningObjectiveId,
              name: 'Add whole numbers',
            }),
          }),
        }),
      );
      expect(body).not.toHaveProperty('learningObjectiveId');

      questionId = body.id;
    }),
  );

  it(
    'Update Question',
    trackScenario('Update Question', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/questions/${questionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          questionText: 'What is 3 + 3?',
          difficulty: 3,
        })
        .expect(200);

      expect(response.body as QuestionResponse).toEqual(
        expect.objectContaining({
          id: questionId,
          questionText: 'What is 3 + 3?',
          difficulty: 3,
        }),
      );
    }),
  );

  it(
    'Get Question',
    trackScenario('Get Question', async () => {
      const response = await request(app.getHttpServer())
        .get(`/questions/${questionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body as QuestionResponse).toEqual(
        expect.objectContaining({
          id: questionId,
          questionText: 'What is 3 + 3?',
        }),
      );
    }),
  );

  it(
    'Search Question',
    trackScenario('Search Question', async () => {
      const response = await request(app.getHttpServer())
        .get('/questions')
        .query({
          subject: 'Mathematics',
          curriculum: 'IB',
          grade: 'Grade 5',
          topicId,
          difficulty: 3,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = response.body as QuestionResponse[];

      expect(body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: questionId,
            difficulty: 3,
          }),
        ]),
      );
    }),
  );

  it(
    'Unauthorized Access',
    trackScenario('Unauthorized Access', async () => {
      await request(app.getHttpServer())
        .post('/questions')
        .send(createQuestionPayload(learningObjectiveId))
        .expect(401);

      await request(app.getHttpServer()).get('/questions').expect(401);

      await request(app.getHttpServer())
        .post('/questions')
        .set('Authorization', `Bearer ${parentToken}`)
        .send(createQuestionPayload(learningObjectiveId))
        .expect(401);

      await request(app.getHttpServer())
        .get(`/questions/${questionId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(401);
    }),
  );

  it(
    'Delete Question',
    trackScenario('Delete Question', async () => {
      await request(app.getHttpServer())
        .delete(`/questions/${questionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/questions/${questionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    }),
  );
});
