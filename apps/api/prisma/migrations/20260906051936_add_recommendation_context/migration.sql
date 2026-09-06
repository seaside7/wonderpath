-- CreateEnum
CREATE TYPE "LearningSessionContext" AS ENUM ('NORMAL_LEARNING', 'EXAM_TOMORROW', 'HOMEWORK_HELP', 'QUICK_SESSION');

-- AlterTable
ALTER TABLE "LearningSession" ADD COLUMN     "context" "LearningSessionContext" NOT NULL DEFAULT 'NORMAL_LEARNING',
ADD COLUMN     "focusLearningObjectiveId" TEXT;

-- AddForeignKey
ALTER TABLE "LearningSession" ADD CONSTRAINT "LearningSession_focusLearningObjectiveId_fkey" FOREIGN KEY ("focusLearningObjectiveId") REFERENCES "LearningObjective"("id") ON DELETE SET NULL ON UPDATE CASCADE;
