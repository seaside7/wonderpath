import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Curriculum } from '../../child/enums/child.enums';
import {
  LearningSessionContext,
  Subject,
} from '../enums/learning-session.enums';

export class StartLearningSessionDto {
  @IsString()
  @IsNotEmpty()
  childId: string;

  @IsEnum(Curriculum)
  curriculum: Curriculum;

  @IsEnum(Subject)
  subject: Subject;

  @IsOptional()
  @IsEnum(LearningSessionContext)
  context?: LearningSessionContext;
}
