import {
  Curriculum as PrismaCurriculum,
  Grade as PrismaGrade,
  Question,
  QuestionType as PrismaQuestionType,
  Subject as PrismaSubject,
} from '../../generated/prisma/client';
import { Curriculum, Grade } from '../child/enums/child.enums';
import {
  mapCurriculumFromPrisma,
  mapCurriculumToPrisma,
  mapGradeFromPrisma,
  mapGradeToPrisma,
} from '../child/child.mapper';
import { QuestionResponseDto } from './dto/question-response.dto';
import { BankSubject, QuestionType } from './enums/question-bank.enums';

const questionTypeToPrisma: Record<QuestionType, PrismaQuestionType> = {
  [QuestionType.MultipleChoice]: PrismaQuestionType.MULTIPLE_CHOICE,
  [QuestionType.TrueFalse]: PrismaQuestionType.TRUE_FALSE,
};

const questionTypeFromPrisma: Record<PrismaQuestionType, QuestionType> = {
  [PrismaQuestionType.MULTIPLE_CHOICE]: QuestionType.MultipleChoice,
  [PrismaQuestionType.TRUE_FALSE]: QuestionType.TrueFalse,
};

const subjectFromPrisma: Record<PrismaSubject, BankSubject> = {
  [PrismaSubject.MATHEMATICS]: BankSubject.Mathematics,
  [PrismaSubject.ENGLISH]: BankSubject.English,
};

const subjectToPrisma: Record<BankSubject, PrismaSubject> = {
  [BankSubject.Mathematics]: PrismaSubject.MATHEMATICS,
  [BankSubject.English]: PrismaSubject.ENGLISH,
};

export type QuestionWithHierarchy = Question & {
  learningObjective: {
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
          code: PrismaSubject;
          name: string;
        };
      };
    };
  };
};

export const questionHierarchyInclude = {
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

export function mapQuestionTypeToPrisma(
  type: QuestionType,
): PrismaQuestionType {
  return questionTypeToPrisma[type];
}

export function mapQuestionTypeFromPrisma(
  type: PrismaQuestionType,
): QuestionType {
  return questionTypeFromPrisma[type];
}

export function mapSubjectToPrisma(subject: BankSubject): PrismaSubject {
  return subjectToPrisma[subject];
}

export function mapSubjectFromPrisma(subject: PrismaSubject): BankSubject {
  return subjectFromPrisma[subject];
}

export function mapGradeToPrismaForQuestion(grade: Grade): PrismaGrade {
  return mapGradeToPrisma(grade);
}

export function mapGradeFromPrismaForQuestion(grade: PrismaGrade): Grade {
  return mapGradeFromPrisma(grade);
}

export function mapCurriculumToPrismaForQuestion(
  curriculum: Curriculum,
): PrismaCurriculum {
  return mapCurriculumToPrisma(curriculum);
}

export function mapCurriculumFromPrismaForQuestion(
  curriculum: PrismaCurriculum,
): Curriculum {
  return mapCurriculumFromPrisma(curriculum);
}

export function mapQuestionToResponse(
  question: QuestionWithHierarchy,
): QuestionResponseDto {
  const { learningObjective } = question;
  const { subtopic } = learningObjective;
  const { topic } = subtopic;
  const { subjectArea } = topic;

  return {
    id: question.id,
    questionText: question.questionText,
    questionType: mapQuestionTypeFromPrisma(question.questionType),
    options: question.options as string[],
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    curriculum: mapCurriculumFromPrismaForQuestion(question.curriculum),
    grade: mapGradeFromPrismaForQuestion(question.grade),
    difficulty: question.difficulty,
    metadata: (question.metadata as Record<string, unknown> | null) ?? null,
    hierarchy: {
      subject: {
        id: subjectArea.id,
        code: mapSubjectFromPrisma(subjectArea.code),
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
      learningObjective: {
        id: learningObjective.id,
        name: learningObjective.name,
        description: learningObjective.description,
        estimatedMasteryTime: learningObjective.estimatedMasteryTime,
      },
    },
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
  };
}
