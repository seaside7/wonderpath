import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
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

interface AuthResponse {
  accessToken: string;
}

interface ChildResponse {
  id: string;
}

interface ExamPrepPlanResponse {
  id: string;
  child: { id: string; fullName: string };
  subject: string;
  curriculum: string;
  context: string;
  examDate: string | null;
  status: string;
  materials: ExamMaterialResponse[];
  topics: ExamTopicResponse[];
}

interface ExamMaterialResponse {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  materialType: string;
  extractionStatus: string;
  extractedText: string | null;
  errorMessage: string | null;
}

interface ExamTopicResponse {
  id: string;
  label: string;
  confidence: number;
  status: string;
  source: string;
  learningObjectiveId: string | null;
  learningObjectiveName: string | null;
}

interface PriorityPlanResponse {
  id: string;
  child: { id: string; fullName: string };
  subject: string;
  curriculum: string;
  items: Array<{
    position: number;
    label: string;
    confidence: number;
    mappedToLearningGraph: boolean;
    learningObjectiveId: string | null;
    masteryScore: number | null;
    priority: number;
  }>;
}

const testResults: TestResult[] = [];
const trackScenario = createScenarioTracker(testResults);

function createTestEmail(prefix: string): string {
  return `${prefix}-${randomUUID()}@${TEST_EMAIL_DOMAIN}`;
}

function createChildPayload(overrides: Record<string, unknown> = {}) {
  return {
    fullName: 'Leo Pratama',
    nickname: 'Leo',
    dateOfBirth: '2014-06-15',
    gender: 'Boy',
    grade: 'Grade 6',
    curricula: ['IB'],
    preferredLanguage: 'English',
    schoolName: 'WonderPath Elementary',
    ...overrides,
  };
}

const PDF_DATA = Buffer.from('mock pdf bytes for atlas exam review sheet');
const PHOTO_DATA = Buffer.from('mock png bytes representing a worksheet photo');

describe('AI Exam Assistant (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let parentToken: string;
  let secondParentToken: string;
  let childId: string;
  let secondChildId: string;
  let fractionsObjectiveId: string;
  let decimalsObjectiveId: string;
  let geometryObjectiveId: string;
  let topicId: string;
  let planId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const registerParent = async (prefix: string) => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: createTestEmail(prefix),
          password: TEST_PASSWORD,
        })
        .expect(201);

      return (response.body as AuthResponse).accessToken;
    };

    parentToken = await registerParent('e2e-exam-parent');
    secondParentToken = await registerParent('e2e-exam-parent2');

    const createChild = async (token: string) => {
      const response = await request(app.getHttpServer())
        .post('/children')
        .set('Authorization', `Bearer ${token}`)
        .send(createChildPayload())
        .expect(201);

      return response.body as ChildResponse;
    };

    const firstChild = await createChild(parentToken);
    childId = firstChild.id;
    const secondChild = await createChild(secondParentToken);
    secondChildId = secondChild.id;

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
        name: `E2E Exam Prep ${randomUUID()}`,
        subjectAreaId: subjectArea.id,
        subtopics: {
          create: {
            name: `E2E Exam Prep Subtopic ${randomUUID()}`,
            learningObjectives: {
              create: [
                {
                  name: 'Understand Fractions',
                  description: 'Understand fraction concepts',
                  estimatedMasteryTime: 30,
                },
                {
                  name: 'Understand Decimals',
                  description: 'Understand decimal place value',
                  estimatedMasteryTime: 30,
                },
                {
                  name: 'Understand Geometry',
                  description: 'Understand basic geometry shapes',
                  estimatedMasteryTime: 30,
                },
                {
                  name: 'Understand Addition',
                  description: 'Understand addition up to 100',
                  estimatedMasteryTime: 20,
                },
              ],
            },
          },
        },
      },
      include: { subtopics: { include: { learningObjectives: true } } },
    });

    topicId = topic.id;
    const objectives = topic.subtopics[0].learningObjectives;
    fractionsObjectiveId = objectives[0].id;
    decimalsObjectiveId = objectives[1].id;
    geometryObjectiveId = objectives[2].id;

    const seedMastery = async (
      learningObjectiveId: string,
      masteryScore: number,
    ) => {
      await prisma.studentMastery.create({
        data: {
          childId,
          learningObjectiveId,
          masteryScore,
          confidenceScore: 70,
          totalAttempts: 10,
          correctAttempts: Math.round((masteryScore / 100) * 10),
          wrongAttempts: 10 - Math.round((masteryScore / 100) * 10),
          averageResponseTime: 12000,
          hintCount: 1,
          lastPracticedAt: new Date(),
          reviewRecommended: masteryScore < 70,
          reasonCodes: [],
        },
      });
    };

    await seedMastery(fractionsObjectiveId, 92);
    await seedMastery(decimalsObjectiveId, 61);
    await seedMastery(geometryObjectiveId, 78);
  });

  afterAll(async () => {
    await prisma.parent.deleteMany({
      where: { email: { endsWith: `@${TEST_EMAIL_DOMAIN}` } },
    });

    if (topicId) {
      await prisma.topic.delete({ where: { id: topicId } });
    }

    await app.close();
    printTestReport('Sprint 11 Test Report', testResults);
  });

  it(
    'Creates an exam prep plan from subject selection',
    trackScenario('Exam context creation', async () => {
      const response = await request(app.getHttpServer())
        .post('/exam-prep')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ childId, curriculum: 'IB', subject: 'Mathematics' })
        .expect(201);

      const plan = response.body as ExamPrepPlanResponse;
      planId = plan.id;

      expect(plan).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          subject: 'Mathematics',
          curriculum: 'IB',
          context: 'Exam Tomorrow',
          examDate: null,
          status: 'Planning',
          materials: [],
          topics: [],
        }),
      );
    }),
  );

  it(
    'Accepts a PDF upload and extracts exam topics',
    trackScenario('PDF upload and extraction', async () => {
      const response = await request(app.getHttpServer())
        .post(`/exam-prep/${planId}/materials`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          fileName: 'study-notes.pdf',
          mimeType: 'application/pdf',
          fileSize: PDF_DATA.length,
          dataBase64: PDF_DATA.toString('base64'),
        })
        .expect(201);

      const material = response.body as ExamMaterialResponse;

      expect(material).toEqual(
        expect.objectContaining({
          fileName: 'study-notes.pdf',
          mimeType: 'application/pdf',
          materialType: 'Pdf',
          extractionStatus: 'Extracted',
          errorMessage: null,
        }),
      );
      expect(material.extractedText).toContain('study-notes.pdf');

      const plan = await request(app.getHttpServer())
        .get(`/exam-prep/${planId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      const planBody = plan.body as ExamPrepPlanResponse;
      const labels = planBody.topics.map((topic) => topic.label);

      expect(labels).toEqual(['Fractions', 'Decimals', 'Geometry']);
      expect(
        planBody.topics.find((topic) => topic.label === 'Fractions'),
      ).toEqual(
        expect.objectContaining({
          confidence: 0.92,
          status: 'Candidate',
          source: 'mock-extractor',
          learningObjectiveId: fractionsObjectiveId,
          learningObjectiveName: 'Understand Fractions',
        }),
      );
    }),
  );

  it(
    'Accepts a photo upload without duplicating topics',
    trackScenario('Photo upload and deduping', async () => {
      const response = await request(app.getHttpServer())
        .post(`/exam-prep/${planId}/materials`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          fileName: 'worksheet-answer.png',
          mimeType: 'image/png',
          fileSize: PHOTO_DATA.length,
          dataBase64: PHOTO_DATA.toString('base64'),
        })
        .expect(201);

      const material = response.body as ExamMaterialResponse;

      expect(material).toEqual(
        expect.objectContaining({
          materialType: 'Photo',
          extractionStatus: 'Extracted',
        }),
      );

      const plan = await request(app.getHttpServer())
        .get(`/exam-prep/${planId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      const planBody = plan.body as ExamPrepPlanResponse;

      expect(planBody.materials).toHaveLength(2);
      expect(planBody.topics).toHaveLength(3);
    }),
  );

  it(
    'Marks extraction failures on corrupt files',
    trackScenario('Extraction failure handling', async () => {
      const corruptData = Buffer.from('garbage bytes');
      const response = await request(app.getHttpServer())
        .post(`/exam-prep/${planId}/materials`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          fileName: 'corrupt-review.pdf',
          mimeType: 'application/pdf',
          fileSize: corruptData.length,
          dataBase64: corruptData.toString('base64'),
        })
        .expect(201);

      const material = response.body as ExamMaterialResponse;

      expect(material).toEqual(
        expect.objectContaining({
          extractionStatus: 'Failed',
        }),
      );
      expect(material.errorMessage).toContain('unreadable');

      const plan = await request(app.getHttpServer())
        .get(`/exam-prep/${planId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      const planBody = plan.body as ExamPrepPlanResponse;

      expect(planBody.topics).toHaveLength(3);
    }),
  );

  it(
    'Builds a priority plan from extracted topics and mastery',
    trackScenario('Priority plan from student model', async () => {
      const response = await request(app.getHttpServer())
        .get(`/exam-prep/${planId}/plan`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      const body = response.body as PriorityPlanResponse;

      expect(body.subject).toBe('Mathematics');
      expect(body.curriculum).toBe('IB');

      const priorities = body.items.map((item) => ({
        label: item.label,
        priority: item.priority,
        masteryScore: item.masteryScore,
        position: item.position,
      }));

      expect(priorities).toEqual([
        {
          label: 'Decimals',
          priority: 1,
          masteryScore: 61,
          position: 2,
        },
        {
          label: 'Geometry',
          priority: 2,
          masteryScore: 78,
          position: 3,
        },
        {
          label: 'Fractions',
          priority: 3,
          masteryScore: 92,
          position: 1,
        },
      ]);
    }),
  );

  it(
    'Lets the parent confirm or reject extracted topics',
    trackScenario('Parent correction of topics', async () => {
      const plan = await request(app.getHttpServer())
        .get(`/exam-prep/${planId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      const planBody = plan.body as ExamPrepPlanResponse;
      const decimalsTopic = planBody.topics.find(
        (topic) => topic.label === 'Decimals',
      );
      const fractionsTopic = planBody.topics.find(
        (topic) => topic.label === 'Fractions',
      );

      await request(app.getHttpServer())
        .patch(`/exam-prep/${planId}/topics/${decimalsTopic.id}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ action: 'confirm' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/exam-prep/${planId}/topics/${fractionsTopic.id}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ action: 'reject' })
        .expect(200);

      const planAfter = await request(app.getHttpServer())
        .get(`/exam-prep/${planId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      const planAfterBody = planAfter.body as ExamPrepPlanResponse;

      expect(
        planAfterBody.topics.find((topic) => topic.label === 'Decimals').status,
      ).toBe('Confirmed');
      expect(
        planAfterBody.topics.find((topic) => topic.label === 'Fractions')
          .status,
      ).toBe('Rejected');

      const priority = await request(app.getHttpServer())
        .get(`/exam-prep/${planId}/plan`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      const priorityBody = priority.body as PriorityPlanResponse;

      expect(priorityBody.items.map((item) => item.label)).toEqual([
        'Decimals',
        'Geometry',
      ]);
    }),
  );

  it(
    'Rejects invalid files and size mismatches',
    trackScenario('File validation', async () => {
      await request(app.getHttpServer())
        .post(`/exam-prep/${planId}/materials`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          fileName: 'notes.txt',
          mimeType: 'text/plain',
          fileSize: 100,
          dataBase64: Buffer.from('hello').toString('base64'),
        })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/exam-prep/${planId}/materials`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          fileName: 'notes.pdf',
          mimeType: 'application/pdf',
          fileSize: 999,
          dataBase64: PDF_DATA.toString('base64'),
        })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/exam-prep/${planId}/materials`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          fileName: 'big.pdf',
          mimeType: 'application/pdf',
          fileSize: 5 * 1024 * 1024 + 1,
          dataBase64: Buffer.from('x').toString('base64'),
        })
        .expect(400);
    }),
  );

  it(
    'Enforces parent ownership on exam prep plans',
    trackScenario('Authorization and ownership', async () => {
      await request(app.getHttpServer())
        .get(`/exam-prep/${planId}`)
        .expect(401);

      await request(app.getHttpServer())
        .get(`/exam-prep/${planId}`)
        .set('Authorization', `Bearer ${secondParentToken}`)
        .expect(404);

      await request(app.getHttpServer())
        .post(`/exam-prep/${planId}/materials`)
        .set('Authorization', `Bearer ${secondParentToken}`)
        .send({
          fileName: 'notes.pdf',
          mimeType: 'application/pdf',
          fileSize: PDF_DATA.length,
          dataBase64: PDF_DATA.toString('base64'),
        })
        .expect(404);

      await request(app.getHttpServer())
        .post('/exam-prep')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          childId: secondChildId,
          curriculum: 'IB',
          subject: 'Mathematics',
        })
        .expect(404);
    }),
  );
});
