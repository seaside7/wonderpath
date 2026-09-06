import {
  GenerationStatus as PrismaGenerationStatus,
  QuestionGeneration,
} from '../../generated/prisma/client';
import {
  mapCurriculumFromPrisma,
  mapGradeFromPrisma,
} from '../child/child.mapper';
import {
  mapQuestionToResponse,
  mapQuestionTypeFromPrisma,
  mapSubjectFromPrisma,
  QuestionWithHierarchy,
} from '../question-bank/question.mapper';
import { GenerationResponseDto } from './dto/generation-response.dto';
import { GenerationStatus } from './enums/content-generation.enums';

const generationStatusFromPrisma: Record<
  PrismaGenerationStatus,
  GenerationStatus
> = {
  [PrismaGenerationStatus.PENDING]: GenerationStatus.Pending,
  [PrismaGenerationStatus.COMPLETED]: GenerationStatus.Completed,
  [PrismaGenerationStatus.FAILED]: GenerationStatus.Failed,
};

export type GenerationWithRelations = QuestionGeneration & {
  topic: {
    id: string;
    name: string;
    subjectArea: {
      id: string;
      code: import('../../generated/prisma/client').Subject;
      name: string;
    };
  };
  learningObjective: { id: string; name: string };
  questions: QuestionWithHierarchy[];
};

export function mapGenerationToResponse(
  generation: GenerationWithRelations,
): GenerationResponseDto {
  return {
    id: generation.id,
    status: generationStatusFromPrisma[generation.status],
    curriculum: mapCurriculumFromPrisma(generation.curriculum),
    grade: mapGradeFromPrisma(generation.grade),
    subject: {
      id: generation.topic.subjectArea.id,
      code: mapSubjectFromPrisma(generation.topic.subjectArea.code),
      name: generation.topic.subjectArea.name,
    },
    topic: {
      id: generation.topic.id,
      name: generation.topic.name,
    },
    learningObjective: {
      id: generation.learningObjective.id,
      name: generation.learningObjective.name,
    },
    questionType: mapQuestionTypeFromPrisma(generation.questionType),
    difficulty: generation.difficulty,
    quantity: generation.quantity,
    provider: generation.provider,
    model: generation.model,
    generationMetadata: generation.generationMetadata as Record<
      string,
      unknown
    > | null,
    error: generation.error,
    questions: generation.questions.map(mapQuestionToResponse),
    createdAt: generation.createdAt,
    updatedAt: generation.updatedAt,
  };
}
