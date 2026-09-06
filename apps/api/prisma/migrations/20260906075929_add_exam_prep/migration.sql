-- CreateEnum
CREATE TYPE "ExamPrepPlanStatus" AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ExamMaterialType" AS ENUM ('PDF', 'PHOTO');

-- CreateEnum
CREATE TYPE "ExamMaterialExtractionStatus" AS ENUM ('PENDING', 'EXTRACTED', 'FAILED');

-- CreateEnum
CREATE TYPE "ExamTopicStatus" AS ENUM ('CANDIDATE', 'CONFIRMED', 'REJECTED');

-- CreateTable
CREATE TABLE "ExamPrepPlan" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "subject" "Subject" NOT NULL,
    "curriculum" "Curriculum" NOT NULL,
    "context" "LearningSessionContext" NOT NULL DEFAULT 'EXAM_TOMORROW',
    "examDate" DATE,
    "status" "ExamPrepPlanStatus" NOT NULL DEFAULT 'PLANNING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamPrepPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamMaterial" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "materialType" "ExamMaterialType" NOT NULL,
    "extractionStatus" "ExamMaterialExtractionStatus" NOT NULL DEFAULT 'PENDING',
    "extractedText" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamTopic" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "learningObjectiveId" TEXT,
    "label" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" "ExamTopicStatus" NOT NULL DEFAULT 'CANDIDATE',
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamTopic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExamPrepPlan_childId_idx" ON "ExamPrepPlan"("childId");

-- CreateIndex
CREATE INDEX "ExamMaterial_planId_idx" ON "ExamMaterial"("planId");

-- CreateIndex
CREATE INDEX "ExamTopic_planId_idx" ON "ExamTopic"("planId");

-- AddForeignKey
ALTER TABLE "ExamPrepPlan" ADD CONSTRAINT "ExamPrepPlan_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamMaterial" ADD CONSTRAINT "ExamMaterial_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ExamPrepPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamTopic" ADD CONSTRAINT "ExamTopic_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ExamPrepPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamTopic" ADD CONSTRAINT "ExamTopic_learningObjectiveId_fkey" FOREIGN KEY ("learningObjectiveId") REFERENCES "LearningObjective"("id") ON DELETE SET NULL ON UPDATE CASCADE;
