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
  nickname: string | null;
  dateOfBirth: string;
  gender: string;
  grade: string;
  curricula: string[];
  preferredLanguage: string;
  schoolName: string | null;
  createdAt: string;
  updatedAt: string;
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

describe('Child Profile (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let parentOneToken: string;
  let parentTwoToken: string;
  let childId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    parentOneToken = await registerParent(
      app,
      createTestEmail('e2e-child-parent-one'),
    );
    parentTwoToken = await registerParent(
      app,
      createTestEmail('e2e-child-parent-two'),
    );
  });

  afterAll(async () => {
    await prisma.parent.deleteMany({
      where: { email: { endsWith: `@${TEST_EMAIL_DOMAIN}` } },
    });
    await app.close();

    printTestReport('Sprint 02 Test Report', testResults);
  });

  it(
    'Create Child',
    trackScenario('Create Child', async () => {
      const response = await request(app.getHttpServer())
        .post('/children')
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send(createChildPayload())
        .expect(201);

      const body = response.body as ChildResponse;

      expect(body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          fullName: 'Emma Johnson',
          nickname: 'Em',
          dateOfBirth: '2015-03-15',
          gender: 'Girl',
          grade: 'Grade 5',
          curricula: expect.arrayContaining(['IB', 'Nasional']),
          preferredLanguage: 'English',
          schoolName: 'WonderPath Elementary',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      );
      expect(body).not.toHaveProperty('parentId');

      childId = body.id;
    }),
  );

  it(
    'Update Child',
    trackScenario('Update Child', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/children/${childId}`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({
          fullName: 'Emma Marie Johnson',
          grade: 'Grade 6',
          curricula: ['Cambridge', 'Merdeka'],
        })
        .expect(200);

      expect(response.body as ChildResponse).toEqual(
        expect.objectContaining({
          id: childId,
          fullName: 'Emma Marie Johnson',
          grade: 'Grade 6',
          curricula: expect.arrayContaining(['Cambridge', 'Merdeka']),
        }),
      );
    }),
  );

  it(
    'Get Children',
    trackScenario('Get Children', async () => {
      const listResponse = await request(app.getHttpServer())
        .get('/children')
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);

      expect(listResponse.body as ChildResponse[]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: childId,
            fullName: 'Emma Marie Johnson',
          }),
        ]),
      );

      const singleResponse = await request(app.getHttpServer())
        .get(`/children/${childId}`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);

      expect(singleResponse.body as ChildResponse).toEqual(
        expect.objectContaining({
          id: childId,
          fullName: 'Emma Marie Johnson',
        }),
      );
    }),
  );

  it(
    'Unauthorized Access',
    trackScenario('Unauthorized Access', async () => {
      await request(app.getHttpServer()).get('/children').expect(401);
      await request(app.getHttpServer())
        .get(`/children/${childId}`)
        .expect(401);
      await request(app.getHttpServer())
        .post('/children')
        .send(createChildPayload())
        .expect(401);

      await request(app.getHttpServer())
        .get(`/children/${childId}`)
        .set('Authorization', `Bearer ${parentTwoToken}`)
        .expect(404);

      await request(app.getHttpServer())
        .patch(`/children/${childId}`)
        .set('Authorization', `Bearer ${parentTwoToken}`)
        .send({ fullName: 'Hacked Name' })
        .expect(404);

      await request(app.getHttpServer())
        .delete(`/children/${childId}`)
        .set('Authorization', `Bearer ${parentTwoToken}`)
        .expect(404);
    }),
  );

  it(
    'Delete Child',
    trackScenario('Delete Child', async () => {
      await request(app.getHttpServer())
        .delete(`/children/${childId}`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/children/${childId}`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(404);
    }),
  );
});
