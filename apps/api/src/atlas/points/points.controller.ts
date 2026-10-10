import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SetPointGoalDto } from './dto/point-goal.dto';
import { RedeemDto } from './dto/redeem.dto';
import { RedemptionQueryDto } from './dto/redemption-query.dto';
import { CreateRewardDto, UpdateRewardDto } from './dto/reward.dto';
import {
  PointGoalDto,
  PointsResponseDto,
  RedemptionDto,
  RewardDto,
} from './dto/point-response.dto';
import { RedemptionStatus } from './points.enums';
import { PointsService } from './points.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class PointsController {
  constructor(private readonly points: PointsService) {}

  @Get('children/:childId/points')
  getPoints(
    @Req() req: { user: { id: string } },
    @Param('childId') childId: string,
  ): Promise<PointsResponseDto> {
    return this.points.getPoints(req.user.id, childId);
  }

  @Put('children/:childId/point-goal')
  setGoal(
    @Req() req: { user: { id: string } },
    @Param('childId') childId: string,
    @Body() dto: SetPointGoalDto,
  ): Promise<PointGoalDto> {
    return this.points.setGoal(
      req.user.id,
      childId,
      dto.period,
      dto.targetPoints,
    );
  }

  @Delete('children/:childId/point-goal')
  async deleteGoal(
    @Req() req: { user: { id: string } },
    @Param('childId') childId: string,
  ): Promise<void> {
    await this.points.clearGoal(req.user.id, childId);
  }

  @Get('children/:childId/rewards')
  listRewards(
    @Req() req: { user: { id: string } },
    @Param('childId') childId: string,
  ): Promise<RewardDto[]> {
    return this.points.listRewards(req.user.id, childId);
  }

  @Post('children/:childId/rewards')
  createReward(
    @Req() req: { user: { id: string } },
    @Param('childId') childId: string,
    @Body() dto: CreateRewardDto,
  ): Promise<RewardDto> {
    return this.points.createReward(req.user.id, childId, dto);
  }

  @Patch('rewards/:rewardId')
  updateReward(
    @Req() req: { user: { id: string } },
    @Param('rewardId') rewardId: string,
    @Body() dto: UpdateRewardDto,
  ): Promise<RewardDto> {
    return this.points.updateReward(req.user.id, rewardId, dto);
  }

  @Delete('rewards/:rewardId')
  async archiveReward(
    @Req() req: { user: { id: string } },
    @Param('rewardId') rewardId: string,
  ): Promise<void> {
    await this.points.archiveReward(req.user.id, rewardId);
  }

  @Post('rewards/:rewardId/redeem')
  redeem(
    @Req() req: { user: { id: string } },
    @Param('rewardId') rewardId: string,
    @Body() dto: RedeemDto,
  ): Promise<RedemptionDto> {
    return this.points.redeem(req.user.id, dto.childId, rewardId);
  }

  @Get('children/:childId/redemptions')
  listRedemptions(
    @Req() req: { user: { id: string } },
    @Param('childId') childId: string,
    @Query() query: RedemptionQueryDto,
  ): Promise<RedemptionDto[]> {
    return this.points.listRedemptions(req.user.id, childId, query.status);
  }

  @Post('redemptions/:redemptionId/approve')
  approve(
    @Req() req: { user: { id: string } },
    @Param('redemptionId') redemptionId: string,
  ): Promise<RedemptionDto> {
    return this.points.resolveRedemption(
      req.user.id,
      redemptionId,
      RedemptionStatus.Approved,
    );
  }

  @Post('redemptions/:redemptionId/decline')
  decline(
    @Req() req: { user: { id: string } },
    @Param('redemptionId') redemptionId: string,
  ): Promise<RedemptionDto> {
    return this.points.resolveRedemption(
      req.user.id,
      redemptionId,
      RedemptionStatus.Declined,
    );
  }
}
