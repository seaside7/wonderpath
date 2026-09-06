-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "generationId" TEXT;

-- CreateTable
CREATE TABLE "QuestionGeneration" (
    "id" TEXT NOT NULL,
    "status" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "curriculum" "Curriculum" NOT NULL,
    "grade" "Grade" NOT NULL,
    "subject" "Subject" NOT NULL,
    "topicId" TEXT NOT NULL,
    "learningObjectiveId" TEXT NOT NULL,
    "questionType" "QuestionType" NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "generationMetadata" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestionGeneration_topicId_idx" ON "QuestionGeneration"("topicId");

-- CreateIndex
CREATE INDEX "QuestionGeneration_learningObjectiveId_idx" ON "QuestionGeneration"("learningObjectiveId");

-- CreateIndex
CREATE INDEX "QuestionGeneration_status_idx" ON "QuestionGeneration"("status");

-- CreateIndex
CREATE INDEX "Question_generationId_idx" ON "Question"("generationId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "QuestionGeneration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionGeneration" ADD CONSTRAINT "QuestionGeneration_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionGeneration" ADD CONSTRAINT "QuestionGeneration_learningObjectiveId_fkey" FOREIGN KEY ("learningObjectiveId") REFERENCES "LearningObjective"("id") ON DELETE CASCADE ON UPDATE CASCADE;
