-- CreateEnum
CREATE TYPE "Subject" AS ENUM ('MATHEMATICS', 'ENGLISH');

-- CreateEnum
CREATE TYPE "LearningSessionStatus" AS ENUM ('STARTED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "LearningSession" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "curriculum" "Curriculum" NOT NULL,
    "subject" "Subject" NOT NULL,
    "status" "LearningSessionStatus" NOT NULL DEFAULT 'STARTED',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearningSession_childId_status_idx" ON "LearningSession"("childId", "status");

-- AddForeignKey
ALTER TABLE "LearningSession" ADD CONSTRAINT "LearningSession_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
