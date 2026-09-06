-- CreateEnum
CREATE TYPE "PerceivedDifficulty" AS ENUM ('EASY', 'JUST_RIGHT', 'DIFFICULT');

-- CreateTable
CREATE TABLE "QuestionAttempt" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "learningSessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "learningObjectiveId" TEXT NOT NULL,
    "selectedAnswer" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "timeSpent" INTEGER NOT NULL,
    "hintUsed" BOOLEAN NOT NULL,
    "perceivedDifficulty" "PerceivedDifficulty" NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "metadata" JSONB,
    "reasonCodes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentMastery" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "learningObjectiveId" TEXT NOT NULL,
    "masteryScore" INTEGER NOT NULL,
    "confidenceScore" INTEGER NOT NULL,
    "totalAttempts" INTEGER NOT NULL,
    "correctAttempts" INTEGER NOT NULL,
    "wrongAttempts" INTEGER NOT NULL,
    "averageResponseTime" DOUBLE PRECISION NOT NULL,
    "hintCount" INTEGER NOT NULL,
    "lastPracticedAt" TIMESTAMP(3) NOT NULL,
    "reviewRecommended" BOOLEAN NOT NULL,
    "reasonCodes" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentMastery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestionAttempt_childId_learningObjectiveId_idx" ON "QuestionAttempt"("childId", "learningObjectiveId");

-- CreateIndex
CREATE INDEX "QuestionAttempt_childId_idx" ON "QuestionAttempt"("childId");

-- CreateIndex
CREATE INDEX "QuestionAttempt_learningSessionId_idx" ON "QuestionAttempt"("learningSessionId");

-- CreateIndex
CREATE INDEX "QuestionAttempt_questionId_idx" ON "QuestionAttempt"("questionId");

-- CreateIndex
CREATE INDEX "StudentMastery_childId_idx" ON "StudentMastery"("childId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentMastery_childId_learningObjectiveId_key" ON "StudentMastery"("childId", "learningObjectiveId");

-- AddForeignKey
ALTER TABLE "QuestionAttempt" ADD CONSTRAINT "QuestionAttempt_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAttempt" ADD CONSTRAINT "QuestionAttempt_learningSessionId_fkey" FOREIGN KEY ("learningSessionId") REFERENCES "LearningSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAttempt" ADD CONSTRAINT "QuestionAttempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAttempt" ADD CONSTRAINT "QuestionAttempt_learningObjectiveId_fkey" FOREIGN KEY ("learningObjectiveId") REFERENCES "LearningObjective"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentMastery" ADD CONSTRAINT "StudentMastery_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentMastery" ADD CONSTRAINT "StudentMastery_learningObjectiveId_fkey" FOREIGN KEY ("learningObjectiveId") REFERENCES "LearningObjective"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
