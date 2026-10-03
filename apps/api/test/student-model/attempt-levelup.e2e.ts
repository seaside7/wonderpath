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

interface AttemptResponse {
  id: string;
  correct: boolean;
  levelUp: { subject: string; newLevel: number } | null;
}

const testResults: TestResult[] = [];
const trackScenario = createScenarioTracker(testResults);

function createTestEmail(prefix: string): string {
  return `${prefix}-${randomUUID()}@${TEST_EMAIL_DOMAIN}`;
}

function createChildPayload(fullName: string) {
  return {
    fullName,
    nickname: 'Em',
    dateOfBirth: '2015-03-15',
    gender: 'Girl',
    grade: 'Grade 5',
    curricula: ['IB', 'Nasional'],
    preferredLanguage: 'English',
    schoolName: 'WonderPath Elementary',
  };
}

describe('Attempt Level-Up Signal (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let parentToken: string;
  let parentEmail: string;
  let adminEmail: string;
  let topicId: string;
  let questionId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    adminEmail = createTestEmail('e2e-levelup-admin');
    await prisma.admin.create({
      data: {
        email: adminEmail,
        password: await argon2.hash(ADMIN_PASSWORD),
      },
    });
    const adminLogin = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ email: adminEmail, password: ADMIN_PASSWORD })
      .expect(200);
    const adminToken = (adminLogin.body as AuthResponse).accessToken;

    parentEmail = createTestEmail('e2e-levelup-parent');
    parentToken = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: parentEmail, password: TEST_PASSWORD })
      .expect(201)
      .then((res) => (res.body as AuthResponse).accessToken);

    const subjectArea = await prisma.subjectArea.upsert({
      where: { code: PrismaSubject.MATHEMATICS },
      create: { code: PrismaSubject.MATHEMATICS, name: 'Mathematics' },
      update: {},
    });

    const topic = await prisma.topic.create({
      data: {
        name: `E2E LevelUp ${randomUUID()}`,
        subjectAreaId: subjectArea.id,
        subtopics: {
          create: {
            name: `E2E LevelUp Subtopic ${randomUUID()}`,
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
        subtopics: { include: { learningObjectives: true } },
      },
    });
    topicId = topic.id;
    const learningObjectiveId = topic.subtopics[0].learningObjectives[0].id;

    const created = await request(app.getHttpServer())
      .post('/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        questionText: 'What is 2 + 2?',
        questionType: 'Multiple Choice',
        options: ['3', '4', '5'],
        correctAnswer: '4',
        explanation: 'Two plus two equals four.',
        learningObjectiveId,
        curriculum: 'IB',
        grade: 'Grade 5',
        difficulty: 2,
      })
      .expect(201);
    questionId = (created.body as { id: string }).id;
  });

  afterAll(async () => {
    await prisma.admin.deleteMany({ where: { email: adminEmail } });
    await prisma.parent.deleteMany({ where: { email: parentEmail } });
    if (topicId) {
      await prisma.topic.delete({ where: { id: topicId } });
    }
    await app.close();

    printTestReport('Sprint 21 Test Report', testResults);
  });

  async function createChild(fullName: string): Promise<ChildResponse> {
    const response = await request(app.getHttpServer())
      .post('/children')
      .set('Authorization', `Bearer ${parentToken}`)
      .send(createChildPayload(fullName))
      .expect(201);
    return response.body as ChildResponse;
  }

  async function startSession(childId: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/learning-sessions')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childId, curriculum: 'IB', subject: 'Mathematics' })
      .expect(201);
    return (response.body as { id: string }).id;
  }

  async function answer(
    sessionId: string,
    selectedAnswer: string,
    timeSpent: number,
    perceivedDifficulty: string,
  ): Promise<AttemptResponse> {
    const response = await request(app.getHttpServer())
      .post('/attempts')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        learningSessionId: sessionId,
        questionId,
        selectedAnswer,
        timeSpent,
        hintUsed: false,
        perceivedDifficulty,
      })
      .expect(201);
    return response.body as AttemptResponse;
  }

  it(
    'Surfaces levelUp when fast success raises the difficulty',
    trackScenario('Level-up surfaced in attempt response', async () => {
      const child = await createChild('Level Up Lena');
      const sessionId = await startSession(child.id);

      const seen: Array<{ subject: string; newLevel: number } | null> = [];
      for (let i = 0; i < 4; i += 1) {
        const attempt = await answer(sessionId, '4', 5, 'Easy');
        expect(attempt.correct).toBe(true);
        seen.push(attempt.levelUp);
      }

      expect(seen[0]).toBeNull();
      expect(seen[1]).toBeNull();
      expect(seen[2]).toBeNull();
      expect(seen[3]).toEqual({ subject: 'Mathematics', newLevel: 4 });
    }),
  );

  it(
    'Keeps a difficulty decrease invisible in attempt responses',
    trackScenario('Level-down stays invisible', async () => {
      const child = await createChild('Level Down Liam');
      const sessionId = await startSession(child.id);

      for (let i = 0; i < 6; i += 1) {
        const attempt = await answer(sessionId, '3', 35, 'Difficult');
        expect(attempt.correct).toBe(false);
        expect(attempt.levelUp).toBeNull();
      }

      // The decreases still happened (3 -> 2 -> 1 across the attempts past
      // the struggle threshold) - they just were never narrated.
      const difficulty = await request(app.getHttpServer())
        .get(`/children/${child.id}/adaptive-difficulty`)
        .query({ subject: 'Mathematics' })
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      expect(
        (difficulty.body as { currentDifficulty: number }).currentDifficulty,
      ).toBe(1);
    }),
  );
});
