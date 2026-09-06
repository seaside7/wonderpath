import { IsNotEmpty, IsString } from 'class-validator';

export class GetCurrentLearningSessionQueryDto {
  @IsString()
  @IsNotEmpty()
  childId: string;
}
