import { IsNotEmpty, IsString } from 'class-validator';

export class AcceptRecommendationDto {
  @IsString()
  @IsNotEmpty()
  learningObjectiveId: string;
}
