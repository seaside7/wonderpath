-- CreateEnum
CREATE TYPE "MisconceptionSignalType" AS ENUM ('REPEATED_MISTAKE', 'STORY_PROBLEM', 'VISUAL_REPRESENTATION', 'HIGH_LANGUAGE_COMPLEXITY', 'HINTS_OVERUSED');

-- CreateEnum
CREATE TYPE "MisconceptionSignalStatus" AS ENUM ('POTENTIAL', 'SUGGESTED', 'CONFIRMED', 'DISMISSED');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "metadata" JSONB;

-- CreateTable
CREATE TABLE "MisconceptionSignal" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "learningObjectiveId" TEXT NOT NULL,
    "signalType" "MisconceptionSignalType" NOT NULL,
    "evidenceCount" INTEGER NOT NULL DEFAULT 0,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "status" "MisconceptionSignalStatus" NOT NULL DEFAULT 'POTENTIAL',
    "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supportingAttemptIds" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MisconceptionSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChildSubjectDifficulty" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "subject" "Subject" NOT NULL,
    "currentDifficulty" INTEGER NOT NULL DEFAULT 3,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChildSubjectDifficulty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MisconceptionSignal_childId_idx" ON "MisconceptionSignal"("childId");

-- CreateIndex
CREATE INDEX "MisconceptionSignal_learningObjectiveId_idx" ON "MisconceptionSignal"("learningObjectiveId");

-- CreateIndex
CREATE UNIQUE INDEX "MisconceptionSignal_childId_learningObjectiveId_signalType_key" ON "MisconceptionSignal"("childId", "learningObjectiveId", "signalType");

-- CreateIndex
CREATE INDEX "ChildSubjectDifficulty_childId_idx" ON "ChildSubjectDifficulty"("childId");

-- CreateIndex
CREATE UNIQUE INDEX "ChildSubjectDifficulty_childId_subject_key" ON "ChildSubjectDifficulty"("childId", "subject");

-- AddForeignKey
ALTER TABLE "MisconceptionSignal" ADD CONSTRAINT "MisconceptionSignal_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MisconceptionSignal" ADD CONSTRAINT "MisconceptionSignal_learningObjectiveId_fkey" FOREIGN KEY ("learningObjectiveId") REFERENCES "LearningObjective"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildSubjectDifficulty" ADD CONSTRAINT "ChildSubjectDifficulty_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
