import 'dotenv/config';
/**
 * Idempotent seed script: adds the "Data & Probability" topic (with
 * subtopics and learning objectives) under the MATHEMATICS subject area.
 *
 * Safe to re-run — uses upsert/create so existing rows are untouched.
 *
 * Run: npx ts-node scripts/seed-data-probability-topic.ts
 * (or: node dist/scripts/seed-data-probability-topic.js after a build)
 */

import { PrismaClient, Subject as PrismaSubject } from '../generated/prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[seed] Upserting MATHEMATICS subject area…');
  const mathSubject = await prisma.subjectArea.upsert({
    where: { code: PrismaSubject.MATHEMATICS },
    create: { code: PrismaSubject.MATHEMATICS, name: 'Mathematics' },
    update: {},
  });

  console.log('[seed] Upserting topic "Data & Probability"…');
  const topic = await prisma.topic.upsert({
    where: {
      subjectAreaId_name: {
        subjectAreaId: mathSubject.id,
        name: 'Data & Probability',
      },
    },
    create: {
      name: 'Data & Probability',
      subjectAreaId: mathSubject.id,
    },
    update: {},
  });

  console.log('[seed] Upserting subtopic "Reading & Interpreting Data"…');
  const subtopic1 = await prisma.subtopic.upsert({
    where: { topicId_name: { topicId: topic.id, name: 'Reading & Interpreting Data' } },
    create: {
      name: 'Reading & Interpreting Data',
      topicId: topic.id,
    },
    update: {},
  });

  console.log('[seed] Upserting learning objectives for "Reading & Interpreting Data"…');
  await prisma.learningObjective.upsert({
    where: {
      subtopicId_name: {
        subtopicId: subtopic1.id,
        name: 'Read and interpret data from tables and bar charts',
      },
    },
    create: {
      name: 'Read and interpret data from tables and bar charts',
      description:
        'Students read and interpret data presented in tables and bar charts, identifying trends and drawing simple conclusions.',
      estimatedMasteryTime: 30,
      subtopicId: subtopic1.id,
    },
    update: {},
  });

  await prisma.learningObjective.upsert({
    where: {
      subtopicId_name: {
        subtopicId: subtopic1.id,
        name: 'Find the mean (average) of a simple data set',
      },
    },
    create: {
      name: 'Find the mean (average) of a simple data set',
      description:
        'Students calculate the mean of a small set of whole numbers by summing the values and dividing by the count.',
      estimatedMasteryTime: 20,
      subtopicId: subtopic1.id,
    },
    update: {},
  });

  console.log('[seed] Upserting subtopic "Basic Probability"…');
  const subtopic2 = await prisma.subtopic.upsert({
    where: { topicId_name: { topicId: topic.id, name: 'Basic Probability' } },
    create: {
      name: 'Basic Probability',
      topicId: topic.id,
    },
    update: {},
  });

  console.log('[seed] Upserting learning objective for "Basic Probability"…');
  await prisma.learningObjective.upsert({
    where: {
      subtopicId_name: {
        subtopicId: subtopic2.id,
        name: 'Describe the likelihood of simple events (certain, likely, unlikely, impossible)',
      },
    },
    create: {
      name: 'Describe the likelihood of simple events (certain, likely, unlikely, impossible)',
      description:
        'Students use everyday language (certain, likely, unlikely, impossible) to describe the chance of simple events happening.',
      estimatedMasteryTime: 25,
      subtopicId: subtopic2.id,
    },
    update: {},
  });

  console.log('[seed] Done.');
}

main()
  .catch((err) => {
    console.error('[seed] Error:', err);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
