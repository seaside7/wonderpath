import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { Subject as PrismaSubject } from '../../generated/prisma/client';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PointsService } from '../../src/atlas/points/points.service';
import { TtsService } from '../../src/atlas/tts/tts.service';
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

interface QuestionResponse {
  id: string;
  correctAnswer: string;
}

interface AttemptPoints {
  earned: number;
  balance: number;
  goal: { period: string; target: number; progress: number } | null;
  goalJustReached: boolean;
}

interface AttemptResponse {
  correct: boolean;
  points: AttemptPoints | null;
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
): Promise<ChildResponse> {
  const response = await request(app.getHttpServer())
    .post('/children')
    .set('Authorization', `Bearer ${token}`)
    .send({
      fullName: 'Points Kid',
      nickname: 'Pts',
      dateOfBirth: '2015-03-15',
      gender: 'Girl',
      grade: 'Grade 5',
      curricula: ['IB'],
      preferredLanguage: 'English',
      schoolName: 'WonderPath Elementary',
    })
    .expect(201);
  return response.body as ChildResponse;
}

async function submitAttempt(
  app: INestApplication<App>,
  token: string,
  sessionId: string,
  questionId: string,
  overrides: Record<string, unknown> = {},
): Promise<AttemptResponse> {
  const response = await request(app.getHttpServer())
    .post('/attempts')
    .set('Authorization', `Bearer ${token}`)
    .send({
      learningSessionId: sessionId,
      questionId,
      selectedAnswer: '4',
      timeSpent: 10,
      hintUsed: false,
      perceivedDifficulty: 'Just Right',
      ...overrides,
    })
    .expect(201);
  return response.body as AttemptResponse;
}

describe('Points, goals & rewards (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let points: PointsService;
  let adminToken: string;
  let adminEmail: string;
  let parentOneEmail: string;
  let parentTwoEmail: string;
  let parentOneToken: string;
  let parentTwoToken: string;
  let childId: string;
  let sessionId: string;
  let learningObjectiveId: string;
  let topicId: string;
  let questionId: string;

  beforeAll(async () => {
    jest.spyOn(TtsService.prototype, 'synthesizeAndSave').mockResolvedValue('');
    app = await createTestApp();
    prisma = app.get(PrismaService);
    points = app.get(PointsService);

    adminEmail = createTestEmail('e2e-points-admin');
    await prisma.admin.create({
      data: {
        email: adminEmail,
        password: await argon2.hash(ADMIN_PASSWORD),
      },
    });

    adminToken = await loginAdmin(app, adminEmail);
    parentOneEmail = createTestEmail('e2e-points-parent-one');
    parentOneToken = await registerParent(app, parentOneEmail);
    parentTwoEmail = createTestEmail('e2e-points-parent-two');
    parentTwoToken = await registerParent(app, parentTwoEmail);

    const child = await createChild(app, parentOneToken);
    childId = child.id;

    const subjectArea = await prisma.subjectArea.upsert({
      where: { code: PrismaSubject.MATHEMATICS },
      create: { code: PrismaSubject.MATHEMATICS, name: 'Mathematics' },
      update: {},
    });

    const topic = await prisma.topic.create({
      data: {
        name: `E2E Points ${randomUUID()}`,
        subjectAreaId: subjectArea.id,
        subtopics: {
          create: {
            name: `E2E Points Subtopic ${randomUUID()}`,
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
      include: { subtopics: { include: { learningObjectives: true } } },
    });
    topicId = topic.id;
    learningObjectiveId = topic.subtopics[0].learningObjectives[0].id;

    const session = await request(app.getHttpServer())
      .post('/learning-sessions')
      .set('Authorization', `Bearer ${parentOneToken}`)
      .send({ childId, curriculum: 'IB', subject: 'Mathematics' })
      .expect(201);
    sessionId = (session.body as LearningSessionResponse).id;

    const question = await request(app.getHttpServer())
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
    questionId = (question.body as QuestionResponse).id;
  }, 60000);

  afterAll(async () => {
    await prisma.admin.deleteMany({ where: { email: adminEmail } });
    await prisma.parent.deleteMany({
      where: { email: { in: [parentOneEmail, parentTwoEmail] } },
    });
    if (topicId) {
      await prisma.topic.delete({ where: { id: topicId } });
    }
    await app.close();
    printTestReport('Sprint 22 Test Report', testResults);
  });

  it(
    'Attempt scoring: correct pays, effort pays, rapid guesses pay nothing',
    trackScenario('Attempt scoring rules', async () => {
      // Warm-up: the first correct answer on a fresh objective also crosses
      // the mastery threshold, so it earns 10 base + 50 mastery.
      const warmup = await submitAttempt(
        app,
        parentOneToken,
        sessionId,
        questionId,
        {
          selectedAnswer: '4',
          timeSpent: 10,
        },
      );
      expect(warmup.points?.earned).toBe(60);

      // The warm-up already mastered this objective, so a further correct
      // answer pays the diminished 5 (diminishing returns on grinding).
      const correct = await submitAttempt(
        app,
        parentOneToken,
        sessionId,
        questionId,
        {
          selectedAnswer: '4',
          timeSpent: 10,
        },
      );
      expect(correct.correct).toBe(true);
      expect(correct.points?.earned).toBe(5);

      const rapidCorrect = await submitAttempt(
        app,
        parentOneToken,
        sessionId,
        questionId,
        {
          selectedAnswer: '4',
          timeSpent: 1,
        },
      );
      expect(rapidCorrect.points?.earned).toBe(0);

      const rapidWrong = await submitAttempt(
        app,
        parentOneToken,
        sessionId,
        questionId,
        {
          selectedAnswer: '3',
          timeSpent: 1,
        },
      );
      expect(rapidWrong.points?.earned).toBe(0);

      const effort = await submitAttempt(
        app,
        parentOneToken,
        sessionId,
        questionId,
        {
          selectedAnswer: '3',
          timeSpent: 5,
        },
      );
      expect(effort.correct).toBe(false);
      expect(effort.points?.earned).toBe(2);
    }),
  );

  it(
    'Awarding is idempotent per attempt, session, and mastery crossing',
    trackScenario('Awarding idempotency', async () => {
      const attemptInput = {
        childId,
        questionAttemptId: `idem-attempt-${randomUUID()}`,
        learningSessionId: sessionId,
        learningObjectiveId,
        correct: true,
        timeSpent: 10,
        masteredBefore: false,
        gradeAhead: false,
        masteryCrossed: false,
      };
      const first = await points.awardForAttempt(attemptInput);
      const second = await points.awardForAttempt(attemptInput);
      expect(first.earned).toBe(10);
      expect(second.earned).toBe(0);

      const idemSessionId = `idem-session-${randomUUID()}`;
      const sessionFirst = await points.awardForSession(
        childId,
        idemSessionId,
        6,
      );
      expect(sessionFirst).toBe(20);
      const sessionSecond = await points.awardForSession(
        childId,
        idemSessionId,
        6,
      );
      expect(sessionSecond).toBe(0);
      const shortSession = await points.awardForSession(
        childId,
        `idem-session-short-${randomUUID()}`,
        4,
      );
      expect(shortSession).toBe(0);

      // A fresh objective id: the scoring warm-up above already recorded a
      // MASTERY row for this child+objective, and the unique constraint
      // correctly blocks a second one.
      const masteryInput = {
        ...attemptInput,
        questionAttemptId: `idem-mastery-${randomUUID()}`,
        learningObjectiveId: `idem-lo-${randomUUID()}`,
        masteryCrossed: true,
      };
      const masteryFirst = await points.awardForAttempt(masteryInput);
      expect(masteryFirst.earned).toBe(10 + 50);
      const masterySecond = await points.awardForAttempt(masteryInput);
      // Base is idempotent (same attempt id); only a fresh attempt id would
      // re-award, and the unique mastery constraint still blocks a double.
      expect(masterySecond.earned).toBe(0);
    }),
  );

  it(
    'Daily cap stops awarding at 300 WIB-day points',
    trackScenario('Daily cap', async () => {
      const cappedChild = await createChild(app, parentOneToken);
      const now = new Date();
      let total = 0;
      for (let i = 0; i < 35; i += 1) {
        const result = await points.awardForAttempt(
          {
            childId: cappedChild.id,
            questionAttemptId: `cap-${i}-${randomUUID()}`,
            learningSessionId: sessionId,
            learningObjectiveId,
            correct: true,
            timeSpent: 10,
            masteredBefore: false,
            gradeAhead: false,
            masteryCrossed: false,
          },
          now,
        );
        total += result.earned;
      }
      expect(total).toBe(300);
      const balance = await prisma.pointTransaction.aggregate({
        where: { childId: cappedChild.id },
        _sum: { amount: true },
      });
      expect(balance._sum.amount).toBe(300);
    }),
  );

  it(
    'WIB day boundary resets goal progress (injected clock)',
    trackScenario('WIB period boundary', async () => {
      const boundaryChild = await createChild(app, parentOneToken);
      await request(app.getHttpServer())
        .put(`/children/${boundaryChild.id}/point-goal`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({ period: 'WEEKLY', targetPoints: 100 })
        .expect(200);

      // 23:59 WIB on Mar 10 and 00:01 WIB on Mar 11 (UTC+7).
      const beforeMidnight = new Date('2026-03-10T16:59:00.000Z');
      const afterMidnight = new Date('2026-03-10T17:01:00.000Z');

      const first = await points.awardForAttempt(
        {
          childId: boundaryChild.id,
          questionAttemptId: `wib-1-${randomUUID()}`,
          learningSessionId: sessionId,
          learningObjectiveId,
          correct: true,
          timeSpent: 10,
          masteredBefore: false,
          gradeAhead: false,
          masteryCrossed: false,
        },
        beforeMidnight,
      );
      expect(first.earned).toBe(10);
      expect(first.goal?.progress).toBe(10);

      const second = await points.awardForAttempt(
        {
          childId: boundaryChild.id,
          questionAttemptId: `wib-2-${randomUUID()}`,
          learningSessionId: sessionId,
          learningObjectiveId,
          correct: true,
          timeSpent: 10,
          masteredBefore: false,
          gradeAhead: false,
          masteryCrossed: false,
        },
        afterMidnight,
      );
      expect(second.earned).toBe(10);
      // Both timestamps fall in the same Monday-start week, so the WEEKLY
      // goal accumulates across the midnight line.
      expect(second.goal?.progress).toBe(20);

      // Same check with a DAILY goal proves the day reset.
      await request(app.getHttpServer())
        .put(`/children/${boundaryChild.id}/point-goal`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({ period: 'DAILY', targetPoints: 100 })
        .expect(200);
      // 00:01 WIB on Mar 12: a new WIB day, so only this award counts.
      const nextDay = new Date('2026-03-11T17:01:00.000Z');
      const third = await points.awardForAttempt(
        {
          childId: boundaryChild.id,
          questionAttemptId: `wib-3-${randomUUID()}`,
          learningSessionId: sessionId,
          learningObjectiveId,
          correct: true,
          timeSpent: 10,
          masteredBefore: false,
          gradeAhead: false,
          masteryCrossed: false,
        },
        nextDay,
      );
      expect(third.goal?.progress).toBe(10);
    }),
  );

  it(
    'Goal lifecycle: set replaces, delete clears',
    trackScenario('Goal lifecycle', async () => {
      await request(app.getHttpServer())
        .put(`/children/${childId}/point-goal`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({ period: 'WEEKLY', targetPoints: 500 })
        .expect(200);

      const replaced = await request(app.getHttpServer())
        .put(`/children/${childId}/point-goal`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({ period: 'DAILY', targetPoints: 100 })
        .expect(200);
      expect(replaced.body).toMatchObject({ period: 'DAILY', target: 100 });

      const activeGoals = await prisma.pointGoal.count({
        where: { childId, active: true },
      });
      expect(activeGoals).toBe(1);

      await request(app.getHttpServer())
        .delete(`/children/${childId}/point-goal`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);

      const overview = await request(app.getHttpServer())
        .get(`/children/${childId}/points`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);
      expect(overview.body.goal).toBeNull();

      await request(app.getHttpServer())
        .put(`/children/${childId}/point-goal`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({ period: 'WEEKLY', targetPoints: 0 })
        .expect(400);
    }),
  );

  it(
    'Redemption reserves immediately; decline refunds; re-resolve is 409',
    trackScenario('Redemption reserve and refund', async () => {
      const reward = await request(app.getHttpServer())
        .post(`/children/${childId}/rewards`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({ name: 'Pick the movie', emoji: '🎬', cost: 10 })
        .expect(201);
      const rewardId = (reward.body as { id: string }).id;

      const balanceBefore = (
        await request(app.getHttpServer())
          .get(`/children/${childId}/points`)
          .set('Authorization', `Bearer ${parentOneToken}`)
          .expect(200)
      ).body.balance as number;

      const redemption = await request(app.getHttpServer())
        .post(`/rewards/${rewardId}/redeem`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({ childId })
        .expect(201);
      const redemptionId = (redemption.body as { id: string }).id;
      expect(redemption.body.status).toBe('PENDING');

      const balanceAfterReserve = (
        await request(app.getHttpServer())
          .get(`/children/${childId}/points`)
          .set('Authorization', `Bearer ${parentOneToken}`)
          .expect(200)
      ).body.balance as number;
      expect(balanceAfterReserve).toBe(balanceBefore - 10);

      await request(app.getHttpServer())
        .post(`/redemptions/${redemptionId}/decline`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(201);

      const balanceAfterRefund = (
        await request(app.getHttpServer())
          .get(`/children/${childId}/points`)
          .set('Authorization', `Bearer ${parentOneToken}`)
          .expect(200)
      ).body.balance as number;
      expect(balanceAfterRefund).toBe(balanceBefore);

      await request(app.getHttpServer())
        .post(`/redemptions/${redemptionId}/approve`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(409);
    }),
  );

  it(
    'Concurrent redeems cannot double-spend; approve/decline race yields 409',
    trackScenario('Redemption races', async () => {
      const racer = await createChild(app, parentOneToken);
      await points.awardForAttempt({
        childId: racer.id,
        questionAttemptId: `race-fund-${randomUUID()}`,
        learningSessionId: sessionId,
        learningObjectiveId,
        correct: true,
        timeSpent: 10,
        masteredBefore: false,
        gradeAhead: false,
        masteryCrossed: false,
      });

      const reward = await request(app.getHttpServer())
        .post(`/children/${racer.id}/rewards`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({ name: 'Ice cream', emoji: '🍦', cost: 10 })
        .expect(201);
      const rewardId = (reward.body as { id: string }).id;

      const redeem = () =>
        request(app.getHttpServer())
          .post(`/rewards/${rewardId}/redeem`)
          .set('Authorization', `Bearer ${parentOneToken}`)
          .send({ childId: racer.id });
      const [first, second] = await Promise.all([redeem(), redeem()]);
      const statuses = [first.status, second.status].sort();
      expect(statuses).toEqual([201, 400]);

      const redemptionId = (
        first.status === 201 ? first.body : second.body
      ) as { id: string };
      const resolve = (action: 'approve' | 'decline') =>
        request(app.getHttpServer())
          .post(`/redemptions/${redemptionId.id}/${action}`)
          .set('Authorization', `Bearer ${parentOneToken}`);
      const [approve, decline] = await Promise.all([
        resolve('approve'),
        resolve('decline'),
      ]);
      const resolveStatuses = [approve.status, decline.status].sort();
      expect(resolveStatuses).toEqual([201, 409]);
    }),
  );

  it(
    'Redeeming does not reduce goal progress; insufficient balance is 400',
    trackScenario('Goal progress ignores spending', async () => {
      const saver = await createChild(app, parentOneToken);
      await request(app.getHttpServer())
        .put(`/children/${saver.id}/point-goal`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({ period: 'WEEKLY', targetPoints: 100 })
        .expect(200);

      const award = await points.awardForAttempt({
        childId: saver.id,
        questionAttemptId: `save-fund-${randomUUID()}`,
        learningSessionId: sessionId,
        learningObjectiveId,
        correct: true,
        timeSpent: 10,
        masteredBefore: false,
        gradeAhead: false,
        masteryCrossed: false,
      });
      expect(award.goal?.progress).toBe(10);

      const reward = await request(app.getHttpServer())
        .post(`/children/${saver.id}/rewards`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({ name: 'Park trip', emoji: '🌳', cost: 10 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/rewards/${(reward.body as { id: string }).id}/redeem`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({ childId: saver.id })
        .expect(201);

      const overview = await request(app.getHttpServer())
        .get(`/children/${saver.id}/points`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);
      expect(overview.body.balance).toBe(0);
      expect(overview.body.goal.progress).toBe(10);

      const pricey = await request(app.getHttpServer())
        .post(`/children/${saver.id}/rewards`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({ name: 'Bicycle', emoji: '🚲', cost: 500 })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/rewards/${(pricey.body as { id: string }).id}/redeem`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({ childId: saver.id })
        .expect(400);
    }),
  );

  it(
    'Reward validation and ownership',
    trackScenario('Reward validation and ownership', async () => {
      await request(app.getHttpServer())
        .post(`/children/${childId}/rewards`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({ name: '', emoji: '🎬', cost: 10 })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/children/${childId}/rewards`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({ name: 'X', emoji: '🎬', cost: 0 })
        .expect(400);

      // Missing childId must be rejected, not silently ignored.
      const reward = await request(app.getHttpServer())
        .post(`/children/${childId}/rewards`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({ name: 'Sticker', emoji: '⭐', cost: 5 })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/rewards/${(reward.body as { id: string }).id}/redeem`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({})
        .expect(400);

      await request(app.getHttpServer())
        .get(`/children/${childId}/points`)
        .set('Authorization', `Bearer ${parentTwoToken}`)
        .expect(404);
      await request(app.getHttpServer())
        .get(`/children/${childId}/rewards`)
        .set('Authorization', `Bearer ${parentTwoToken}`)
        .expect(404);
      await request(app.getHttpServer())
        .get(`/children/${childId}/redemptions`)
        .set('Authorization', `Bearer ${parentTwoToken}`)
        .expect(404);
      await request(app.getHttpServer())
        .put(`/children/${childId}/point-goal`)
        .set('Authorization', `Bearer ${parentTwoToken}`)
        .send({ period: 'WEEKLY', targetPoints: 100 })
        .expect(404);
    }),
  );
});
