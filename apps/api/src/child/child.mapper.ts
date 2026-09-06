import {
  Curriculum as PrismaCurriculum,
  Gender as PrismaGender,
  Grade as PrismaGrade,
  PreferredLanguage as PrismaPreferredLanguage,
  Child,
} from '../../generated/prisma/client';
import {
  Curriculum,
  Gender,
  Grade,
  PreferredLanguage,
} from './enums/child.enums';
import { ChildResponseDto } from './dto/child-response.dto';

const genderToPrisma: Record<Gender, PrismaGender> = {
  [Gender.Boy]: PrismaGender.BOY,
  [Gender.Girl]: PrismaGender.GIRL,
};

const genderFromPrisma: Record<PrismaGender, Gender> = {
  [PrismaGender.BOY]: Gender.Boy,
  [PrismaGender.GIRL]: Gender.Girl,
};

const gradeToPrisma: Record<Grade, PrismaGrade> = {
  [Grade.Grade1]: PrismaGrade.GRADE_1,
  [Grade.Grade2]: PrismaGrade.GRADE_2,
  [Grade.Grade3]: PrismaGrade.GRADE_3,
  [Grade.Grade4]: PrismaGrade.GRADE_4,
  [Grade.Grade5]: PrismaGrade.GRADE_5,
  [Grade.Grade6]: PrismaGrade.GRADE_6,
};

const gradeFromPrisma: Record<PrismaGrade, Grade> = {
  [PrismaGrade.GRADE_1]: Grade.Grade1,
  [PrismaGrade.GRADE_2]: Grade.Grade2,
  [PrismaGrade.GRADE_3]: Grade.Grade3,
  [PrismaGrade.GRADE_4]: Grade.Grade4,
  [PrismaGrade.GRADE_5]: Grade.Grade5,
  [PrismaGrade.GRADE_6]: Grade.Grade6,
};

const curriculumToPrisma: Record<Curriculum, PrismaCurriculum> = {
  [Curriculum.IB]: PrismaCurriculum.IB,
  [Curriculum.Cambridge]: PrismaCurriculum.CAMBRIDGE,
  [Curriculum.Merdeka]: PrismaCurriculum.MERDEKA,
  [Curriculum.Nasional]: PrismaCurriculum.NASIONAL,
};

const curriculumFromPrisma: Record<PrismaCurriculum, Curriculum> = {
  [PrismaCurriculum.IB]: Curriculum.IB,
  [PrismaCurriculum.CAMBRIDGE]: Curriculum.Cambridge,
  [PrismaCurriculum.MERDEKA]: Curriculum.Merdeka,
  [PrismaCurriculum.NASIONAL]: Curriculum.Nasional,
};

const languageToPrisma: Record<PreferredLanguage, PrismaPreferredLanguage> = {
  [PreferredLanguage.English]: PrismaPreferredLanguage.ENGLISH,
  [PreferredLanguage.BahasaIndonesia]: PrismaPreferredLanguage.BAHASA_INDONESIA,
};

const languageFromPrisma: Record<PrismaPreferredLanguage, PreferredLanguage> = {
  [PrismaPreferredLanguage.ENGLISH]: PreferredLanguage.English,
  [PrismaPreferredLanguage.BAHASA_INDONESIA]: PreferredLanguage.BahasaIndonesia,
};

export function mapGenderToPrisma(gender: Gender): PrismaGender {
  return genderToPrisma[gender];
}

export function mapGradeToPrisma(grade: Grade): PrismaGrade {
  return gradeToPrisma[grade];
}

export function mapGradeFromPrisma(grade: PrismaGrade): Grade {
  return gradeFromPrisma[grade];
}

export function mapCurriculumToPrisma(
  curriculum: Curriculum,
): PrismaCurriculum {
  return curriculumToPrisma[curriculum];
}

export function mapCurriculumFromPrisma(
  curriculum: PrismaCurriculum,
): Curriculum {
  return curriculumFromPrisma[curriculum];
}

export function mapCurriculaToPrisma(
  curricula: Curriculum[],
): PrismaCurriculum[] {
  return curricula.map((curriculum) => curriculumToPrisma[curriculum]);
}

export function mapPreferredLanguageToPrisma(
  language: PreferredLanguage,
): PrismaPreferredLanguage {
  return languageToPrisma[language];
}

export function mapChildToResponse(child: Child): ChildResponseDto {
  return {
    id: child.id,
    fullName: child.fullName,
    nickname: child.nickname,
    dateOfBirth: child.dateOfBirth.toISOString().slice(0, 10),
    gender: genderFromPrisma[child.gender],
    grade: gradeFromPrisma[child.grade],
    curricula: child.curricula.map(
      (curriculum) => curriculumFromPrisma[curriculum],
    ),
    preferredLanguage: languageFromPrisma[child.preferredLanguage],
    schoolName: child.schoolName,
    createdAt: child.createdAt,
    updatedAt: child.updatedAt,
  };
}
