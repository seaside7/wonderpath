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

interface ParentProfileResponse {
  id: string;
  email: string;
  createdAt: string;
  hasPin: boolean;
  pinHash?: string;
}

const testResults: TestResult[] = [];
const trackScenario = createScenarioTracker(testResults);

function createTestEmail(prefix: string): string {
  return `${prefix}-${randomUUID()}@${TEST_EMAIL_DOMAIN}`;
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

describe('Parent PIN (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let parentOneToken: string;
  let parentOneEmail: string;
  let parentTwoToken: string;
  let parentTwoEmail: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    parentOneEmail = createTestEmail('e2e-pin-parent-one');
    parentOneToken = await registerParent(app, parentOneEmail);
    parentTwoEmail = createTestEmail('e2e-pin-parent-two');
    parentTwoToken = await registerParent(app, parentTwoEmail);
  });

  afterAll(async () => {
    await prisma.parent.deleteMany({
      where: { email: { in: [parentOneEmail, parentTwoEmail] } },
    });
    await app.close();

    printTestReport('Sprint 17 Test Report', testResults);
  });

  it(
    'Fresh parent profile reports hasPin false',
    trackScenario('Fresh parent has no PIN', async () => {
      const response = await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);

      const body = response.body as ParentProfileResponse;
      expect(body.hasPin).toBe(false);
      expect(body.pinHash).toBeUndefined();
    }),
  );

  it(
    'Set PIN stores hash and reports hasPin true',
    trackScenario('Set PIN', async () => {
      const response = await request(app.getHttpServer())
        .post('/me/pin')
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({ pin: '1234' })
        .expect(200);

      const body = response.body as ParentProfileResponse;
      expect(body.hasPin).toBe(true);
      expect(body.pinHash).toBeUndefined();

      const profile = await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);

      expect((profile.body as ParentProfileResponse).hasPin).toBe(true);
      expect((profile.body as ParentProfileResponse).pinHash).toBeUndefined();
    }),
  );

  it(
    'Verify PIN returns valid true for the correct PIN',
    trackScenario('Verify correct PIN', async () => {
      const response = await request(app.getHttpServer())
        .post('/me/pin/verify')
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({ pin: '1234' })
        .expect(200);

      expect(response.body).toEqual({ valid: true });
    }),
  );

  it(
    'Verify PIN returns valid false for a wrong PIN',
    trackScenario('Verify wrong PIN', async () => {
      const response = await request(app.getHttpServer())
        .post('/me/pin/verify')
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({ pin: '9999' })
        .expect(200);

      expect(response.body).toEqual({ valid: false });
    }),
  );

  it(
    'Setting a new PIN overwrites the old one',
    trackScenario('Overwrite PIN', async () => {
      await request(app.getHttpServer())
        .post('/me/pin')
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({ pin: '5678' })
        .expect(200);

      const oldPin = await request(app.getHttpServer())
        .post('/me/pin/verify')
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({ pin: '1234' })
        .expect(200);
      expect(oldPin.body).toEqual({ valid: false });

      const newPin = await request(app.getHttpServer())
        .post('/me/pin/verify')
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({ pin: '5678' })
        .expect(200);
      expect(newPin.body).toEqual({ valid: true });
    }),
  );

  it(
    'Verify PIN returns valid false when no PIN is set',
    trackScenario('Verify with no PIN set', async () => {
      const response = await request(app.getHttpServer())
        .post('/me/pin/verify')
        .set('Authorization', `Bearer ${parentTwoToken}`)
        .send({ pin: '1234' })
        .expect(200);

      expect(response.body).toEqual({ valid: false });
    }),
  );

  it(
    'Rejects PINs that are not exactly 4 digits',
    trackScenario('Reject invalid PIN format', async () => {
      for (const pin of ['123', '12345', 'abcd', '12a4', '']) {
        await request(app.getHttpServer())
          .post('/me/pin')
          .set('Authorization', `Bearer ${parentTwoToken}`)
          .send({ pin })
          .expect(400);

        await request(app.getHttpServer())
          .post('/me/pin/verify')
          .set('Authorization', `Bearer ${parentTwoToken}`)
          .send({ pin })
          .expect(400);
      }

      await request(app.getHttpServer())
        .post('/me/pin')
        .set('Authorization', `Bearer ${parentTwoToken}`)
        .send({})
        .expect(400);
    }),
  );

  it(
    'Requires authentication for PIN endpoints',
    trackScenario('PIN endpoints require auth', async () => {
      await request(app.getHttpServer())
        .post('/me/pin')
        .send({ pin: '1234' })
        .expect(401);

      await request(app.getHttpServer())
        .post('/me/pin/verify')
        .send({ pin: '1234' })
        .expect(401);

      await request(app.getHttpServer()).get('/me').expect(401);
    }),
  );
});
