import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class CreateRewardDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  emoji: string;

  @IsInt()
  @Min(1)
  @Max(100000)
  cost: number;
}

export class UpdateRewardDto extends CreateRewardDto {}
