import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
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
import { QuestionType } from '../enums/question-bank.enums';

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  questionText: string;

  @IsEnum(QuestionType)
  questionType: QuestionType;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  options: string[];

  @IsString()
  @IsNotEmpty()
  correctAnswer: string;

  @IsString()
  @IsNotEmpty()
  explanation: string;

  @IsString()
  @IsNotEmpty()
  learningObjectiveId: string;

  @IsEnum(Curriculum)
  curriculum: Curriculum;

  @IsEnum(Grade)
  grade: Grade;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
