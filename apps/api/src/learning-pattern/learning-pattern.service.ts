import { Injectable, NotFoundException } from '@nestjs/common';
import {
  LearningPatternKey as PrismaLearningPatternKey,
  PerceivedDifficulty as PrismaPerceivedDifficulty,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePersonalityDto } from './dto/update-personality.dto';
import { LearningPatternKey as ApiLearningPatternKey } from './enums/learning-pattern.enums';
import {
  LEARNING_PATTERN_CONFIG,
  studyTimeBucketForHour,
} from './learning-pattern.config';
import {
  mapMotivationStyleToPrisma,
  mapPersonalityToResponse,
} from './learning-pattern.mapper';

interface PatternEvidence {
  candidate:
    | 'Fast'
    | 'Moderate'
    | 'Slow'
    | 'Finds questions easy'
    | 'Comfortable'
    | 'Finds questions hard'
    | 'Morning'
    | 'Afternoon'
    | 'Evening'
    | 'Strong'
    | 'Needs support';
  required: boolean;
}

const patternKeyDisplay: Record<PrismaLearningPatternKey, string> = {
  [PrismaLearningPatternKey.RESPONSE_PACE]: 'Response Pace',
  [PrismaLearningPatternKey.PERCEIVED_DIFFICULTY]: 'Perceived Difficulty',
  [PrismaLearningPatternKey.BEST_STUDY_TIME]: 'Best Study Time',
  [PrismaLearningPatternKey.STORY_PERFORMANCE]: 'Story Problems',
  [PrismaLearningPatternKey.VISUAL_PERFORMANCE]: 'Visual Questions',
};

@Injectable()
export class LearningPatternService {
  constructor(private readonly prisma: PrismaService) {}

  async recordAttempt(attemptId: string): Promise<void> {
    const attempt = await this.prisma.questionAttempt.findUnique({
      where: { id: attemptId },
      select: {
        childId: true,
        correct: true,
        timeSpent: true,
        perceivedDifficulty: true,
        createdAt: true,
        question: { select: { metadata: true } },
      },
    });

    if (!attempt) {
      return;
    }

    const metadata = attempt.question.metadata as Record<
      string,
      unknown
    > | null;

    const evidences: Array<[ApiLearningPatternKey, PatternEvidence]> = [
      [
        ApiLearningPatternKey.ResponsePace,
        {
          candidate:
            attempt.timeSpent <= LEARNING_PATTERN_CONFIG.responsePace.fastMs
              ? 'Fast'
              : attempt.timeSpent >= LEARNING_PATTERN_CONFIG.responsePace.slowMs
                ? 'Slow'
                : 'Moderate',
          required: true,
        },
      ],
      [
        ApiLearningPatternKey.PerceivedDifficulty,
        {
          candidate: this.perceivedDifficultyCandidate(
            attempt.perceivedDifficulty,
          ),
          required: true,
        },
      ],
      [
        ApiLearningPatternKey.BestStudyTime,
        {
          candidate: studyTimeBucketForHour(attempt.createdAt.getHours()),
          required: true,
        },
      ],
    ];

    if (metadata?.questionType === 'story') {
      evidences.push([
        ApiLearningPatternKey.StoryPerformance,
        {
          candidate: attempt.correct ? 'Strong' : 'Needs support',
          required: true,
        },
      ]);
    }

    if (metadata?.visual === true) {
      evidences.push([
        ApiLearningPatternKey.VisualPerformance,
        {
          candidate: attempt.correct ? 'Strong' : 'Needs support',
          required: true,
        },
      ]);
    }

    for (const [key, evidence] of evidences) {
      await this.applyEvidence(attempt.childId, key, evidence.candidate);
    }
  }

  async getPatterns(parentId: string, childId: string) {
    const child = await this.prisma.child.findFirst({
      where: { id: childId, parentId },
      select: { id: true },
    });

    if (!child) {
      throw new NotFoundException('Child not found');
    }

    const records = await this.prisma.childLearningPattern.findMany({
      where: { childId },
    });

    const patterns = records
      .filter(
        (record) =>
          record.evidenceCount >=
          LEARNING_PATTERN_CONFIG.minEvidencePerPattern[
            record.patternKey as unknown as ApiLearningPatternKey
          ],
      )
      .sort((a, b) => b.strength - a.strength)
      .map((record) => ({
        key: patternKeyDisplay[record.patternKey],
        value: record.value,
        strength: record.strength,
        evidenceCount: record.evidenceCount,
        lastDetectedAt: record.lastDetectedAt,
      }));

    return { childId, patterns };
  }

  async getPersonality(parentId: string, childId: string) {
    const child = await this.prisma.child.findFirst({
      where: { id: childId, parentId },
      select: { id: true },
    });

    if (!child) {
      throw new NotFoundException('Child not found');
    }

    const record = await this.prisma.childPersonalityPreference.findUnique({
      where: { childId },
    });

    return mapPersonalityToResponse(record);
  }

  async updatePersonality(
    parentId: string,
    childId: string,
    dto: UpdatePersonalityDto,
  ) {
    const child = await this.prisma.child.findFirst({
      where: { id: childId, parentId },
      select: { id: true },
    });

    if (!child) {
      throw new NotFoundException('Child not found');
    }

    await this.prisma.childPersonalityPreference.upsert({
      where: { childId },
      create: {
        childId,
        favoriteAnimal: dto.favoriteAnimal ?? null,
        favoriteTheme: dto.favoriteTheme ?? null,
        favoriteColor: dto.favoriteColor ?? null,
        motivationStyle: dto.motivationStyle
          ? mapMotivationStyleToPrisma(dto.motivationStyle)
          : null,
      },
      update: {
        ...(dto.favoriteAnimal !== undefined
          ? { favoriteAnimal: dto.favoriteAnimal }
          : {}),
        ...(dto.favoriteTheme !== undefined
          ? { favoriteTheme: dto.favoriteTheme }
          : {}),
        ...(dto.favoriteColor !== undefined
          ? { favoriteColor: dto.favoriteColor }
          : {}),
        ...(dto.motivationStyle !== undefined
          ? {
              motivationStyle: dto.motivationStyle
                ? mapMotivationStyleToPrisma(dto.motivationStyle)
                : null,
            }
          : {}),
      },
    });

    const record = await this.prisma.childPersonalityPreference.findUnique({
      where: { childId },
    });

    return mapPersonalityToResponse(record);
  }

  async getEncouragement(parentId: string, childId: string) {
    const child = await this.prisma.child.findFirst({
      where: { id: childId, parentId },
      select: { id: true },
    });

    if (!child) {
      throw new NotFoundException('Child not found');
    }

    const sessions = await this.prisma.learningSession.findMany({
      where: { childId },
      orderBy: { startedAt: 'desc' },
      take: 2,
      include: {
        attempts: {
          select: { correct: true, timeSpent: true },
        },
      },
    });

    if (sessions.length === 0) {
      return {
        message:
          'Complete a learning session to unlock your child\u2019s progress report.',
        data: emptyEncouragementData(),
      };
    }

    const latest = summarize(sessions[0]);
    const previous = sessions[1] ? summarize(sessions[1]) : null;

    const responseTimeImprovementPct =
      previous && previous.avgResponseTimeMs > latest.avgResponseTimeMs
        ? Math.round(
            ((previous.avgResponseTimeMs - latest.avgResponseTimeMs) /
              previous.avgResponseTimeMs) *
              100,
          )
        : null;

    const correctRateImprovementPct =
      previous && latest.correctRate > previous.correctRate
        ? Math.round((latest.correctRate - previous.correctRate) * 100)
        : null;

    let message: string;
    if (
      responseTimeImprovementPct !== null &&
      responseTimeImprovementPct >= 5
    ) {
      message = `You answered your latest session ${responseTimeImprovementPct}% faster than the previous one. Keep that rhythm up!`;
    } else if (
      correctRateImprovementPct !== null &&
      correctRateImprovementPct >= 5
    ) {
      message = `Your accuracy improved from ${Math.round(previous!.correctRate * 100)}% to ${Math.round(latest.correctRate * 100)}%. Nice, steady progress!`;
    } else {
      message = `You answered ${latest.total === 0 ? 0 : latest.correct} of ${latest.total} questions correctly in your latest session. Every question counts!`;
    }

    return {
      message,
      data: {
        sessionsCompared: previous ? 2 : 1,
        latestSessionCorrect: latest.correct,
        latestSessionTotal: latest.total,
        correctRate: Math.round(latest.correctRate * 100),
        averageResponseTimeMs: Math.round(latest.avgResponseTimeMs),
        responseTimeImprovementPct,
        correctRateImprovementPct,
      },
    };
  }

  private perceivedDifficultyCandidate(
    difficulty: PrismaPerceivedDifficulty,
  ): PatternEvidence['candidate'] {
    if (difficulty === PrismaPerceivedDifficulty.EASY) {
      return 'Finds questions easy';
    }
    if (difficulty === PrismaPerceivedDifficulty.DIFFICULT) {
      return 'Finds questions hard';
    }
    return 'Comfortable';
  }

  private async applyEvidence(
    childId: string,
    key: ApiLearningPatternKey,
    candidate: string,
  ): Promise<void> {
    const existing = await this.prisma.childLearningPattern.findUnique({
      where: {
        childId_patternKey: {
          childId,
          patternKey: key,
        },
      },
    });

    const step = LEARNING_PATTERN_CONFIG.strengthStep;
    const floor = LEARNING_PATTERN_CONFIG.robustnessFloor;

    let nextValue: string;
    let nextStrength: number;

    if (!existing) {
      nextValue = candidate;
      nextStrength = Math.min(1, floor + step);
    } else if (existing.value === candidate) {
      nextValue = existing.value;
      nextStrength = Math.min(1, existing.strength + step);
    } else {
      const demoted = existing.strength - step;
      if (demoted < floor) {
        nextValue = candidate;
        nextStrength = Math.min(1, floor + step);
      } else {
        nextValue = existing.value;
        nextStrength = demoted;
      }
    }

    if (existing) {
      await this.prisma.childLearningPattern.update({
        where: { id: existing.id },
        data: {
          value: nextValue,
          strength: nextStrength,
          evidenceCount: { increment: 1 },
        },
      });
    } else {
      await this.prisma.childLearningPattern.create({
        data: {
          childId,
          patternKey: key,
          value: nextValue,
          strength: nextStrength,
          evidenceCount: 1,
        },
      });
    }
  }
}

function summarize(session: {
  attempts: Array<{ correct: boolean; timeSpent: number }>;
}) {
  const total = session.attempts.length;
  const correct = session.attempts.filter((attempt) => attempt.correct).length;
  const totalTimeMs = session.attempts.reduce(
    (sum, attempt) => sum + attempt.timeSpent,
    0,
  );
  return {
    total,
    correct,
    correctRate: total === 0 ? 0 : correct / total,
    avgResponseTimeMs: total === 0 ? 0 : totalTimeMs / total,
  };
}

function emptyEncouragementData() {
  return {
    sessionsCompared: 0,
    latestSessionCorrect: 0,
    latestSessionTotal: 0,
    correctRate: 0,
    averageResponseTimeMs: 0,
    responseTimeImprovementPct: null,
    correctRateImprovementPct: null,
  };
}
