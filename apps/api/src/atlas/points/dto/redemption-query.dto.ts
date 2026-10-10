import { IsEnum, IsOptional } from 'class-validator';
import { RedemptionStatus } from '../points.enums';

export class RedemptionQueryDto {
  @IsOptional()
  @IsEnum(RedemptionStatus)
  status?: RedemptionStatus;
}
