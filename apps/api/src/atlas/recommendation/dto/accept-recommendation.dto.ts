import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Grade } from '../../../child/enums/child.enums';

export class AcceptRecommendationDto {
  @IsString()
  @IsNotEmpty()
  learningObjectiveId: string;

  @IsOptional()
  @IsEnum(Grade)
  grade?: Grade;
}
