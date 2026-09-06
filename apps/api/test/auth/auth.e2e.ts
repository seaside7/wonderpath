import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

const TEST_EMAIL_DOMAIN = 'wonderpath.test';
const TEST_PASSWORD = 'password123';

interface AuthResponse {
  accessToken: string;
}

interface TestResult {
  scenario: string;
  status: 'PASSED' | 'FAILED';
}

const testResults: TestResult[] = [];

function createTestEmail(): string {
  return `e2e-auth-${randomUUID()}@${TEST_EMAIL_DOMAIN}`;
}

async function createTestApp(): Promise<INestApplication<App>> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  return app;
}

function trackScenario(
  scenario: string,
  testFn: () => Promise<void>,
): () => Promise<void> {
  return async () => {
    try {
      await testFn();
      testResults.push({ scenario, status: 'PASSED' });
    } catch (error) {
      testResults.push({ scenario, status: 'FAILED' });
      throw error;
    }
  };
}

describe('Parent Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let sharedEmail: string;
  let accessToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    sharedEmail = createTestEmail();
  });

  afterAll(async () => {
    await prisma.parent.deleteMany({
      where: { email: { endsWith: `@${TEST_EMAIL_DOMAIN}` } },
    });
    await app.close();

    const passed = testResults.filter((result) => result.status === 'PASSED');
    const failed = testResults.filter((result) => result.status === 'FAILED');

    console.log('\n=== Auth E2E Test Summary ===');
    for (const result of testResults) {
      const icon = result.status === 'PASSED' ? 'PASS' : 'FAIL';
      console.log(`[${icon}] ${result.scenario}`);
    }
    console.log(
      `Total: ${testResults.length} | Passed: ${passed.length} | Failed: ${failed.length}`,
    );
    console.log('=============================\n');
  });

  it(
    'register parent successfully (201)',
    trackScenario('register parent successfully (201)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: sharedEmail, password: TEST_PASSWORD })
        .expect(201);

      const body = response.body as AuthResponse;

      expect(body).toEqual(
        expect.objectContaining({
          accessToken: expect.any(String),
        }),
      );

      accessToken = body.accessToken;
    }),
  );

  it(
    'login successfully (200)',
    trackScenario('login successfully (200)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: sharedEmail, password: TEST_PASSWORD })
        .expect(200);

      const body = response.body as AuthResponse;

      expect(body).toEqual(
        expect.objectContaining({
          accessToken: expect.any(String),
        }),
      );

      accessToken = body.accessToken;
    }),
  );

  it(
    'get profile with JWT (200)',
    trackScenario('get profile with JWT (200)', async () => {
      const response = await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body as Record<string, unknown>).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          email: sharedEmail,
          createdAt: expect.any(String),
        }),
      );
    }),
  );

  it(
    'register duplicate email (409)',
    trackScenario('register duplicate email (409)', async () => {
      const email = createTestEmail();

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: TEST_PASSWORD })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: TEST_PASSWORD })
        .expect(409);

      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 409,
          message: 'Email already registered',
        }),
      );
    }),
  );

  it(
    'login with wrong password (401)',
    trackScenario('login with wrong password (401)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: sharedEmail, password: 'wrong-password' })
        .expect(401);

      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 401,
          message: 'Invalid credentials',
        }),
      );
    }),
  );

  it(
    'access /me without JWT (401)',
    trackScenario('access /me without JWT (401)', async () => {
      const response = await request(app.getHttpServer())
        .get('/me')
        .expect(401);

      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 401,
        }),
      );
    }),
  );
});
