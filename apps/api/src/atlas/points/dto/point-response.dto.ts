import { GoalPeriod, PointReason, RedemptionStatus } from '../points.enums';

export class PointGoalDto {
  period: GoalPeriod;
  target: number;
  progress: number;
  periodStart: string;
  periodEnd: string;
}

export class PointTransactionDto {
  id: string;
  amount: number;
  reason: PointReason;
  createdAt: Date;
}

export class PointsResponseDto {
  balance: number;
  goal: PointGoalDto | null;
  transactions: PointTransactionDto[];
}

export class AttemptPointsDto {
  earned: number;
  balance: number;
  goal: PointGoalDto | null;
  goalJustReached: boolean;
}

export class RewardDto {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  archived: boolean;
}

export class RedemptionDto {
  id: string;
  childId: string;
  rewardId: string;
  reward: RewardDto;
  cost: number;
  status: RedemptionStatus;
  requestedAt: Date;
  resolvedAt: Date | null;
}
