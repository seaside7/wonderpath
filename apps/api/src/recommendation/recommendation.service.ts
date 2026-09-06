import { Injectable, NotFoundException } from '@nestjs/common';
import {
  LearningSessionContext as PrismaLearningSessionContext,
  LearningSessionStatus as PrismaLearningSessionStatus,
  StudentMastery,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { mapCurriculumFromPrisma } from '../child/child.mapper';
import {
  mapLearningSessionContextFromPrisma,
  mapSubjectFromPrisma,
} from '../learning-session/learning-session.mapper';
import { AcceptRecommendationDto } from './dto/accept-recommendation.dto';
import {
  LearningObjectiveReferenceDto,
  RecommendationItemDto,
  RecommendationResponseDto,
} from './dto/recommendation-response.dto';
import { SessionFocusResponseDto } from './dto/session-focus-response.dto';
import {
  RecommendationAction,
  RecommendationReason,
} from './enums/recommendation.enums';
import { RECOMMENDATION_CONFIG } from './recommendation.config';

type LearningObjectiveWithHierarchy = {
  id: string;
  name: string;
  description: string;
  estimatedMasteryTime: number;
  subtopic: {
    id: string;
    name: string;
    topic: {
      id: string;
      name: string;
      subjectArea: {
        id: string;
        code: string;
        name: string;
      };
    };
  };
};

type MasteryWithObjective = StudentMastery & {
  learningObjective: LearningObjectiveWithHierarchy;
};

interface CandidateItem {
  learningObjective: LearningObjectiveWithHierarchy;
  action: RecommendationAction;
  reasonCodes: string[];
  score: number;
}

const includeLearningObjectiveHierarchy = {
  learningObjective: {
    include: {
      subtopic: {
        include: {
          topic: {
            include: {
              subjectArea: true,
            },
          },
        },
      },
    },
  },
} as const;

@Injectable()
export class RecommendationService {
  constructor(private readonly prisma: PrismaService) {}

  async getRecommendations(
    parentId: string,
    childId: string,
  ): Promise<RecommendationResponseDto> {
    const child = await this.prisma.child.findFirst({
      where: { id: childId, parentId },
      select: { id: true, grade: true },
    });

    if (!child) {
      throw new NotFoundException('Child not found');
    }

    const session = await this.prisma.learningSession.findFirst({
      where: {
        childId: child.id,
        status: PrismaLearningSessionStatus.STARTED,
      },
      orderBy: { startedAt: 'desc' },
      select: { id: true, curriculum: true, subject: true, context: true },
    });

    if (!session) {
      throw new NotFoundException('No active learning session found');
    }

    const subjectArea = await this.prisma.subjectArea.findUnique({
      where: { code: session.subject },
      select: { id: true },
    });

    const inventoryQuestions = await this.prisma.question.findMany({
      where: {
        curriculum: session.curriculum,
        grade: child.grade,
        ...(subjectArea
          ? {
              learningObjective: {
                subtopic: {
                  topic: { subjectAreaId: subjectArea.id },
                },
              },
            }
          : {}),
      },
      select: { learningObjectiveId: true },
    });

    const inventoryLoIds = new Set(
      inventoryQuestions.map((question) => question.learningObjectiveId),
    );

    const practicedMastery = await this.prisma.studentMastery.findMany({
      where: { childId: child.id },
      include: includeLearningObjectiveHierarchy,
    });

    const practicedLoIds = new Set(
      practicedMastery.map((record) => record.learningObjectiveId),
    );

    const candidates: CandidateItem[] = [];

    for (const record of practicedMastery) {
      const subjectCode = record.learningObjective.subtopic.topic.subjectArea
        .code as string;
      if (
        subjectCode === session.subject &&
        inventoryLoIds.has(record.learningObjectiveId)
      ) {
        candidates.push(this.scorePracticedCandidate(record, session.context));
      }
    }

    const newLoIds = [...inventoryLoIds].filter(
      (id) => !practicedLoIds.has(id),
    );

    if (newLoIds.length > 0) {
      const newObjectives = await this.prisma.learningObjective.findMany({
        where: { id: { in: newLoIds } },
        include: {
          subtopic: {
            include: {
              topic: {
                include: {
                  subjectArea: true,
                },
              },
            },
          },
        },
      });

      for (const objective of newObjectives) {
        candidates.push(this.scoreNewCandidate(objective, session.context));
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    const recommendations = candidates
      .slice(0, RECOMMENDATION_CONFIG.limit)
      .map((candidate) => this.toRecommendationItem(candidate));

    return {
      childId: child.id,
      session: {
        id: session.id,
        curriculum: mapCurriculumFromPrisma(session.curriculum),
        subject: mapSubjectFromPrisma(session.subject),
        context: mapLearningSessionContextFromPrisma(session.context),
      },
      recommendations,
    };
  }

  async acceptRecommendation(
    parentId: string,
    sessionId: string,
    dto: AcceptRecommendationDto,
  ): Promise<SessionFocusResponseDto> {
    const session = await this.prisma.learningSession.findFirst({
      where: { id: sessionId, child: { parentId } },
      select: { id: true },
    });

    if (!session) {
      throw new NotFoundException('Learning session not found');
    }

    const objective = await this.prisma.learningObjective.findUnique({
      where: { id: dto.learningObjectiveId },
      select: { id: true, name: true },
    });

    if (!objective) {
      throw new NotFoundException('Learning objective not found');
    }

    const updated = await this.prisma.learningSession.update({
      where: { id: sessionId },
      data: { focusLearningObjectiveId: objective.id },
      include: {
        focusLearningObjective: { select: { id: true, name: true } },
        child: { select: { id: true } },
      },
    });

    return {
      id: updated.id,
      childId: updated.childId,
      curriculum: mapCurriculumFromPrisma(updated.curriculum),
      subject: mapSubjectFromPrisma(updated.subject),
      context: mapLearningSessionContextFromPrisma(updated.context),
      focusLearningObjective: updated.focusLearningObjective
        ? {
            id: updated.focusLearningObjective.id,
            name: updated.focusLearningObjective.name,
          }
        : null,
    };
  }

  private scorePracticedCandidate(
    record: MasteryWithObjective,
    context: string,
  ): CandidateItem {
    const { masteryScore, confidenceScore, totalAttempts, reviewRecommended } =
      record;

    const daysSinceLastPractice =
      (Date.now() - record.lastPracticedAt.getTime()) / (1000 * 60 * 60 * 24);

    const reasonCodes: string[] = [];
    let action: RecommendationAction;
    let baseScore: number;

    if (reviewRecommended) {
      if (masteryScore >= RECOMMENDATION_CONFIG.highMasteryThreshold) {
        action = RecommendationAction.Review;
        baseScore = RECOMMENDATION_CONFIG.reviewHighMasteryScore;
        reasonCodes.push(
          RecommendationReason.HighMastery,
          RecommendationReason.LongTimeNoPractice,
        );
      } else {
        action = RecommendationAction.Review;
        baseScore = RECOMMENDATION_CONFIG.reviewLowMasteryScore;
        reasonCodes.push(RecommendationReason.LowMastery);
        if (daysSinceLastPractice >= RECOMMENDATION_CONFIG.reviewAfterDays) {
          reasonCodes.push(RecommendationReason.LongTimeNoPractice);
        }
      }
    } else if (masteryScore < RECOMMENDATION_CONFIG.lowMasteryThreshold) {
      action = RecommendationAction.Practice;
      baseScore = RECOMMENDATION_CONFIG.practiceLowMasteryScore;
      reasonCodes.push(RecommendationReason.LowMastery);
    } else if (masteryScore >= RECOMMENDATION_CONFIG.highMasteryThreshold) {
      action = RecommendationAction.IncreaseDifficulty;
      baseScore = RECOMMENDATION_CONFIG.increaseDifficultyScore;
      reasonCodes.push(RecommendationReason.HighMastery);
    } else {
      action = RecommendationAction.Continue;
      baseScore = RECOMMENDATION_CONFIG.continueScore;
      reasonCodes.push(RecommendationReason.Continue);
    }

    if (
      totalAttempts > 0 &&
      confidenceScore < RECOMMENDATION_CONFIG.lowConfidenceThreshold
    ) {
      reasonCodes.push(RecommendationReason.LowConfidence);
    }

    let score = baseScore;

    if (
      context === PrismaLearningSessionContext.EXAM_TOMORROW &&
      (action === RecommendationAction.Review ||
        action === RecommendationAction.Practice)
    ) {
      score += RECOMMENDATION_CONFIG.examTomorrowBoost;
      reasonCodes.push(RecommendationReason.ExamTomorrow);
    }

    if (
      context === PrismaLearningSessionContext.QUICK_SESSION &&
      (action === RecommendationAction.Review ||
        action === RecommendationAction.Practice)
    ) {
      score += RECOMMENDATION_CONFIG.quickSessionReviewBoost;
      reasonCodes.push(RecommendationReason.QuickSession);
    }

    return {
      learningObjective: record.learningObjective,
      action,
      reasonCodes,
      score,
    };
  }

  private scoreNewCandidate(
    objective: LearningObjectiveWithHierarchy,
    context: string,
  ): CandidateItem {
    const reasonCodes: string[] = [RecommendationReason.NewObjective];
    let score = RECOMMENDATION_CONFIG.newObjectiveScore;

    if (context === PrismaLearningSessionContext.EXAM_TOMORROW) {
      score += RECOMMENDATION_CONFIG.examTomorrowBoost;
      reasonCodes.push(RecommendationReason.ExamTomorrow);
    }

    if (context === PrismaLearningSessionContext.QUICK_SESSION) {
      score += RECOMMENDATION_CONFIG.quickSessionReviewBoost;
      reasonCodes.push(RecommendationReason.QuickSession);
    }

    return {
      learningObjective: objective,
      action: RecommendationAction.ExploreNew,
      reasonCodes,
      score,
    };
  }

  private toRecommendationItem(
    candidate: CandidateItem,
  ): RecommendationItemDto {
    return {
      learningObjective: mapLearningObjectiveToReference(
        candidate.learningObjective,
      ),
      action: candidate.action,
      reasonCodes: candidate.reasonCodes,
      explanation: buildExplanation(
        candidate.learningObjective.name,
        candidate.action,
        candidate.reasonCodes,
      ),
      score: candidate.score,
    };
  }
}

function mapLearningObjectiveToReference(
  objective: LearningObjectiveWithHierarchy,
): LearningObjectiveReferenceDto {
  const { subtopic } = objective;
  const { topic } = subtopic;
  const { subjectArea } = topic;

  return {
    id: objective.id,
    name: objective.name,
    description: objective.description,
    estimatedMasteryTime: objective.estimatedMasteryTime,
    hierarchy: {
      subject: {
        id: subjectArea.id,
        code: subjectArea.code,
        name: subjectArea.name,
      },
      topic: {
        id: topic.id,
        name: topic.name,
      },
      subtopic: {
        id: subtopic.id,
        name: subtopic.name,
      },
    },
  };
}

function buildExplanation(
  objectiveName: string,
  action: RecommendationAction,
  reasonCodes: string[],
): string {
  const codes = new Set(reasonCodes);

  if (codes.has(RecommendationReason.ExamTomorrow)) {
    return `There is an exam coming up. Atlas recommends focusing on ${objectiveName}.`;
  }

  if (
    codes.has(RecommendationReason.HighMastery) &&
    codes.has(RecommendationReason.LongTimeNoPractice)
  ) {
    return `${objectiveName} is strong, but it has not been practiced recently. A short review is recommended.`;
  }

  if (codes.has(RecommendationReason.LongTimeNoPractice)) {
    return `${objectiveName} has not been practiced recently. A review is recommended.`;
  }

  if (codes.has(RecommendationReason.LowMastery)) {
    if (action === RecommendationAction.Practice) {
      return `${objectiveName} needs more practice.`;
    }
    return `${objectiveName} may need attention. Atlas recommends a review.`;
  }

  if (action === RecommendationAction.Continue) {
    return `Keep building on ${objectiveName}.`;
  }

  if (action === RecommendationAction.IncreaseDifficulty) {
    return `${objectiveName} is solid. Try harder questions next.`;
  }

  if (action === RecommendationAction.ExploreNew) {
    return `Start something new: ${objectiveName}.`;
  }

  return `Atlas recommends working on ${objectiveName}.`;
}
