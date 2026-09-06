import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GenerationStatus as PrismaGenerationStatus,
  LearningObjective,
  Prisma,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  mapCurriculumFromPrisma,
  mapCurriculumToPrisma,
  mapGradeFromPrisma,
  mapGradeToPrisma,
} from '../child/child.mapper';
import {
  mapQuestionTypeFromPrisma,
  mapQuestionTypeToPrisma,
  questionHierarchyInclude,
} from '../question-bank/question.mapper';
import { CreateGenerationDto } from './dto/create-generation.dto';
import { GenerationResponseDto } from './dto/generation-response.dto';
import { RetryGenerationDto } from './dto/retry-generation.dto';
import { mapGenerationToResponse } from './content-generation.mapper';
import { ContentGenerationServiceToken } from './content-generation.tokens';
import { validateGeneratedSeeds } from './content-generation.validator';
import type {
  ContentGenerator,
  GenerationRequest,
} from './providers/content-generator.interface';
import type { Curriculum, Grade } from '../child/enums/child.enums';
import type { QuestionType } from '../question-bank/enums/question-bank.enums';

type LearningObjectiveWithGraph = LearningObjective & {
  subtopic: {
    id: string;
    name: string;
    topic: {
      id: string;
      name: string;
      subjectArea: { id: string; code: string; name: string };
    };
  };
};

type GenerationFields = {
  curriculum: Curriculum;
  grade: Grade;
  questionType: QuestionType;
  difficulty: number;
  quantity: number;
  providerOptions?: Record<string, unknown>;
};

const learningObjectiveGraphInclude = {
  subtopic: {
    include: {
      topic: {
        include: {
          subjectArea: true,
        },
      },
    },
  },
} as const;

const generationInclude = {
  topic: {
    include: {
      subjectArea: true,
    },
  },
  learningObjective: {
    select: { id: true, name: true },
  },
  questions: {
    include: questionHierarchyInclude,
  },
} as const;

@Injectable()
export class ContentGenerationService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ContentGenerationServiceToken)
    private readonly generator: ContentGenerator,
  ) {}

  async create(dto: CreateGenerationDto): Promise<GenerationResponseDto> {
    const objective = await this.prisma.learningObjective.findUnique({
      where: { id: dto.learningObjectiveId },
      include: learningObjectiveGraphInclude,
    });

    if (!objective) {
      throw new NotFoundException('Learning objective not found');
    }

    const topic = objective.subtopic.topic;

    const generation = await this.prisma.questionGeneration.create({
      data: {
        status: PrismaGenerationStatus.PENDING,
        curriculum: mapCurriculumToPrisma(dto.curriculum),
        grade: mapGradeToPrisma(dto.grade),
        subject: topic.subjectArea.code,
        topicId: topic.id,
        learningObjectiveId: objective.id,
        questionType: mapQuestionTypeToPrisma(dto.questionType),
        difficulty: dto.difficulty,
        quantity: dto.quantity,
        provider: this.generator.provider,
        model: this.generator.model,
        generationMetadata: buildGenerationMetadata(
          dto,
        ) as Prisma.InputJsonValue,
      },
    });

    return this.executeGeneration(generation.id, objective, dto);
  }

  async retry(
    id: string,
    dto: RetryGenerationDto,
  ): Promise<GenerationResponseDto> {
    const generation = await this.prisma.questionGeneration.findUnique({
      where: { id },
      include: {
        learningObjective: {
          include: learningObjectiveGraphInclude,
        },
      },
    });

    if (!generation) {
      throw new NotFoundException('Generation not found');
    }

    if (generation.status === PrismaGenerationStatus.COMPLETED) {
      throw new BadRequestException(
        'Generation has already completed and cannot be retried',
      );
    }

    const storedMetadata = generation.generationMetadata as Record<
      string,
      unknown
    > | null;

    const providerOptions =
      dto.providerOptions ??
      (storedMetadata?.providerOptions as Record<string, unknown> | undefined);

    await this.prisma.questionGeneration.update({
      where: { id: generation.id },
      data: {
        status: PrismaGenerationStatus.PENDING,
        error: null,
        provider: this.generator.provider,
        model: this.generator.model,
        generationMetadata: {
          ...(storedMetadata ?? {}),
          providerOptions: providerOptions ?? {},
          retriedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });

    return this.executeGeneration(id, generation.learningObjective, {
      curriculum: mapCurriculumFromPrisma(generation.curriculum),
      grade: mapGradeFromPrisma(generation.grade),
      questionType: mapQuestionTypeFromPrisma(generation.questionType),
      difficulty: generation.difficulty,
      quantity: generation.quantity,
      providerOptions,
    });
  }

  async findOne(id: string): Promise<GenerationResponseDto> {
    const generation = await this.prisma.questionGeneration.findUnique({
      where: { id },
      include: generationInclude,
    });

    if (!generation) {
      throw new NotFoundException('Generation not found');
    }

    return mapGenerationToResponse(generation);
  }

  private async executeGeneration(
    generationId: string,
    objective: LearningObjectiveWithGraph,
    fields: GenerationFields,
  ): Promise<GenerationResponseDto> {
    const topic = objective.subtopic.topic;
    const subjectArea = topic.subjectArea;

    const request: GenerationRequest = {
      learningObjective: {
        id: objective.id,
        name: objective.name,
        description: objective.description,
      },
      topicName: topic.name,
      subtopicName: objective.subtopic.name,
      subject: subjectArea.code,
      curriculum: fields.curriculum,
      grade: fields.grade,
      questionType: fields.questionType,
      difficulty: fields.difficulty,
      quantity: fields.quantity,
      providerOptions: fields.providerOptions,
    };

    try {
      const seeds = await this.generator.generateQuestions(request);
      validateGeneratedSeeds(seeds, fields.quantity);

      await this.prisma.$transaction(async (tx) => {
        for (const seed of seeds) {
          await tx.question.create({
            data: {
              questionText: seed.questionText,
              questionType: mapQuestionTypeToPrisma(seed.questionType),
              options: seed.options,
              correctAnswer: seed.correctAnswer,
              explanation: seed.explanation,
              curriculum: mapCurriculumToPrisma(fields.curriculum),
              grade: mapGradeToPrisma(fields.grade),
              difficulty: seed.difficulty,
              learningObjectiveId: objective.id,
              generationId,
            },
          });
        }

        await tx.questionGeneration.update({
          where: { id: generationId },
          data: {
            status: PrismaGenerationStatus.COMPLETED,
            error: null,
          },
        });
      });

      return this.findOne(generationId);
    } catch (error) {
      await this.markFailed(generationId, error);
      return this.findOne(generationId);
    }
  }

  private async markFailed(
    generationId: string,
    error: unknown,
  ): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);

    await this.prisma.questionGeneration.update({
      where: { id: generationId },
      data: {
        status: PrismaGenerationStatus.FAILED,
        error: message,
      },
    });
  }
}

function buildGenerationMetadata(dto: CreateGenerationDto) {
  return {
    requestedAt: new Date().toISOString(),
    ...(dto.providerOptions ? { providerOptions: dto.providerOptions } : {}),
  };
}
