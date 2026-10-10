import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import {
  Curriculum,
  Gender,
  Grade,
  PreferredLanguage,
  PrismaClient,
  QuestionType,
  Subject,
} from '../generated/prisma/client';

const prisma = new PrismaClient();

async function main() {
  const mode = process.argv[2];

  if (mode === 'cleanup') {
    const parentId = process.argv[3];
    const topicId = process.argv[4];
    await prisma.parent.deleteMany({ where: { id: parentId } });
    await prisma.topic.deleteMany({ where: { id: topicId } });
    console.log('Fixture records cleaned up.');
    return;
  }

  const email = `tts-browser-${randomUUID()}@wonderpath.test`;
  const password = 'BrowserTtsSmoke2026!';
  const parent = await prisma.parent.create({
    data: { email, password: await argon2.hash(password) },
  });
  const child = await prisma.child.create({
    data: {
      parentId: parent.id,
      fullName: 'Atlas Audio Check',
      nickname: 'Audio Check',
      dateOfBirth: new Date('2015-05-14'),
      gender: Gender.GIRL,
      grade: Grade.GRADE_5,
      curricula: [Curriculum.IB],
      preferredLanguage: PreferredLanguage.ENGLISH,
    },
  });
  const subjectArea = await prisma.subjectArea.upsert({
    where: { code: Subject.MATHEMATICS },
    create: { code: Subject.MATHEMATICS, name: 'Mathematics' },
    update: {},
  });
  const topic = await prisma.topic.create({
    data: {
      name: `Atlas audio check ${randomUUID()}`,
      subjectAreaId: subjectArea.id,
      subtopics: {
        create: {
          name: 'Audio verification',
          learningObjectives: {
            create: {
              name: 'Add single-digit numbers',
              description: 'Add two single-digit numbers.',
              estimatedMasteryTime: 10,
            },
          },
        },
      },
    },
    include: {
      subtopics: { include: { learningObjectives: true } },
    },
  });
  const objective = topic.subtopics[0].learningObjectives[0];
  const question = await prisma.question.create({
    data: {
      questionText: 'What is 2 + 2?',
      questionType: QuestionType.MULTIPLE_CHOICE,
      options: ['3', '4', '5'],
      correctAnswer: '4',
      explanation:
        'Two plus two equals four. Count two steps after two to get four.',
      curriculum: Curriculum.IB,
      grade: Grade.GRADE_5,
      difficulty: 2,
      learningObjectiveId: objective.id,
    },
  });

  console.log(
    JSON.stringify({
      parentId: parent.id,
      email,
      password,
      childId: child.id,
      topicId: topic.id,
      questionId: question.id,
    }),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
