import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  mapChildToResponse,
  mapCurriculaToPrisma,
  mapGenderToPrisma,
  mapGradeToPrisma,
  mapPreferredLanguageToPrisma,
} from './child.mapper';
import { ChildResponseDto } from './dto/child-response.dto';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';

@Injectable()
export class ChildService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    parentId: string,
    dto: CreateChildDto,
  ): Promise<ChildResponseDto> {
    const child = await this.prisma.child.create({
      data: {
        fullName: dto.fullName,
        nickname: dto.nickname,
        dateOfBirth: new Date(dto.dateOfBirth),
        gender: mapGenderToPrisma(dto.gender),
        grade: mapGradeToPrisma(dto.grade),
        curricula: mapCurriculaToPrisma(dto.curricula),
        preferredLanguage: mapPreferredLanguageToPrisma(dto.preferredLanguage),
        schoolName: dto.schoolName,
        parentId,
      },
    });

    return mapChildToResponse(child);
  }

  async findAll(parentId: string): Promise<ChildResponseDto[]> {
    const children = await this.prisma.child.findMany({
      where: { parentId },
      orderBy: { createdAt: 'desc' },
    });

    return children.map(mapChildToResponse);
  }

  async findOne(parentId: string, childId: string): Promise<ChildResponseDto> {
    const child = await this.findOwnedChild(parentId, childId);
    return mapChildToResponse(child);
  }

  async update(
    parentId: string,
    childId: string,
    dto: UpdateChildDto,
  ): Promise<ChildResponseDto> {
    await this.findOwnedChild(parentId, childId);

    const child = await this.prisma.child.update({
      where: { id: childId },
      data: this.buildUpdateData(dto),
    });

    return mapChildToResponse(child);
  }

  async remove(parentId: string, childId: string): Promise<void> {
    await this.findOwnedChild(parentId, childId);
    await this.prisma.child.delete({ where: { id: childId } });
  }

  private async findOwnedChild(parentId: string, childId: string) {
    const child = await this.prisma.child.findFirst({
      where: { id: childId, parentId },
    });

    if (!child) {
      throw new NotFoundException('Child not found');
    }

    return child;
  }

  private buildUpdateData(dto: UpdateChildDto): Prisma.ChildUpdateInput {
    const data: Prisma.ChildUpdateInput = {};

    if (dto.fullName !== undefined) {
      data.fullName = dto.fullName;
    }
    if (dto.nickname !== undefined) {
      data.nickname = dto.nickname;
    }
    if (dto.dateOfBirth !== undefined) {
      data.dateOfBirth = new Date(dto.dateOfBirth);
    }
    if (dto.gender !== undefined) {
      data.gender = mapGenderToPrisma(dto.gender);
    }
    if (dto.grade !== undefined) {
      data.grade = mapGradeToPrisma(dto.grade);
    }
    if (dto.curricula !== undefined) {
      data.curricula = mapCurriculaToPrisma(dto.curricula);
    }
    if (dto.preferredLanguage !== undefined) {
      data.preferredLanguage = mapPreferredLanguageToPrisma(
        dto.preferredLanguage,
      );
    }
    if (dto.schoolName !== undefined) {
      data.schoolName = dto.schoolName;
    }

    return data;
  }
}
