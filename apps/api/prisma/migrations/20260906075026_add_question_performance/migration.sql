-- CreateEnum
CREATE TYPE "QuestionPerformanceStatus" AS ENUM ('ACTIVE', 'LOW_PERFORMANCE', 'REVIEW', 'RETIRED');

-- CreateTable
CREATE TABLE "QuestionPerformance" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "timesServed" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "wrongCount" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTimeMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hintUsageCount" INTEGER NOT NULL DEFAULT 0,
    "abandonmentCount" INTEGER NOT NULL DEFAULT 0,
    "reportedProblemCount" INTEGER NOT NULL DEFAULT 0,
    "status" "QuestionPerformanceStatus" NOT NULL DEFAULT 'ACTIVE',
    "firstServedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastServedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestionPerformance_questionId_key" ON "QuestionPerformance"("questionId");

-- CreateIndex
CREATE INDEX "QuestionPerformance_status_idx" ON "QuestionPerformance"("status");

-- CreateIndex
CREATE INDEX "QuestionPerformance_questionId_idx" ON "QuestionPerformance"("questionId");

-- AddForeignKey
ALTER TABLE "QuestionPerformance" ADD CONSTRAINT "QuestionPerformance_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
