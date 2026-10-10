import { Type } from 'class-transformer';
import { IsEnum, IsInt, Max, Min } from 'class-validator';
import { GoalPeriod } from '../points.enums';

export class SetPointGoalDto {
  @IsEnum(GoalPeriod)
  period: GoalPeriod;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  targetPoints: number;
}
