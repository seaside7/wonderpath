-- CreateEnum
CREATE TYPE "LearningPatternKey" AS ENUM ('RESPONSE_PACE', 'PERCEIVED_DIFFICULTY', 'BEST_STUDY_TIME', 'STORY_PERFORMANCE', 'VISUAL_PERFORMANCE');

-- CreateEnum
CREATE TYPE "MotivationStyle" AS ENUM ('CHEERLEADER', 'GENTLE_COACH', 'PLAYFUL_BUDDY', 'QUIET_SUPPORTER');

-- CreateTable
CREATE TABLE "ChildLearningPattern" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "patternKey" "LearningPatternKey" NOT NULL,
    "value" TEXT NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "evidenceCount" INTEGER NOT NULL DEFAULT 0,
    "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDetectedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChildLearningPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChildPersonalityPreference" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "favoriteAnimal" TEXT,
    "favoriteTheme" TEXT,
    "favoriteColor" TEXT,
    "motivationStyle" "MotivationStyle",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChildPersonalityPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChildLearningPattern_childId_idx" ON "ChildLearningPattern"("childId");

-- CreateIndex
CREATE UNIQUE INDEX "ChildLearningPattern_childId_patternKey_key" ON "ChildLearningPattern"("childId", "patternKey");

-- CreateIndex
CREATE UNIQUE INDEX "ChildPersonalityPreference_childId_key" ON "ChildPersonalityPreference"("childId");

-- AddForeignKey
ALTER TABLE "ChildLearningPattern" ADD CONSTRAINT "ChildLearningPattern_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildPersonalityPreference" ADD CONSTRAINT "ChildPersonalityPreference_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
