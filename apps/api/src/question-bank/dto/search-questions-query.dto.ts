import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Curriculum, Grade } from '../../child/enums/child.enums';
import { BankSubject } from '../enums/question-bank.enums';

export class SearchQuestionsQueryDto {
  @IsOptional()
  @IsEnum(BankSubject)
  subject?: BankSubject;

  @IsOptional()
  @IsEnum(Curriculum)
  curriculum?: Curriculum;

  @IsOptional()
  @IsEnum(Grade)
  grade?: Grade;

  @IsOptional()
  @IsString()
  topicId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty?: number;
}
