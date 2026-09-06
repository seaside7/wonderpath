import {
  Curriculum as PrismaCurriculum,
  LearningSession,
  LearningSessionContext as PrismaLearningSessionContext,
  LearningSessionStatus as PrismaLearningSessionStatus,
  Subject as PrismaSubject,
} from '../../generated/prisma/client';
import { Curriculum } from '../child/enums/child.enums';
import {
  mapCurriculumFromPrisma,
  mapCurriculumToPrisma,
} from '../child/child.mapper';
import {
  LearningSessionContext,
  LearningSessionStatus,
  Subject,
} from './enums/learning-session.enums';
import { LearningSessionResponseDto } from './dto/learning-session-response.dto';

const subjectToPrisma: Record<Subject, PrismaSubject> = {
  [Subject.Mathematics]: PrismaSubject.MATHEMATICS,
  [Subject.English]: PrismaSubject.ENGLISH,
};

const subjectFromPrisma: Record<PrismaSubject, Subject> = {
  [PrismaSubject.MATHEMATICS]: Subject.Mathematics,
  [PrismaSubject.ENGLISH]: Subject.English,
};

const statusFromPrisma: Record<
  PrismaLearningSessionStatus,
  LearningSessionStatus
> = {
  [PrismaLearningSessionStatus.STARTED]: LearningSessionStatus.Started,
  [PrismaLearningSessionStatus.COMPLETED]: LearningSessionStatus.Completed,
  [PrismaLearningSessionStatus.CANCELLED]: LearningSessionStatus.Cancelled,
};

const contextToPrisma: Record<
  LearningSessionContext,
  PrismaLearningSessionContext
> = {
  [LearningSessionContext.NormalLearning]:
    PrismaLearningSessionContext.NORMAL_LEARNING,
  [LearningSessionContext.ExamTomorrow]:
    PrismaLearningSessionContext.EXAM_TOMORROW,
  [LearningSessionContext.HomeworkHelp]:
    PrismaLearningSessionContext.HOMEWORK_HELP,
  [LearningSessionContext.QuickSession]:
    PrismaLearningSessionContext.QUICK_SESSION,
};

const contextFromPrisma: Record<
  PrismaLearningSessionContext,
  LearningSessionContext
> = {
  [PrismaLearningSessionContext.NORMAL_LEARNING]:
    LearningSessionContext.NormalLearning,
  [PrismaLearningSessionContext.EXAM_TOMORROW]:
    LearningSessionContext.ExamTomorrow,
  [PrismaLearningSessionContext.HOMEWORK_HELP]:
    LearningSessionContext.HomeworkHelp,
  [PrismaLearningSessionContext.QUICK_SESSION]:
    LearningSessionContext.QuickSession,
};

export function mapSubjectToPrisma(subject: Subject): PrismaSubject {
  return subjectToPrisma[subject];
}

export function mapSubjectFromPrisma(subject: PrismaSubject): Subject {
  return subjectFromPrisma[subject];
}

export function mapLearningSessionContextToPrisma(
  context: LearningSessionContext,
): PrismaLearningSessionContext {
  return contextToPrisma[context];
}

export function mapLearningSessionContextFromPrisma(
  context: PrismaLearningSessionContext,
): LearningSessionContext {
  return contextFromPrisma[context];
}

type SessionWithChild = LearningSession & {
  child: { id: string; fullName: string };
  focusLearningObjective?: { id: string; name: string } | null;
};

export function mapLearningSessionToResponse(
  session: SessionWithChild,
): LearningSessionResponseDto {
  return {
    id: session.id,
    child: {
      id: session.child.id,
      fullName: session.child.fullName,
    },
    curriculum: mapCurriculumFromPrisma(session.curriculum),
    subject: mapSubjectFromPrisma(session.subject),
    status: statusFromPrisma[session.status],
    context: mapLearningSessionContextFromPrisma(session.context),
    focusLearningObjective: session.focusLearningObjective
      ? {
          id: session.focusLearningObjective.id,
          name: session.focusLearningObjective.name,
        }
      : null,
    startedAt: session.startedAt,
  };
}

export function isCurriculumSupported(
  childCurricula: PrismaCurriculum[],
  curriculum: Curriculum,
): boolean {
  return childCurricula.includes(mapCurriculumToPrisma(curriculum));
}
