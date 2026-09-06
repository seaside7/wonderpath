import { Injectable } from '@nestjs/common';
import { QuestionPerformanceStatus as PrismaPerformanceStatus } from '../../generated/prisma/client';
import {
  mapCurriculumFromPrisma,
  mapGradeFromPrisma,
} from '../child/child.mapper';
import { ContentGenerationService } from '../content-generation/content-generation.service';
import { mapQuestionTypeFromPrisma } from '../question-bank/question.mapper';
import { PrismaService } from '../prisma/prisma.service';
import { QUESTION_PERFORMANCE_CONFIG } from './question-performance.config';

@Injectable()
export class QuestionPerformanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contentGenerationService: ContentGenerationService,
  ) {}

  async recordAttempt(attemptId: string): Promise<void> {
    const attempt = await this.prisma.questionAttempt.findUnique({
      where: { id: attemptId },
      select: {
        questionId: true,
        correct: true,
        timeSpent: true,
        hintUsed: true,
      },
    });

    if (!attempt) {
      return;
    }

    const existing = await this.prisma.questionPerformance.findUnique({
      where: { questionId: attempt.questionId },
    });

    if (!existing) {
      await this.prisma.questionPerformance.create({
        data: {
          questionId: attempt.questionId,
          timesServed: 1,
          correctCount: attempt.correct ? 1 : 0,
          wrongCount: attempt.correct ? 0 : 1,
          avgResponseTimeMs: attempt.timeSpent,
          hintUsageCount: attempt.hintUsed ? 1 : 0,
          status: PrismaPerformanceStatus.ACTIVE,
          firstServedAt: new Date(),
          lastServedAt: new Date(),
        },
      });
      return;
    }

    const timesServed = existing.timesServed + 1;
    const correctCount = existing.correctCount + (attempt.correct ? 1 : 0);
    const wrongCount = existing.wrongCount + (attempt.correct ? 0 : 1);
    const avgResponseTimeMs =
      (existing.avgResponseTimeMs * existing.timesServed + attempt.timeSpent) /
      timesServed;
    const hintUsageCount = existing.hintUsageCount + (attempt.hintUsed ? 1 : 0);

    const wrongRate = wrongCount / timesServed;
    let status = existing.status;

    if (timesServed >= QUESTION_PERFORMANCE_CONFIG.minServedBeforeJudging) {
      if (wrongRate >= QUESTION_PERFORMANCE_CONFIG.retireWrongRate) {
        status = PrismaPerformanceStatus.RETIRED;
      } else if (
        wrongRate >= QUESTION_PERFORMANCE_CONFIG.lowPerformanceWrongRate
      ) {
        status = PrismaPerformanceStatus.LOW_PERFORMANCE;
      } else if (status === PrismaPerformanceStatus.LOW_PERFORMANCE) {
        status = PrismaPerformanceStatus.ACTIVE;
      }
    }

    await this.prisma.questionPerformance.update({
      where: { id: existing.id },
      data: {
        timesServed,
        correctCount,
        wrongCount,
        avgResponseTimeMs,
        hintUsageCount,
        status,
        lastServedAt: new Date(),
      },
    });
  }

  async list() {
    const records = await this.prisma.questionPerformance.findMany({
      include: {
        question: {
          select: {
            id: true,
            questionText: true,
            learningObjectiveId: true,
            difficulty: true,
          },
        },
      },
      orderBy: { timesServed: 'desc' },
    });

    return records.map((record) => ({
      questionId: record.questionId,
      questionText: record.question.questionText,
      learningObjectiveId: record.question.learningObjectiveId,
      difficulty: record.question.difficulty,
      timesServed: record.timesServed,
      correctCount: record.correctCount,
      wrongCount: record.wrongCount,
      correctRate:
        record.timesServed === 0
          ? 0
          : Math.round((record.correctCount / record.timesServed) * 100),
      avgResponseTimeMs: Math.round(record.avgResponseTimeMs),
      hintUsageCount: record.hintUsageCount,
      abandonmentCount: record.abandonmentCount,
      reportedProblemCount: record.reportedProblemCount,
      status: record.status,
      lastServedAt: record.lastServedAt,
    }));
  }

  async getInventory() {
    const questions = await this.prisma.question.findMany({
      select: {
        learningObjectiveId: true,
        learningObjective: {
          select: {
            name: true,
            subtopic: {
              select: {
                topic: {
                  select: {
                    subjectArea: { select: { code: true, name: true } },
                  },
                },
              },
            },
          },
        },
        performance: { select: { status: true } },
      },
    });

    const byLearningObjective = new Map<
      string,
      {
        learningObjectiveId: string;
        name: string;
        subject: string;
        subjectName: string;
        available: number;
        total: number;
      }
    >();

    for (const question of questions) {
      const key = question.learningObjectiveId;
      let entry = byLearningObjective.get(key);
      if (!entry) {
        entry = {
          learningObjectiveId: key,
          name: question.learningObjective.name,
          subject: question.learningObjective.subtopic.topic.subjectArea.code,
          subjectName:
            question.learningObjective.subtopic.topic.subjectArea.name,
          available: 0,
          total: 0,
        };
        byLearningObjective.set(key, entry);
      }
      entry.total += 1;
      const status = question.performance?.status;
      const usable =
        status == null ||
        (status !== PrismaPerformanceStatus.RETIRED &&
          status !== PrismaPerformanceStatus.LOW_PERFORMANCE);
      if (usable) {
        entry.available += 1;
      }
    }

    const threshold =
      QUESTION_PERFORMANCE_CONFIG.minInventoryPerLearningObjective;

    return {
      threshold,
      subjects: Array.from(
        new Set([...byLearningObjective.values()].map((e) => e.subject)),
      ),
      entries: [...byLearningObjective.values()]
        .map((entry) => ({
          ...entry,
          needsReplenishment: entry.available < threshold,
          shortfall: Math.max(0, threshold - entry.available),
        }))
        .sort((a, b) => b.shortfall - a.shortfall),
    };
  }

  async replenish() {
    const inventory = await this.getInventory();
    const threshold =
      QUESTION_PERFORMANCE_CONFIG.minInventoryPerLearningObjective;
    const replenished: Array<{
      learningObjectiveId: string;
      generated: number;
      available: number;
      source: string;
    }> = [];

    for (const entry of inventory.entries) {
      const shortfall = Math.max(0, threshold - entry.available);
      if (shortfall === 0) {
        continue;
      }

      const representative = await this.prisma.question.findFirst({
        where: { learningObjectiveId: entry.learningObjectiveId },
        orderBy: { createdAt: 'desc' },
      });

      if (!representative) {
        continue;
      }

      await this.contentGenerationService.create({
        learningObjectiveId: entry.learningObjectiveId,
        curriculum: mapCurriculumFromPrisma(representative.curriculum),
        grade: mapGradeFromPrisma(representative.grade),
        questionType: mapQuestionTypeFromPrisma(representative.questionType),
        difficulty: representative.difficulty,
        quantity: shortfall,
      });

      replenished.push({
        learningObjectiveId: entry.learningObjectiveId,
        generated: shortfall,
        available: entry.available + shortfall,
        source: 'content-generation',
      });
    }

    return {
      replenished,
      generatedCount: replenished.reduce(
        (sum, item) => sum + item.generated,
        0,
      ),
    };
  }
}
