-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectArea" (
    "id" TEXT NOT NULL,
    "code" "Subject" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "SubjectArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subjectAreaId" TEXT NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subtopic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,

    CONSTRAINT "Subtopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningObjective" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "estimatedMasteryTime" INTEGER NOT NULL,
    "subtopicId" TEXT NOT NULL,

    CONSTRAINT "LearningObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionType" "QuestionType" NOT NULL,
    "options" JSONB NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "curriculum" "Curriculum" NOT NULL,
    "grade" "Grade" NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "learningObjectiveId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectArea_code_key" ON "SubjectArea"("code");

-- CreateIndex
CREATE INDEX "Topic_subjectAreaId_idx" ON "Topic"("subjectAreaId");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_subjectAreaId_name_key" ON "Topic"("subjectAreaId", "name");

-- CreateIndex
CREATE INDEX "Subtopic_topicId_idx" ON "Subtopic"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "Subtopic_topicId_name_key" ON "Subtopic"("topicId", "name");

-- CreateIndex
CREATE INDEX "LearningObjective_subtopicId_idx" ON "LearningObjective"("subtopicId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningObjective_subtopicId_name_key" ON "LearningObjective"("subtopicId", "name");

-- CreateIndex
CREATE INDEX "Question_learningObjectiveId_idx" ON "Question"("learningObjectiveId");

-- CreateIndex
CREATE INDEX "Question_curriculum_grade_difficulty_idx" ON "Question"("curriculum", "grade", "difficulty");

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_subjectAreaId_fkey" FOREIGN KEY ("subjectAreaId") REFERENCES "SubjectArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subtopic" ADD CONSTRAINT "Subtopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningObjective" ADD CONSTRAINT "LearningObjective_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "Subtopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_learningObjectiveId_fkey" FOREIGN KEY ("learningObjectiveId") REFERENCES "LearningObjective"("id") ON DELETE CASCADE ON UPDATE CASCADE;
