import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join, parse } from 'node:path';
import type {
  Curriculum as PrismaCurriculum,
  ExamMaterialExtractionStatus as PrismaExamMaterialExtractionStatus,
  ExamMaterialType as PrismaExamMaterialType,
  ExamPrepPlanStatus as PrismaExamPrepPlanStatus,
  ExamTopicStatus as PrismaExamTopicStatus,
  LearningSessionContext as PrismaLearningSessionContext,
  Prisma,
  Subject as PrismaSubject,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  EXAM_EXTRACTION_PROVIDER,
  ExamExtractionProvider,
} from './exam-extraction.provider';
import { EXAM_PREP_CONFIG } from './exam-prep.config';
import {
  mapCurriculumFromPrisma,
  mapCurriculumToPrisma,
} from '../child/child.mapper';
import {
  mapExamExtractionStatusToDisplay,
  mapExamMaterialTypeToDisplay,
  mapExamPrepContextToDisplay,
  mapExamPrepStatusToDisplay,
  mapExamTopicStatusToDisplay,
  mapLearningSessionContextToPrisma,
  mapSubjectFromPrisma,
  mapSubjectToPrisma,
} from './exam-prep.mapper';
import { CreateExamPrepDto, UploadExamMaterialDto } from './dto/exam-prep.dto';
import {
  ExamMaterialDto,
  ExamPrepPlanResponseDto,
  ExamPrepPriorityItemDto,
  ExamPrepPlanResponseDtoWithPriority,
  ExamTopicDto,
} from './dto/exam-prep-response.dto';
import { ExamTopicAction } from './dto/review-exam-topic.dto';
import type { LearningSessionContext } from '../learning-session/enums/learning-session.enums';

type PlanWithRelations = Prisma.ExamPrepPlanGetPayload<{
  include: {
    child: { select: { id: true; fullName: true } };
    materials: true;
    topics: { include: { learningObjective: true } };
  };
}>;

@Injectable()
export class ExamPrepService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EXAM_EXTRACTION_PROVIDER)
    private readonly extractionProvider: ExamExtractionProvider,
  ) {}

  async createPlan(
    parentId: string,
    dto: CreateExamPrepDto,
  ): Promise<ExamPrepPlanResponseDto> {
    const child = await this.prisma.child.findFirst({
      where: { id: dto.childId, parentId },
    });

    if (!child) {
      throw new NotFoundException('Child not found for this parent');
    }

    const plan = await this.prisma.examPrepPlan.create({
      data: {
        childId: dto.childId,
        subject: mapSubjectToPrisma(dto.subject),
        curriculum: mapCurriculumToPrisma(dto.curriculum),
        context: dto.context
          ? mapLearningSessionContextToPrisma(
              dto.context as unknown as LearningSessionContext,
            )
          : 'EXAM_TOMORROW',
        examDate: dto.examDate ? new Date(dto.examDate) : null,
      },
      include: { child: true, materials: true, topics: true },
    });

    return this.mapPlanToResponse(plan);
  }

  async getPlan(
    parentId: string,
    planId: string,
  ): Promise<ExamPrepPlanResponseDto> {
    const plan = await this.getOwnedPlan(parentId, planId);
    return this.mapPlanToResponse(plan);
  }

  async uploadMaterial(
    parentId: string,
    planId: string,
    dto: UploadExamMaterialDto,
  ): Promise<ExamMaterialDto> {
    await this.getOwnedPlan(parentId, planId);

    const materialType = EXAM_PREP_CONFIG.allowedMimeTypes[dto.mimeType];

    if (!materialType) {
      throw new BadRequestException(
        'Unsupported file type. Allowed: application/pdf, image/jpeg, image/png',
      );
    }

    const decoded = Buffer.from(dto.dataBase64, 'base64');

    if (decoded.length !== dto.fileSize) {
      throw new BadRequestException('File data does not match declared size');
    }

    if (decoded.length > EXAM_PREP_CONFIG.maxFileBytes) {
      throw new PayloadTooLargeException(
        `File exceeds the ${EXAM_PREP_CONFIG.maxFileBytes} byte limit`,
      );
    }

    const extension = this.extensionForMimeType(dto.mimeType);
    const storageKey = join(
      EXAM_PREP_CONFIG.uploadsRoot,
      planId,
      `${randomUUID()}.${extension}`,
    );

    await mkdir(join(EXAM_PREP_CONFIG.uploadsRoot, planId), {
      recursive: true,
    });

    let material = await this.prisma.examMaterial.create({
      data: {
        planId,
        fileName: parse(dto.fileName).base,
        mimeType: dto.mimeType,
        fileSize: dto.fileSize,
        storageKey,
        materialType,
        extractionStatus: 'PENDING',
      },
    });

    try {
      const extraction = await this.extractionProvider.extract({
        mimeType: dto.mimeType,
        fileSize: dto.fileSize,
        fileName: dto.fileName,
        content: decoded,
      });

      await writeFile(storageKey, decoded);

      material = await this.prisma.examMaterial.update({
        where: { id: material.id },
        data: {
          extractionStatus: 'EXTRACTED',
          extractedText: extraction.extractedText,
        },
      });

      await this.materializeTopics(planId, extraction.topics);
    } catch (error) {
      await unlink(storageKey).catch(() => undefined);

      material = await this.prisma.examMaterial.update({
        where: { id: material.id },
        data: {
          extractionStatus: 'FAILED',
          errorMessage:
            error instanceof Error ? error.message : 'Extraction failed',
        },
      });
    }

    return this.mapMaterialToResponse(material);
  }

  async reviewTopic(
    parentId: string,
    planId: string,
    topicId: string,
    action: ExamTopicAction,
  ): Promise<ExamTopicDto> {
    await this.getOwnedPlan(parentId, planId);

    const topic = await this.prisma.examTopic.findFirst({
      where: { id: topicId, planId },
      include: { learningObjective: true },
    });

    if (!topic) {
      throw new NotFoundException('Exam topic not found');
    }

    const updated = await this.prisma.examTopic.update({
      where: { id: topic.id },
      data: {
        status: action === ExamTopicAction.Confirm ? 'CONFIRMED' : 'REJECTED',
      },
      include: { learningObjective: true },
    });

    return this.mapTopicToResponse(updated);
  }

  async buildPriorityPlan(
    parentId: string,
    planId: string,
  ): Promise<ExamPrepPlanResponseDtoWithPriority> {
    const plan = await this.getOwnedPlan(parentId, planId);

    const positions = [...plan.topics]
      .filter((topic) => topic.status !== 'REJECTED')
      .map((topic) => ({
        topic,
        position: plan.topics.findIndex((entry) => entry.id === topic.id) + 1,
      }));

    const items: ExamPrepPriorityItemDto[] = [];

    for (const { topic, position } of positions) {
      let masteryScore: number | null = null;

      if (topic.learningObjectiveId) {
        const mastery = await this.prisma.studentMastery.findUnique({
          where: {
            childId_learningObjectiveId: {
              childId: plan.childId,
              learningObjectiveId: topic.learningObjectiveId,
            },
          },
        });

        masteryScore = mastery?.masteryScore ?? null;
      }

      items.push({
        position,
        label: topic.label,
        confidence: topic.confidence,
        mappedToLearningGraph: topic.learningObjectiveId !== null,
        learningObjectiveId: topic.learningObjectiveId,
        masteryScore,
        priority: 0,
      });
    }

    const sorted = items.sort((left, right) => {
      const leftActionable = left.mappedToLearningGraph;
      const rightActionable = right.mappedToLearningGraph;

      if (leftActionable !== rightActionable) {
        return leftActionable ? -1 : 1;
      }

      const leftScore = left.masteryScore ?? 0;
      const rightScore = right.masteryScore ?? 0;

      return leftScore - rightScore;
    });

    sorted.forEach((entry, index) => {
      entry.priority = index + 1;
    });

    return {
      id: plan.id,
      child: { id: plan.child.id, fullName: plan.child.fullName },
      subject: mapSubjectFromPrisma(plan.subject),
      curriculum: mapCurriculumFromPrisma(plan.curriculum),
      items: sorted,
    };
  }

  private async materializeTopics(
    planId: string,
    extracted: Array<{ label: string; confidence: number }>,
  ): Promise<void> {
    const plan = await this.prisma.examPrepPlan.findUniqueOrThrow({
      where: { id: planId },
    });

    const learningObjectives = await this.prisma.learningObjective.findMany({
      where: {
        subtopic: {
          topic: {
            subjectArea: { code: plan.subject },
          },
        },
      },
    });

    const existing = await this.prisma.examTopic.findMany({
      where: { planId },
      select: { label: true },
    });

    const existingLabels = new Set(
      existing.map((item) => item.label.toLowerCase()),
    );

    for (const candidate of extracted) {
      const normalized = candidate.label.toLowerCase();

      if (existingLabels.has(normalized)) {
        continue;
      }

      const match = learningObjectives.find((objective) =>
        objective.name.toLowerCase().includes(normalized),
      );

      await this.prisma.examTopic.create({
        data: {
          planId,
          learningObjectiveId: match?.id ?? null,
          label: candidate.label,
          confidence: candidate.confidence,
          status: 'CANDIDATE',
          source: 'mock-extractor',
        },
      });

      existingLabels.add(normalized);
    }
  }

  private async getOwnedPlan(
    parentId: string,
    planId: string,
  ): Promise<PlanWithRelations> {
    const plan = await this.prisma.examPrepPlan.findFirst({
      where: {
        id: planId,
        child: { parentId },
      },
      include: {
        child: { select: { id: true, fullName: true } },
        materials: true,
        topics: { include: { learningObjective: true } },
      },
    });

    if (!plan) {
      throw new NotFoundException('Exam prep plan not found');
    }

    return plan;
  }

  private extensionForMimeType(mimeType: string): string {
    const mapping: Record<string, string> = {
      'application/pdf': 'pdf',
      'image/jpeg': 'jpg',
      'image/png': 'png',
    };

    return mapping[mimeType];
  }

  private mapPlanToResponse(plan: {
    id: string;
    childId: string;
    subject: PrismaSubject;
    curriculum: PrismaCurriculum;
    context: PrismaLearningSessionContext;
    examDate: Date | null;
    status: PrismaExamPrepPlanStatus;
    materials: Array<{
      id: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
      materialType: PrismaExamMaterialType;
      extractionStatus: PrismaExamMaterialExtractionStatus;
      extractedText: string | null;
      errorMessage: string | null;
    }>;
    topics: Array<{
      id: string;
      label: string;
      confidence: number;
      status: PrismaExamTopicStatus;
      source: string;
      learningObjectiveId: string | null;
      learningObjective?: { id: string; name: string } | null;
    }>;
    child?: { id: string; fullName: string };
  }): ExamPrepPlanResponseDto {
    return {
      id: plan.id,
      child: plan.child ?? { id: plan.childId, fullName: '' },
      subject: mapSubjectFromPrisma(plan.subject),
      curriculum: mapCurriculumFromPrisma(plan.curriculum),
      context: mapExamPrepContextToDisplay(),
      examDate: plan.examDate ? plan.examDate.toISOString().slice(0, 10) : null,
      status: mapExamPrepStatusToDisplay(plan.status),
      materials: Array.isArray(plan.materials)
        ? plan.materials.map((material) => this.mapMaterialToResponse(material))
        : [],
      topics: Array.isArray(plan.topics)
        ? plan.topics.map((topic) => this.mapTopicToResponse(topic))
        : [],
    };
  }

  private mapMaterialToResponse(material: {
    id: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    materialType: PrismaExamMaterialType;
    extractionStatus: PrismaExamMaterialExtractionStatus;
    extractedText: string | null;
    errorMessage: string | null;
  }): ExamMaterialDto {
    return {
      id: material.id,
      fileName: material.fileName,
      mimeType: material.mimeType,
      fileSize: material.fileSize,
      materialType: mapExamMaterialTypeToDisplay(material.materialType),
      extractionStatus: mapExamExtractionStatusToDisplay(
        material.extractionStatus,
      ),
      extractedText: material.extractedText,
      errorMessage: material.errorMessage,
    };
  }

  private mapTopicToResponse(topic: {
    id: string;
    label: string;
    confidence: number;
    status: PrismaExamTopicStatus;
    source: string;
    learningObjectiveId: string | null;
    learningObjective?: { id: string; name: string } | null;
  }): ExamTopicDto {
    return {
      id: topic.id,
      label: topic.label,
      confidence: topic.confidence,
      status: mapExamTopicStatusToDisplay(topic.status),
      source: topic.source,
      learningObjectiveId: topic.learningObjectiveId,
      learningObjectiveName: topic.learningObjective?.name ?? null,
    };
  }
}
