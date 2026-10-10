import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  PointReason as PrismaPointReason,
  RedemptionStatus as PrismaRedemptionStatus,
} from '../../../generated/prisma/client';
import { getOwnedChild } from '../../common/get-owned-child';
import { PrismaService } from '../../prisma/prisma.service';
import { RECOMMENDATION_CONFIG } from '../recommendation/recommendation.config';
import { POINTS_CONFIG } from './points.config';
import { GoalPeriod, PointReason, RedemptionStatus } from './points.enums';
import {
  AttemptPointsDto,
  PointGoalDto,
  PointsResponseDto,
  RedemptionDto,
  RewardDto,
} from './dto/point-response.dto';

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

type AttemptAwardInput = {
  childId: string;
  questionAttemptId: string;
  learningSessionId: string;
  learningObjectiveId: string;
  correct: boolean;
  timeSpent: number;
  masteredBefore: boolean;
  gradeAhead: boolean;
  masteryCrossed: boolean;
};

@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);

  constructor(private readonly prisma: PrismaService) {}

  get highMasteryThreshold(): number {
    return RECOMMENDATION_CONFIG.highMasteryThreshold;
  }

  async awardForAttempt(
    input: AttemptAwardInput,
    now: Date = new Date(),
  ): Promise<AttemptPointsDto> {
    return this.prisma.$transaction(async (tx) => {
      // Lock the child row so concurrent attempts for the same child
      // serialize the daily-cap read-then-insert below (same pattern as
      // redeem); otherwise two racing attempts can both slip under the cap.
      await tx.$queryRaw`SELECT id FROM "Child" WHERE id = ${input.childId} FOR UPDATE`;
      const beforeProgress = await this.periodProgress(input.childId, now, tx);
      let earned = 0;

      const baseAmount = input.correct
        ? input.timeSpent >= POINTS_CONFIG.correctMinimumSeconds
          ? input.masteredBefore
            ? POINTS_CONFIG.masteredCorrectAnswer
            : POINTS_CONFIG.correctAnswer
          : 0
        : input.timeSpent >= POINTS_CONFIG.effortMinimumSeconds
          ? POINTS_CONFIG.effort
          : 0;

      earned += await this.createCappedTransaction({
        db: tx,
        childId: input.childId,
        amount: baseAmount,
        reason: input.correct
          ? input.masteredBefore
            ? PointReason.CorrectAnswer
            : PointReason.CorrectAnswer
          : PointReason.Effort,
        questionAttemptId: input.questionAttemptId,
        createdAt: now,
      });

      if (input.correct && input.gradeAhead) {
        earned += await this.createCappedTransaction({
          db: tx,
          childId: input.childId,
          amount: POINTS_CONFIG.gradeAheadBonus,
          reason: PointReason.GradeAheadBonus,
          questionAttemptId: input.questionAttemptId,
          createdAt: now,
        });
      }

      if (input.masteryCrossed) {
        earned += await this.createCappedTransaction({
          db: tx,
          childId: input.childId,
          amount: POINTS_CONFIG.mastery,
          reason: PointReason.Mastery,
          learningObjectiveId: input.learningObjectiveId,
          createdAt: now,
        });
      }

      const goal = await this.getGoal(input.childId, now, tx);
      const afterProgress = await this.periodProgress(input.childId, now, tx);
      return {
        earned,
        balance: await this.getBalance(input.childId, tx),
        goal,
        goalJustReached:
          Boolean(goal) &&
          beforeProgress < (goal?.target ?? 0) &&
          afterProgress >= (goal?.target ?? 0),
      };
    });
  }

  async awardForSession(
    childId: string,
    sessionId: string,
    answeredCount: number,
  ): Promise<number> {
    if (answeredCount < POINTS_CONFIG.minimumSessionQuestions) return 0;
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Child" WHERE id = ${childId} FOR UPDATE`;
      return this.createCappedTransaction({
        db: tx,
        childId,
        amount: POINTS_CONFIG.sessionComplete,
        reason: PointReason.SessionComplete,
        learningSessionId: sessionId,
        createdAt: new Date(),
      });
    });
  }

  async getPoints(
    parentId: string,
    childId: string,
  ): Promise<PointsResponseDto> {
    const child = await getOwnedChild(this.prisma, parentId, childId);
    const now = new Date();
    const [balance, goal, transactions] = await Promise.all([
      this.getBalance(child.id),
      this.getGoal(child.id, now),
      this.prisma.pointTransaction.findMany({
        where: { childId: child.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);
    return {
      balance,
      goal,
      transactions: transactions.map((transaction) => ({
        id: transaction.id,
        amount: transaction.amount,
        reason: transaction.reason as PointReason,
        createdAt: transaction.createdAt,
      })),
    };
  }

  async setGoal(
    parentId: string,
    childId: string,
    period: GoalPeriod,
    targetPoints: number,
  ): Promise<PointGoalDto> {
    const child = await getOwnedChild(this.prisma, parentId, childId);
    await this.prisma.$transaction([
      this.prisma.pointGoal.updateMany({
        where: { childId: child.id, active: true },
        data: { active: false },
      }),
      this.prisma.pointGoal.create({
        data: {
          childId: child.id,
          period,
          targetPoints,
        },
      }),
    ]);
    return (await this.getGoal(child.id, new Date()))!;
  }

  async clearGoal(parentId: string, childId: string): Promise<void> {
    const child = await getOwnedChild(this.prisma, parentId, childId);
    await this.prisma.pointGoal.updateMany({
      where: { childId: child.id, active: true },
      data: { active: false },
    });
  }

  async listRewards(parentId: string, childId: string): Promise<RewardDto[]> {
    const child = await getOwnedChild(this.prisma, parentId, childId);
    return this.prisma.reward.findMany({
      where: { childId: child.id, archived: false },
      orderBy: { cost: 'asc' },
    });
  }

  async createReward(
    parentId: string,
    childId: string,
    data: { name: string; emoji: string; cost: number },
  ): Promise<RewardDto> {
    const child = await getOwnedChild(this.prisma, parentId, childId);
    return this.prisma.reward.create({ data: { childId: child.id, ...data } });
  }

  async updateReward(
    parentId: string,
    rewardId: string,
    data: { name: string; emoji: string; cost: number },
  ): Promise<RewardDto> {
    const reward = await this.prisma.reward.findFirst({
      where: { id: rewardId, child: { parentId } },
    });
    if (!reward) throw new NotFoundException('Reward not found');
    return this.prisma.reward.update({ where: { id: reward.id }, data });
  }

  async archiveReward(parentId: string, rewardId: string): Promise<void> {
    const reward = await this.prisma.reward.findFirst({
      where: { id: rewardId, child: { parentId } },
    });
    if (!reward) throw new NotFoundException('Reward not found');
    await this.prisma.reward.update({
      where: { id: reward.id },
      data: { archived: true },
    });
  }

  async redeem(
    parentId: string,
    childId: string,
    rewardId: string,
  ): Promise<RedemptionDto> {
    const child = await getOwnedChild(this.prisma, parentId, childId);
    return this.prisma.$transaction(async (tx) => {
      // Lock the child row so concurrent redeems (e.g. a double-tap) run one
      // after another; otherwise both read the same balance and both succeed.
      await tx.$queryRaw`SELECT id FROM "Child" WHERE id = ${child.id} FOR UPDATE`;
      const reward = await tx.reward.findFirst({
        where: { id: rewardId, childId: child.id, archived: false },
      });
      if (!reward) throw new NotFoundException('Reward not found');
      const balance = await this.getBalance(child.id, tx);
      if (balance < reward.cost)
        throw new BadRequestException('Not enough points');
      const redemption = await tx.rewardRedemption.create({
        data: { childId: child.id, rewardId: reward.id, cost: reward.cost },
        include: { reward: true },
      });
      await tx.pointTransaction.create({
        data: {
          childId: child.id,
          amount: -reward.cost,
          reason: PrismaPointReason.REDEMPTION,
          redemptionId: redemption.id,
        },
      });
      return this.mapRedemption(redemption);
    });
  }

  async listRedemptions(
    parentId: string,
    childId: string,
    status?: RedemptionStatus,
  ): Promise<RedemptionDto[]> {
    const child = await getOwnedChild(this.prisma, parentId, childId);
    const rows = await this.prisma.rewardRedemption.findMany({
      where: {
        childId: child.id,
        ...(status ? { status } : {}),
      },
      include: { reward: true },
      orderBy: { requestedAt: 'desc' },
    });
    return rows.map((row) => this.mapRedemption(row));
  }

  async resolveRedemption(
    parentId: string,
    redemptionId: string,
    status: RedemptionStatus,
  ): Promise<RedemptionDto> {
    const redemption = await this.prisma.rewardRedemption.findFirst({
      where: { id: redemptionId, child: { parentId } },
      include: { reward: true },
    });
    if (!redemption) throw new NotFoundException('Redemption not found');
    return this.prisma.$transaction(async (tx) => {
      // Conditional update: only one of two racing approve/decline calls can
      // move it out of PENDING; the loser gets a 409 instead of overwriting.
      const { count } = await tx.rewardRedemption.updateMany({
        where: { id: redemption.id, status: PrismaRedemptionStatus.PENDING },
        data: {
          status,
          resolvedAt: new Date(),
        },
      });
      if (count === 0) {
        throw new ConflictException('Redemption already resolved');
      }
      const updated = await tx.rewardRedemption.findUniqueOrThrow({
        where: { id: redemption.id },
        include: { reward: true },
      });
      if (status === RedemptionStatus.Declined) {
        await tx.pointTransaction.create({
          data: {
            childId: redemption.childId,
            amount: redemption.cost,
            reason: PrismaPointReason.REDEMPTION_REFUND,
            redemptionId: redemption.id,
          },
        });
      }
      return this.mapRedemption(updated);
    });
  }

  private async getBalance(
    childId: string,
    db: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<number> {
    const result = await db.pointTransaction.aggregate({
      where: { childId },
      _sum: { amount: true },
    });
    return result._sum.amount ?? 0;
  }

  private async createCappedTransaction(input: {
    db?: Prisma.TransactionClient;
    childId: string;
    amount: number;
    reason: PointReason;
    questionAttemptId?: string;
    learningSessionId?: string;
    learningObjectiveId?: string;
    createdAt: Date;
  }): Promise<number> {
    if (input.amount <= 0) return 0;
    const db = input.db ?? this.prisma;
    const { start } = periodBounds(GoalPeriod.Daily, input.createdAt);
    const alreadyEarned = await db.pointTransaction.aggregate({
      where: {
        childId: input.childId,
        createdAt: { gte: start },
        amount: { gt: 0 },
        NOT: { reason: PrismaPointReason.REDEMPTION_REFUND },
      },
      _sum: { amount: true },
    });
    const amount = Math.min(
      input.amount,
      Math.max(0, POINTS_CONFIG.dailyCap - (alreadyEarned._sum.amount ?? 0)),
    );
    if (amount <= 0) return 0;
    // Single-statement idempotent insert: on a retry the conflicting row
    // already exists, so nothing is written and no error is raised. A
    // caught unique violation would abort the surrounding Postgres
    // transaction and poison every later query in it.
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "PointTransaction"
        ("id", "childId", "amount", "reason", "questionAttemptId", "learningSessionId", "learningObjectiveId", "redemptionId", "createdAt")
      VALUES (${randomUUID()}, ${input.childId}, ${amount}, ${input.reason}::"PointReason", ${input.questionAttemptId ?? null}, ${input.learningSessionId ?? null}, ${input.learningObjectiveId ?? null}, NULL, ${input.createdAt})
      ON CONFLICT DO NOTHING
      RETURNING "id"`;
    return rows.length > 0 ? amount : 0;
  }

  private async getGoal(
    childId: string,
    now: Date,
    db: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<PointGoalDto | null> {
    const goal = await db.pointGoal.findFirst({
      where: { childId, active: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!goal) return null;
    const { start, end } = periodBounds(goal.period as GoalPeriod, now);
    return {
      period: goal.period as GoalPeriod,
      target: goal.targetPoints,
      progress: await this.periodProgress(childId, now, db),
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
    };
  }

  private async periodProgress(
    childId: string,
    now: Date,
    db: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<number> {
    const goal = await db.pointGoal.findFirst({
      where: { childId, active: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!goal) return 0;
    const { start, end } = periodBounds(goal.period as GoalPeriod, now);
    const result = await db.pointTransaction.aggregate({
      where: {
        childId,
        createdAt: { gte: start, lt: end },
        amount: { gt: 0 },
        NOT: { reason: PrismaPointReason.REDEMPTION_REFUND },
      },
      _sum: { amount: true },
    });
    return result._sum.amount ?? 0;
  }

  private mapRedemption(
    row: Prisma.RewardRedemptionGetPayload<{ include: { reward: true } }>,
  ): RedemptionDto {
    return {
      id: row.id,
      childId: row.childId,
      rewardId: row.rewardId,
      reward: row.reward,
      cost: row.cost,
      status: row.status as RedemptionStatus,
      requestedAt: row.requestedAt,
      resolvedAt: row.resolvedAt,
    };
  }
}

function periodBounds(
  period: GoalPeriod,
  now: Date,
): { start: Date; end: Date } {
  const shifted = new Date(now.getTime() + WIB_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();
  const day = shifted.getUTCDate();
  let startParts: [number, number, number] = [year, month, day];
  if (period === GoalPeriod.Weekly) {
    const dayOfWeek = shifted.getUTCDay() || 7;
    const monday = day - dayOfWeek + 1;
    startParts = [year, month, monday];
  } else if (period === GoalPeriod.Monthly) {
    startParts = [year, month, 1];
  }
  const start = new Date(Date.UTC(...startParts) - WIB_OFFSET_MS);
  const end =
    period === GoalPeriod.Daily
      ? new Date(start.getTime() + 24 * 60 * 60 * 1000)
      : period === GoalPeriod.Weekly
        ? new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
        : new Date(Date.UTC(year, month + 1, 1) - WIB_OFFSET_MS);
  return { start, end };
}
