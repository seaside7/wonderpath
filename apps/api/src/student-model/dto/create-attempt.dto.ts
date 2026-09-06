import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PerceivedDifficulty } from '../enums/student-model.enums';

export class CreateAttemptDto {
  @IsString()
  @IsNotEmpty()
  learningSessionId: string;

  @IsString()
  @IsNotEmpty()
  questionId: string;

  @IsString()
  @IsNotEmpty()
  selectedAnswer: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  timeSpent: number;

  @IsBoolean()
  hintUsed: boolean;

  @IsEnum(PerceivedDifficulty)
  perceivedDifficulty: PerceivedDifficulty;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
