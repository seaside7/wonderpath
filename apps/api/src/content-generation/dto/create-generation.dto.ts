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
import { Curriculum, Grade } from '../../child/enums/child.enums';
import { QuestionType } from '../../question-bank/enums/question-bank.enums';

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
}
