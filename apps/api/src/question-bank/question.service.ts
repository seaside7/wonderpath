import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { QuestionResponseDto } from './dto/question-response.dto';
import { SearchQuestionsQueryDto } from './dto/search-questions-query.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import {
  mapCurriculumToPrismaForQuestion,
  mapGradeToPrismaForQuestion,
  mapQuestionToResponse,
  mapQuestionTypeFromPrisma,
  mapQuestionTypeToPrisma,
  mapSubjectToPrisma,
  questionHierarchyInclude,
} from './question.mapper';
import {
  validateQuestionPayload,
  validateQuestionUpdate,
} from './question.validator';

@Injectable()
export class QuestionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateQuestionDto): Promise<QuestionResponseDto> {
    await this.ensureLearningObjectiveExists(dto.learningObjectiveId);
    validateQuestionPayload(dto);

    const question = await this.prisma.question.create({
      data: {
        questionText: dto.questionText,
        questionType: mapQuestionTypeToPrisma(dto.questionType),
        options: dto.options,
        correctAnswer: dto.correctAnswer,
        explanation: dto.explanation,
        curriculum: mapCurriculumToPrismaForQuestion(dto.curriculum),
        grade: mapGradeToPrismaForQuestion(dto.grade),
        difficulty: dto.difficulty,
        learningObjectiveId: dto.learningObjectiveId,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
      include: questionHierarchyInclude,
    });

    return mapQuestionToResponse(question);
  }

  async findAll(
    query: SearchQuestionsQueryDto,
  ): Promise<QuestionResponseDto[]> {
    const where = this.buildSearchWhere(query);

    const questions = await this.prisma.question.findMany({
      where,
      include: questionHierarchyInclude,
      orderBy: { createdAt: 'desc' },
    });

    return questions.map(mapQuestionToResponse);
  }

  async findOne(id: string): Promise<QuestionResponseDto> {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: questionHierarchyInclude,
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    return mapQuestionToResponse(question);
  }

  async update(
    id: string,
    dto: UpdateQuestionDto,
  ): Promise<QuestionResponseDto> {
    const existing = await this.prisma.question.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Question not found');
    }

    if (dto.learningObjectiveId) {
      await this.ensureLearningObjectiveExists(dto.learningObjectiveId);
    }

    validateQuestionUpdate(
      {
        questionType: mapQuestionTypeFromPrisma(existing.questionType),
        options: existing.options as string[],
        correctAnswer: existing.correctAnswer,
      },
      dto,
    );

    const question = await this.prisma.question.update({
      where: { id },
      data: this.buildUpdateData(dto),
      include: questionHierarchyInclude,
    });

    return mapQuestionToResponse(question);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.question.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Question not found');
    }

    try {
      await this.prisma.question.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Question cannot be deleted because it has attempt history',
        );
      }
      throw error;
    }
  }

  private async ensureLearningObjectiveExists(
    learningObjectiveId: string,
  ): Promise<void> {
    const objective = await this.prisma.learningObjective.findUnique({
      where: { id: learningObjectiveId },
    });

    if (!objective) {
      throw new NotFoundException('Learning objective not found');
    }
  }

  private buildSearchWhere(
    query: SearchQuestionsQueryDto,
  ): Prisma.QuestionWhereInput {
    const where: Prisma.QuestionWhereInput = {};

    if (query.curriculum) {
      where.curriculum = mapCurriculumToPrismaForQuestion(query.curriculum);
    }

    if (query.grade) {
      where.grade = mapGradeToPrismaForQuestion(query.grade);
    }

    if (query.difficulty) {
      where.difficulty = query.difficulty;
    }

    if (query.topicId || query.subject) {
      where.learningObjective = {
        subtopic: {
          topic: {
            ...(query.topicId ? { id: query.topicId } : {}),
            ...(query.subject
              ? {
                  subjectArea: {
                    code: mapSubjectToPrisma(query.subject),
                  },
                }
              : {}),
          },
        },
      };
    }

    return where;
  }

  private buildUpdateData(dto: UpdateQuestionDto): Prisma.QuestionUpdateInput {
    const data: Prisma.QuestionUpdateInput = {};

    if (dto.questionText !== undefined) {
      data.questionText = dto.questionText;
    }
    if (dto.questionType !== undefined) {
      data.questionType = mapQuestionTypeToPrisma(dto.questionType);
    }
    if (dto.options !== undefined) {
      data.options = dto.options;
    }
    if (dto.correctAnswer !== undefined) {
      data.correctAnswer = dto.correctAnswer;
    }
    if (dto.explanation !== undefined) {
      data.explanation = dto.explanation;
    }
    if (dto.curriculum !== undefined) {
      data.curriculum = mapCurriculumToPrismaForQuestion(dto.curriculum);
    }
    if (dto.grade !== undefined) {
      data.grade = mapGradeToPrismaForQuestion(dto.grade);
    }
    if (dto.difficulty !== undefined) {
      data.difficulty = dto.difficulty;
    }
    if (dto.learningObjectiveId !== undefined) {
      data.learningObjective = {
        connect: { id: dto.learningObjectiveId },
      };
    }
    if (dto.metadata !== undefined) {
      data.metadata = dto.metadata as Prisma.InputJsonValue;
    }

    return data;
  }
}
