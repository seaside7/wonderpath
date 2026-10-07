import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Curriculum, Grade, PreferredLanguage } from '../../../child/enums/child.enums';
import { QuestionType } from '../../../question-bank/enums/question-bank.enums';

export class CreateGenerationDto {
  @IsString()
  @IsNotEmpty()
  learningObjectiveId: string;

  @IsEnum(Curriculum)
  curriculum: Curriculum;

  @IsEnum(Grade)
  grade: Grade;

  @IsEnum(QuestionType)
  questionType: QuestionType;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  quantity: number;

  @IsOptional()
  @IsObject()
  providerOptions?: Record<string, unknown>;

  /**
   * Language for generated question text, options, and explanations.
   * Defaults to English if omitted.
   * Use BahasaIndonesia for Kurikulum Nasional/Merdeka Math content.
   */
  @IsOptional()
  @IsEnum(PreferredLanguage)
  language?: PreferredLanguage;
}
