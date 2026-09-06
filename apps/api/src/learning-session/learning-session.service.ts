import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LearningSessionStatus as PrismaLearningSessionStatus } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LearningSessionResponseDto } from './dto/learning-session-response.dto';
import { StartLearningSessionDto } from './dto/start-learning-session.dto';
import {
  isCurriculumSupported,
  mapLearningSessionContextToPrisma,
  mapLearningSessionToResponse,
  mapSubjectToPrisma,
} from './learning-session.mapper';
import { mapCurriculumToPrisma } from '../child/child.mapper';

@Injectable()
export class LearningSessionService {
  constructor(private readonly prisma: PrismaService) {}

  async start(
    parentId: string,
    dto: StartLearningSessionDto,
  ): Promise<LearningSessionResponseDto> {
    const child = await this.prisma.child.findFirst({
      where: { id: dto.childId, parentId },
    });

    if (!child) {
      throw new NotFoundException('Child not found');
    }

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
    const child = await this.prisma.child.findFirst({
      where: { id: childId, parentId },
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
