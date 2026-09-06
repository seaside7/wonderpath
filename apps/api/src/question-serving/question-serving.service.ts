import { Injectable, NotFoundException } from '@nestjs/common';
import { QuestionPerformanceStatus as PrismaPerformanceStatus } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { mapQuestionTypeFromPrisma } from '../question-bank/question.mapper';

export interface ServedQuestion {
  id: string;
  questionText: string;
  questionType: 'Multiple Choice' | 'True / False';
  options: string[];
  difficulty: number;
}

export interface NextQuestionResult {
  question: ServedQuestion | null;
}

const EXCLUDED_FROM_SERVING: readonly PrismaPerformanceStatus[] = [
  PrismaPerformanceStatus.RETIRED,
  PrismaPerformanceStatus.LOW_PERFORMANCE,
];

@Injectable()
export class QuestionServingService {
  constructor(private readonly prisma: PrismaService) {}

  async getNextQuestion(
    parentId: string,
    sessionId: string,
  ): Promise<NextQuestionResult> {
    const session = await this.prisma.learningSession.findFirst({
      where: {
        id: sessionId,
        status: 'STARTED',
        child: { parentId },
      },
      include: {
        child: { select: { id: true, grade: true } },
      },
    });

    if (!session) {
      throw new NotFoundException('Active learning session not found');
    }

    const answered = await this.prisma.questionAttempt.findMany({
      where: { learningSessionId: session.id },
      select: { questionId: true },
    });

    const answeredIds = new Set(answered.map((entry) => entry.questionId));

    const difficultySetting =
      await this.prisma.childSubjectDifficulty.findUnique({
        where: {
          childId_subject: {
            childId: session.childId,
            subject: session.subject,
          },
        },
      });

    const targetDifficulty = difficultySetting?.currentDifficulty ?? 3;

    const learningObjectivesFilter = session.focusLearningObjectiveId
      ? { id: session.focusLearningObjectiveId }
      : {
          subtopic: {
            topic: { subjectArea: { code: session.subject } },
          },
        };

    const candidates = await this.prisma.question.findMany({
      where: {
        curriculum: session.curriculum,
        grade: session.child.grade,
        learningObjective: learningObjectivesFilter,
        NOT: { id: { in: [...answeredIds] } },
      },
      include: { performance: true },
    });

    const eligible = candidates.filter(
      (question) =>
        !question.performance ||
        !EXCLUDED_FROM_SERVING.includes(question.performance.status),
    );

    if (eligible.length === 0) {
      return { question: null };
    }

    eligible.sort((left, right) => {
      const leftDistance = Math.abs(left.difficulty - targetDifficulty);
      const rightDistance = Math.abs(right.difficulty - targetDifficulty);

      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }

      const leftServed = left.performance?.timesServed ?? 0;
      const rightServed = right.performance?.timesServed ?? 0;

      if (leftServed !== rightServed) {
        return leftServed - rightServed;
      }

      return left.createdAt.getTime() - right.createdAt.getTime();
    });

    const chosen = eligible[0];

    return {
      question: {
        id: chosen.id,
        questionText: chosen.questionText,
        questionType: mapQuestionTypeFromPrisma(chosen.questionType),
        options: chosen.options as string[],
        difficulty: chosen.difficulty,
      },
    };
  }
}
