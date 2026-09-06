import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Curriculum } from '../../child/enums/child.enums';
import { Subject } from '../../learning-session/enums/learning-session.enums';
import { EXAM_PREP_CONFIG } from '../exam-prep.config';
import { ExamPrepContext } from '../enums/exam-prep.enums';

export class CreateExamPrepDto {
  @IsString()
  @IsNotEmpty()
  childId: string;

  @IsEnum(Curriculum)
  curriculum: Curriculum;

  @IsEnum(Subject)
  subject: Subject;

  @IsOptional()
  @IsEnum(ExamPrepContext)
  context?: ExamPrepContext;

  @IsOptional()
  @IsDateString()
  examDate?: string;
}

export class UploadExamMaterialDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(EXAM_PREP_CONFIG.maxFileBytes)
  fileSize: number;

  @IsString()
  @IsNotEmpty()
  dataBase64: string;
}
