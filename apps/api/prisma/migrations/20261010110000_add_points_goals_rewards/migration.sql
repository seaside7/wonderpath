CREATE TYPE "PointReason" AS ENUM ('CORRECT_ANSWER', 'EFFORT', 'SESSION_COMPLETE', 'MASTERY', 'GRADE_AHEAD_BONUS', 'REDEMPTION', 'REDEMPTION_REFUND');
CREATE TYPE "GoalPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');
CREATE TYPE "RedemptionStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

CREATE TABLE "PointTransaction" (
  "id" TEXT NOT NULL,
  "childId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "reason" "PointReason" NOT NULL,
  "questionAttemptId" TEXT,
  "learningSessionId" TEXT,
  "learningObjectiveId" TEXT,
  "redemptionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PointTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PointGoal" (
  "id" TEXT NOT NULL,
  "childId" TEXT NOT NULL,
  "period" "GoalPeriod" NOT NULL,
  "targetPoints" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PointGoal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Reward" (
  "id" TEXT NOT NULL,
  "childId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "cost" INTEGER NOT NULL,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RewardRedemption" (
  "id" TEXT NOT NULL,
  "childId" TEXT NOT NULL,
  "rewardId" TEXT NOT NULL,
  "cost" INTEGER NOT NULL,
  "status" "RedemptionStatus" NOT NULL DEFAULT 'PENDING',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "RewardRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PointTransaction_reason_questionAttemptId_key" ON "PointTransaction"("reason", "questionAttemptId");
CREATE UNIQUE INDEX "PointTransaction_reason_learningSessionId_key" ON "PointTransaction"("reason", "learningSessionId");
CREATE UNIQUE INDEX "PointTransaction_childId_reason_learningObjectiveId_key" ON "PointTransaction"("childId", "reason", "learningObjectiveId");
CREATE UNIQUE INDEX "PointTransaction_reason_redemptionId_key" ON "PointTransaction"("reason", "redemptionId");
CREATE INDEX "PointTransaction_childId_createdAt_idx" ON "PointTransaction"("childId", "createdAt");
CREATE INDEX "PointGoal_childId_active_idx" ON "PointGoal"("childId", "active");
CREATE INDEX "Reward_childId_archived_idx" ON "Reward"("childId", "archived");
CREATE INDEX "RewardRedemption_childId_status_idx" ON "RewardRedemption"("childId", "status");

ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PointGoal" ADD CONSTRAINT "PointGoal_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
