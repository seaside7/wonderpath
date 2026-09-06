import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
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

describe('Learning Session (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let parentOneToken: string;
  let parentTwoToken: string;
  let childId: string;
  let sessionId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    parentOneToken = await registerParent(
      app,
      createTestEmail('e2e-session-parent-one'),
    );
    parentTwoToken = await registerParent(
      app,
      createTestEmail('e2e-session-parent-two'),
    );

    const child = await createChild(app, parentOneToken);
    childId = child.id;
  });

  afterAll(async () => {
    await prisma.parent.deleteMany({
      where: { email: { endsWith: `@${TEST_EMAIL_DOMAIN}` } },
    });
    await app.close();

    printTestReport('Sprint 03 Test Report', testResults);
  });

  it(
    'Start Learning Session',
    trackScenario('Start Learning Session', async () => {
      const response = await request(app.getHttpServer())
        .post('/learning-sessions')
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({
          childId,
          curriculum: 'IB',
          subject: 'Mathematics',
        })
        .expect(201);

      const body = response.body as LearningSessionResponse;

      expect(body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          child: {
            id: childId,
            fullName: 'Emma Johnson',
          },
          curriculum: 'IB',
          subject: 'Mathematics',
          status: 'Started',
          startedAt: expect.any(String),
        }),
      );
      expect(body).not.toHaveProperty('childId');

      sessionId = body.id;
    }),
  );

  it(
    'Reject Other Parent Child',
    trackScenario('Reject Other Parent Child', async () => {
      await request(app.getHttpServer())
        .post('/learning-sessions')
        .set('Authorization', `Bearer ${parentTwoToken}`)
        .send({
          childId,
          curriculum: 'IB',
          subject: 'Mathematics',
        })
        .expect(404);
    }),
  );

  it(
    'Reject Unsupported Curriculum',
    trackScenario('Reject Unsupported Curriculum', async () => {
      const response = await request(app.getHttpServer())
        .post('/learning-sessions')
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({
          childId,
          curriculum: 'Cambridge',
          subject: 'Mathematics',
        })
        .expect(400);

      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 400,
          message: 'Selected curriculum is not supported for this child',
        }),
      );
    }),
  );

  it(
    'Reject Missing Subject',
    trackScenario('Reject Missing Subject', async () => {
      const response = await request(app.getHttpServer())
        .post('/learning-sessions')
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({
          childId,
          curriculum: 'IB',
        })
        .expect(400);

      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 400,
        }),
      );
    }),
  );

  it(
    'Get Current Session',
    trackScenario('Get Current Session', async () => {
      const response = await request(app.getHttpServer())
        .get('/learning-sessions/current')
        .query({ childId })
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);

      const body = response.body as LearningSessionResponse;

      expect(body).toEqual(
        expect.objectContaining({
          id: sessionId,
          child: {
            id: childId,
            fullName: 'Emma Johnson',
          },
          curriculum: 'IB',
          subject: 'Mathematics',
          status: 'Started',
        }),
      );
    }),
  );

  it(
    'Unauthorized Access',
    trackScenario('Unauthorized Access', async () => {
      await request(app.getHttpServer())
        .post('/learning-sessions')
        .send({
          childId,
          curriculum: 'IB',
          subject: 'Mathematics',
        })
        .expect(401);

      await request(app.getHttpServer())
        .get('/learning-sessions/current')
        .query({ childId })
        .expect(401);
    }),
  );
});
