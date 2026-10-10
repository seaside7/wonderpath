import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { Subject as PrismaSubject } from '../../generated/prisma/client';
import { PrismaService } from '../../src/prisma/prisma.service';
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

interface QuestionResponse {
  id: string;
  questionText: string;
  correctAnswer: string;
}

interface AttemptResponse {
  id: string;
  childId: string;
  learningSessionId: string;
  questionId: string;
  learningObjectiveId: string;
  selectedAnswer: string;
  correct: boolean;
  timeSpent: number;
  hintUsed: boolean;
  perceivedDifficulty: string;
  attemptNumber: number;
  reasonCodes: string[];
  audioUrl: string | null;
  points: {
    earned: number;
    balance: number;
    goal: unknown;
    goalJustReached: boolean;
  } | null;
  createdAt: string;
}

interface MasteryRecord {
  learningObjectiveId: string;
  learningObjectiveName: string;
  masteryScore: number;
  confidenceScore: number;
  totalAttempts: number;
  correctAttempts: number;
  wrongAttempts: number;
  averageResponseTime: number;
  hintUsageCount: number;
  lastPracticedAt: string;
  reviewRecommended: boolean;
  reasonCodes: string[];
}

interface MasteryResponse {
  childId: string;
  mastery: MasteryRecord[];
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
): Promise<LearningSessionResponse> {
  const response = await request(app.getHttpServer())
    .post('/learning-sessions')
    .set('Authorization', `Bearer ${token}`)
    .send({ childId, curriculum: 'IB', subject: 'Mathematics' })
    .expect(201);

  return response.body as LearningSessionResponse;
}

async function createQuestion(
  app: INestApplication<App>,
  adminToken: string,
  learningObjectiveId: string,
  overrides: Record<string, unknown> = {},
): Promise<QuestionResponse> {
  const response = await request(app.getHttpServer())
    .post('/questions')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(createQuestionPayload(learningObjectiveId, overrides))
    .expect(201);

  return response.body as QuestionResponse;
}

describe('Student Model (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let parentOneToken: string;
  let parentTwoToken: string;
  let childId: string;
  let sessionId: string;
  let learningObjectiveId: string;
  let topicId: string;
  let questionOneId: string;
  let questionTwoId: string;
  let audioQuestionId: string;
  let realAudioQuestionId: string;
  let failedAudioQuestionId: string;
  let mockAudioQuestionId: string;
  let adminToken: string;
  let adminEmail: string;
  let parentOneEmail: string;
  let parentTwoEmail: string;
  let synthesizeAudio: jest.SpyInstance;

  beforeAll(async () => {
    synthesizeAudio = jest
      .spyOn(TtsService.prototype, 'synthesizeAndSave')
      .mockResolvedValue('');
    app = await createTestApp();
    prisma = app.get(PrismaService);

    adminEmail = createTestEmail('e2e-sm-admin');
    await prisma.admin.create({
      data: {
        email: adminEmail,
        password: await argon2.hash(ADMIN_PASSWORD),
      },
    });

    adminToken = await loginAdmin(app, adminEmail);
    parentOneEmail = createTestEmail('e2e-sm-parent-one');
    parentOneToken = await registerParent(app, parentOneEmail);
    parentTwoEmail = createTestEmail('e2e-sm-parent-two');
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
        name: `E2E Fractions ${randomUUID()}`,
        subjectAreaId: subjectArea.id,
        subtopics: {
          create: {
            name: `E2E Equivalent Fractions ${randomUUID()}`,
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

    const session = await startSession(app, parentOneToken, childId);
    sessionId = session.id;

    const questionOne = await createQuestion(
      app,
      adminToken,
      learningObjectiveId,
      {
        questionText: 'What is 2 + 2?',
        options: ['3', '4', '5'],
        correctAnswer: '4',
      },
    );
    questionOneId = questionOne.id;

    const questionTwo = await createQuestion(
      app,
      adminToken,
      learningObjectiveId,
      {
        questionText: 'What is 3 + 4?',
        options: ['6', '7', '8'],
        correctAnswer: '7',
      },
    );
    questionTwoId = questionTwo.id;

    const audioQuestion = await createQuestion(
      app,
      adminToken,
      learningObjectiveId,
      { explanation: 'This explanation should be spoken by Atlas.' },
    );
    audioQuestionId = audioQuestion.id;

    const realAudioQuestion = await createQuestion(
      app,
      adminToken,
      learningObjectiveId,
      { explanation: 'This local answer uses real Atlas speech audio.' },
    );
    realAudioQuestionId = realAudioQuestion.id;

    const failedAudioQuestion = await createQuestion(
      app,
      adminToken,
      learningObjectiveId,
      { explanation: 'A TTS failure must not block this attempt.' },
    );
    failedAudioQuestionId = failedAudioQuestion.id;

    const mockAudioQuestion = await createQuestion(
      app,
      adminToken,
      learningObjectiveId,
      { explanation: 'Mock TTS has no audio to return.' },
    );
    mockAudioQuestionId = mockAudioQuestion.id;
  });

  afterAll(async () => {
    await prisma.admin.deleteMany({ where: { email: adminEmail } });
    await prisma.parent.deleteMany({
      where: { email: { in: [parentOneEmail, parentTwoEmail] } },
    });

    if (topicId) {
      await prisma.topic.delete({ where: { id: topicId } });
    }

    await app.close();
    synthesizeAudio.mockRestore();
    printTestReport('Sprint 05 Test Report', testResults);
  });

  it(
    'Record Attempt',
    trackScenario('Record Attempt', async () => {
      const response = await request(app.getHttpServer())
        .post('/attempts')
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({
          learningSessionId: sessionId,
          questionId: questionOneId,
          selectedAnswer: '4',
          timeSpent: 8,
          hintUsed: false,
          perceivedDifficulty: 'Just Right',
        })
        .expect(201);

      const body = response.body as AttemptResponse;

      expect(body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          childId,
          learningSessionId: sessionId,
          questionId: questionOneId,
          learningObjectiveId,
          selectedAnswer: '4',
          correct: true,
          timeSpent: 8,
          hintUsed: false,
          perceivedDifficulty: 'Just Right',
          attemptNumber: 1,
          createdAt: expect.any(String),
        }),
      );
      expect(body.reasonCodes).toEqual(
        expect.arrayContaining(['CORRECT_ANSWER', 'FAST_RESPONSE']),
      );
      expect(body.reasonCodes).not.toContain('WRONG_ANSWER');
      expect(body.points).toEqual(
        expect.objectContaining({
          earned: expect.any(Number),
          balance: expect.any(Number),
        }),
      );
    }),
  );

  it(
    'Multiple Attempts',
    trackScenario('Multiple Attempts', async () => {
      const response = await request(app.getHttpServer())
        .post('/attempts')
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({
          learningSessionId: sessionId,
          questionId: questionTwoId,
          selectedAnswer: '7',
          timeSpent: 8,
          hintUsed: false,
          perceivedDifficulty: 'Just Right',
        })
        .expect(201);

      const body = response.body as AttemptResponse;

      expect(body).toEqual(
        expect.objectContaining({
          correct: true,
          attemptNumber: 2,
        }),
      );

      const masteryResponse = await request(app.getHttpServer())
        .get(`/children/${childId}/mastery`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);

      const masteryBody = masteryResponse.body as MasteryResponse;
      const record = masteryBody.mastery.find(
        (entry) => entry.learningObjectiveId === learningObjectiveId,
      );

      expect(record).toEqual(
        expect.objectContaining({
          totalAttempts: 2,
          correctAttempts: 2,
          wrongAttempts: 0,
          confidenceScore: 40,
        }),
      );
    }),
  );

  it(
    'Mastery Calculation',
    trackScenario('Mastery Calculation', async () => {
      const response = await request(app.getHttpServer())
        .post('/attempts')
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({
          learningSessionId: sessionId,
          questionId: questionOneId,
          selectedAnswer: '5',
          timeSpent: 15,
          hintUsed: false,
          perceivedDifficulty: 'Just Right',
        })
        .expect(201);

      const body = response.body as AttemptResponse;

      expect(body).toEqual(
        expect.objectContaining({
          correct: false,
          attemptNumber: 3,
        }),
      );
      expect(body.reasonCodes).toContain('WRONG_ANSWER');

      const masteryResponse = await request(app.getHttpServer())
        .get(`/children/${childId}/mastery`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);

      const masteryBody = masteryResponse.body as MasteryResponse;
      const record = masteryBody.mastery.find(
        (entry) => entry.learningObjectiveId === learningObjectiveId,
      );

      expect(record).toEqual(
        expect.objectContaining({
          masteryScore: 67,
          confidenceScore: 60,
          totalAttempts: 3,
          correctAttempts: 2,
          wrongAttempts: 1,
          hintUsageCount: 0,
          reviewRecommended: false,
        }),
      );
      expect(record?.averageResponseTime).toBeCloseTo(31 / 3, 1);
    }),
  );

  it(
    'Update Mastery',
    trackScenario('Update Mastery', async () => {
      const response = await request(app.getHttpServer())
        .post('/attempts')
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({
          learningSessionId: sessionId,
          questionId: questionTwoId,
          selectedAnswer: '9',
          timeSpent: 40,
          hintUsed: true,
          perceivedDifficulty: 'Easy',
        })
        .expect(201);

      const body = response.body as AttemptResponse;

      expect(body).toEqual(
        expect.objectContaining({
          correct: false,
          hintUsed: true,
          timeSpent: 40,
          attemptNumber: 4,
        }),
      );
      expect(body.reasonCodes).toEqual(
        expect.arrayContaining(['WRONG_ANSWER', 'SLOW_RESPONSE', 'HINT_USED']),
      );

      const masteryResponse = await request(app.getHttpServer())
        .get(`/children/${childId}/mastery`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);

      const masteryBody = masteryResponse.body as MasteryResponse;
      const record = masteryBody.mastery.find(
        (entry) => entry.learningObjectiveId === learningObjectiveId,
      );

      expect(record).toEqual(
        expect.objectContaining({
          masteryScore: 50,
          confidenceScore: 80,
          totalAttempts: 4,
          correctAttempts: 2,
          wrongAttempts: 2,
          hintUsageCount: 1,
          reviewRecommended: true,
        }),
      );
      expect(record?.averageResponseTime).toBeCloseTo(71 / 4, 1);
      expect(record?.reasonCodes).toContain('LOW_MASTERY');
    }),
  );

  it(
    'Read Mastery',
    trackScenario('Read Mastery', async () => {
      const response = await request(app.getHttpServer())
        .get(`/children/${childId}/mastery`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(200);

      const body = response.body as MasteryResponse;

      expect(body.childId).toBe(childId);
      expect(body.mastery).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            learningObjectiveId,
            learningObjectiveName: 'Add whole numbers',
            lastPracticedAt: expect.any(String),
          }),
        ]),
      );
    }),
  );

  it(
    'Parent Authorization',
    trackScenario('Parent Authorization', async () => {
      await request(app.getHttpServer())
        .post('/attempts')
        .send({
          learningSessionId: sessionId,
          questionId: questionOneId,
          selectedAnswer: '4',
          timeSpent: 5,
          hintUsed: false,
          perceivedDifficulty: 'Easy',
        })
        .expect(401);

      await request(app.getHttpServer())
        .get(`/children/${childId}/mastery`)
        .expect(401);
    }),
  );

  it(
    'Wrong-Parent Rejection',
    trackScenario('Wrong-Parent Rejection', async () => {
      await request(app.getHttpServer())
        .post('/attempts')
        .set('Authorization', `Bearer ${parentTwoToken}`)
        .send({
          learningSessionId: sessionId,
          questionId: questionOneId,
          selectedAnswer: '4',
          timeSpent: 5,
          hintUsed: false,
          perceivedDifficulty: 'Easy',
        })
        .expect(404);

      await request(app.getHttpServer())
        .get(`/children/${childId}/mastery`)
        .set('Authorization', `Bearer ${parentTwoToken}`)
        .expect(404);
    }),
  );

  it(
    'Generate explanation audio once and reuse the cached file',
    trackScenario(
      'Generate explanation audio once and reuse the cached file',
      async () => {
        synthesizeAudio.mockReset().mockResolvedValue(`${audioQuestionId}.mp3`);

        try {
          const firstResponse = await request(app.getHttpServer())
            .post('/attempts')
            .set('Authorization', `Bearer ${parentOneToken}`)
            .send({
              learningSessionId: sessionId,
              questionId: audioQuestionId,
              selectedAnswer: '4',
              timeSpent: 8,
              hintUsed: false,
              perceivedDifficulty: 'Just Right',
            })
            .expect(201);

          const first = firstResponse.body as AttemptResponse;
          expect(first.audioUrl).toBe(`/tts/${audioQuestionId}.mp3`);
          expect(synthesizeAudio).toHaveBeenCalledTimes(1);
          expect(synthesizeAudio).toHaveBeenCalledWith(
            audioQuestionId,
            'This explanation should be spoken by Atlas.',
          );

          const savedQuestion = await prisma.question.findUniqueOrThrow({
            where: { id: audioQuestionId },
            select: { audioUrl: true },
          });
          expect(savedQuestion.audioUrl).toBe(first.audioUrl);

          const secondResponse = await request(app.getHttpServer())
            .post('/attempts')
            .set('Authorization', `Bearer ${parentOneToken}`)
            .send({
              learningSessionId: sessionId,
              questionId: audioQuestionId,
              selectedAnswer: '4',
              timeSpent: 8,
              hintUsed: false,
              perceivedDifficulty: 'Just Right',
            })
            .expect(201);

          expect((secondResponse.body as AttemptResponse).audioUrl).toBe(
            first.audioUrl,
          );
          expect(synthesizeAudio).toHaveBeenCalledTimes(1);
        } finally {
          synthesizeAudio.mockReset().mockResolvedValue('');
        }
      },
    ),
  );

  it(
    'TTS failure does not fail the recorded attempt',
    trackScenario(
      'TTS failure does not fail the recorded attempt',
      async () => {
        synthesizeAudio
          .mockReset()
          .mockRejectedValueOnce(new Error('TTS unavailable'));

        try {
          const response = await request(app.getHttpServer())
            .post('/attempts')
            .set('Authorization', `Bearer ${parentOneToken}`)
            .send({
              learningSessionId: sessionId,
              questionId: failedAudioQuestionId,
              selectedAnswer: '4',
              timeSpent: 8,
              hintUsed: false,
              perceivedDifficulty: 'Just Right',
            })
            .expect(201);

          expect((response.body as AttemptResponse).audioUrl).toBeNull();
          expect(
            await prisma.question.findUniqueOrThrow({
              where: { id: failedAudioQuestionId },
              select: { audioUrl: true },
            }),
          ).toEqual({ audioUrl: null });
        } finally {
          synthesizeAudio.mockReset().mockResolvedValue('');
        }
      },
    ),
  );

  it(
    'Mock TTS leaves audioUrl null without failing the attempt',
    trackScenario(
      'Mock TTS leaves audioUrl null without failing the attempt',
      async () => {
        synthesizeAudio.mockReset().mockResolvedValueOnce('');

        try {
          const response = await request(app.getHttpServer())
            .post('/attempts')
            .set('Authorization', `Bearer ${parentOneToken}`)
            .send({
              learningSessionId: sessionId,
              questionId: mockAudioQuestionId,
              selectedAnswer: '4',
              timeSpent: 8,
              hintUsed: false,
              perceivedDifficulty: 'Just Right',
            })
            .expect(201);

          expect((response.body as AttemptResponse).audioUrl).toBeNull();
          expect(synthesizeAudio).toHaveBeenCalledTimes(1);
        } finally {
          synthesizeAudio.mockReset().mockResolvedValue('');
        }
      },
    ),
  );

  const realTtsE2e = process.env.RUN_REAL_TTS_E2E === '1' ? it : it.skip;
  realTtsE2e(
    'Real TTS writes a playable MP3 and reuses it on a second answer',
    trackScenario(
      'Real TTS writes a playable MP3 and reuses it on a second answer',
      async () => {
        synthesizeAudio.mockRestore();
        const realSynthesis = jest.spyOn(
          app.get(TtsService),
          'synthesizeAndSave',
        );

        try {
          const payload = {
            learningSessionId: sessionId,
            questionId: realAudioQuestionId,
            selectedAnswer: '4',
            timeSpent: 8,
            hintUsed: false,
            perceivedDifficulty: 'Just Right',
          };
          const first = await request(app.getHttpServer())
            .post('/attempts')
            .set('Authorization', `Bearer ${parentOneToken}`)
            .send(payload)
            .expect(201);

          const firstBody = first.body as AttemptResponse;
          const expectedUrl = `/tts/${realAudioQuestionId}.mp3`;
          expect(firstBody.audioUrl).toBe(expectedUrl);
          expect(realSynthesis).toHaveBeenCalledTimes(1);

          const audioPath = join(
            process.cwd(),
            process.env.TTS_UPLOADS_DIR ?? 'uploads/tts',
            `${realAudioQuestionId}.mp3`,
          );
          const beforeSecondAnswer = await stat(audioPath);
          expect(beforeSecondAnswer.size).toBeGreaterThan(0);

          const second = await request(app.getHttpServer())
            .post('/attempts')
            .set('Authorization', `Bearer ${parentOneToken}`)
            .send(payload)
            .expect(201);

          expect((second.body as AttemptResponse).audioUrl).toBe(expectedUrl);
          expect(realSynthesis).toHaveBeenCalledTimes(1);
          const afterSecondAnswer = await stat(audioPath);
          expect(afterSecondAnswer.mtimeMs).toBe(beforeSecondAnswer.mtimeMs);
        } finally {
          realSynthesis.mockRestore();
          synthesizeAudio = jest
            .spyOn(TtsService.prototype, 'synthesizeAndSave')
            .mockResolvedValue('');
        }
      },
    ),
  );

  it(
    'Goal and redemption reserve/refund flow',
    trackScenario('Goal and redemption reserve/refund flow', async () => {
      await request(app.getHttpServer())
        .put(`/children/${childId}/point-goal`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({ period: 'WEEKLY', targetPoints: 100 })
        .expect(200);

      const reward = await request(app.getHttpServer())
        .post(`/children/${childId}/rewards`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({ name: 'Pick the movie', emoji: '🎬', cost: 10 })
        .expect(201);

      const rewardId = (reward.body as { id: string }).id;
      const redemption = await request(app.getHttpServer())
        .post(`/rewards/${rewardId}/redeem`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .send({ childId })
        .expect(201);

      const redemptionId = (redemption.body as { id: string }).id;
      const balanceAfterReserve = (
        await request(app.getHttpServer())
          .get(`/children/${childId}/points`)
          .set('Authorization', `Bearer ${parentOneToken}`)
          .expect(200)
      ).body.balance as number;

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
      expect(balanceAfterRefund).toBe(balanceAfterReserve + 10);

      await request(app.getHttpServer())
        .post(`/redemptions/${redemptionId}/approve`)
        .set('Authorization', `Bearer ${parentOneToken}`)
        .expect(409);
    }),
  );
});
