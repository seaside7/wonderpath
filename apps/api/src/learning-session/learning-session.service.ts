import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LearningSessionStatus as PrismaLearningSessionStatus } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getOwnedChild } from '../common/get-owned-child';
import { LearningSessionResponseDto } from './dto/learning-session-response.dto';
import { StartLearningSessionDto } from './dto/start-learning-session.dto';
import {
  isCurriculumSupported,
  mapLearningSessionContextToPrisma,
  mapLearningSessionStatusFromPrisma,
  mapLearningSessionToResponse,
  mapSubjectFromPrisma,
  mapSubjectToPrisma,
} from './learning-session.mapper';
import {
  mapCurriculumFromPrisma,
  mapCurriculumToPrisma,
} from '../child/child.mapper';
import { SessionHistoryResponseDto } from './dto/session-history-response.dto';

@Injectable()
export class LearningSessionService {
  constructor(private readonly prisma: PrismaService) {}

  async start(
    parentId: string,
    dto: StartLearningSessionDto,
  ): Promise<LearningSessionResponseDto> {
    const child = await getOwnedChild(this.prisma, parentId, dto.childId);

    if (!isCurriculumSupported(child.curricula, dto.curriculum)) {
      throw new BadRequestException(
        'Selected curriculum is not supported for this child',
      );
    }

    await this.prisma.learningSession.updateMany({
      where: {
        childId: child.id,
        status: PrismaLearningSessionStatus.STARTED,
      },
      data: {
        status: PrismaLearningSessionStatus.CANCELLED,
      },
    });

    const session = await this.prisma.learningSession.create({
      data: {
        childId: child.id,
        curriculum: mapCurriculumToPrisma(dto.curriculum),
        subject: mapSubjectToPrisma(dto.subject),
        status: PrismaLearningSessionStatus.STARTED,
        ...(dto.context
          ? { context: mapLearningSessionContextToPrisma(dto.context) }
          : {}),
      },
      include: {
        child: {
          select: { id: true, fullName: true },
        },
      },
    });

    return mapLearningSessionToResponse(session);
  }

  async getCurrent(
    parentId: string,
    childId: string,
  ): Promise<LearningSessionResponseDto> {
    const child = await getOwnedChild(this.prisma, parentId, childId);

    const session = await this.prisma.learningSession.findFirst({
      where: {
        childId: child.id,
        status: PrismaLearningSessionStatus.STARTED,
      },
      orderBy: { startedAt: 'desc' },
      include: {
        child: {
          select: { id: true, fullName: true },
        },
        focusLearningObjective: {
          select: { id: true, name: true },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('No active learning session found');
    }

    return mapLearningSessionToResponse(session);
  }

  async listForChild(
    parentId: string,
    childId: string,
    limit = 10,
  ): Promise<SessionHistoryResponseDto> {
    const child = await getOwnedChild(this.prisma, parentId, childId);

    const sessions = await this.prisma.learningSession.findMany({
      where: { childId: child.id },
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: {
        attempts: {
          select: { correct: true },
        },
      },
    });

    return {
      childId: child.id,
      sessions: sessions.map((session) => ({
        id: session.id,
        subject: mapSubjectFromPrisma(session.subject),
        curriculum: mapCurriculumFromPrisma(session.curriculum),
        status: mapLearningSessionStatusFromPrisma(session.status),
        startedAt: session.startedAt,
        questionsAnswered: session.attempts.length,
        correctCount: session.attempts.filter((attempt) => attempt.correct)
          .length,
      })),
    };
  }

  async complete(
    parentId: string,
    sessionId: string,
  ): Promise<LearningSessionResponseDto> {
    const session = await this.prisma.learningSession.findFirst({
      where: {
        id: sessionId,
        status: PrismaLearningSessionStatus.STARTED,
        child: { parentId },
      },
    });

    if (!session) {
      throw new NotFoundException('Active learning session not found');
    }

    const updated = await this.prisma.learningSession.update({
      where: { id: session.id },
      data: { status: PrismaLearningSessionStatus.COMPLETED },
      include: {
        child: {
          select: { id: true, fullName: true },
        },
        focusLearningObjective: {
          select: { id: true, name: true },
        },
      },
    });

    return mapLearningSessionToResponse(updated);
  }
}
