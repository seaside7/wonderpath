CREATE TYPE "BookStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'REJECTED');
CREATE TYPE "ReadingMode" AS ENUM ('LISTEN', 'READ');

CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "grade" "Grade" NOT NULL,
    "trailStop" INTEGER NOT NULL,
    "language" "PreferredLanguage" NOT NULL DEFAULT 'ENGLISH',
    "coverImageUrl" TEXT,
    "status" "BookStatus" NOT NULL DEFAULT 'DRAFT',
    "wordCount" INTEGER NOT NULL,
    "readabilityGrade" DOUBLE PRECISION NOT NULL,
    "auditResult" JSONB,
    "generationMeta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookCharacter" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "referenceImageUrl" TEXT NOT NULL,
    CONSTRAINT "BookCharacter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookPage" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "imageUrl" TEXT,
    "audioUrl" TEXT,
    "wordTimings" JSONB,
    CONSTRAINT "BookPage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookQuizQuestion" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    CONSTRAINT "BookQuizQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookReading" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "mode" "ReadingMode" NOT NULL,
    "lastPage" INTEGER NOT NULL DEFAULT 1,
    "completedAt" TIMESTAMP(3),
    "quizScore" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BookReading_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookQuizAttempt" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "bookQuizQuestionId" TEXT NOT NULL,
    "selectedAnswer" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookQuizAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Book_status_grade_trailStop_idx" ON "Book"("status", "grade", "trailStop");
CREATE UNIQUE INDEX "BookPage_bookId_pageNumber_key" ON "BookPage"("bookId", "pageNumber");
CREATE UNIQUE INDEX "BookReading_childId_bookId_key" ON "BookReading"("childId", "bookId");
CREATE INDEX "BookQuizAttempt_childId_idx" ON "BookQuizAttempt"("childId");

ALTER TABLE "BookCharacter" ADD CONSTRAINT "BookCharacter_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookPage" ADD CONSTRAINT "BookPage_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookQuizQuestion" ADD CONSTRAINT "BookQuizQuestion_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookReading" ADD CONSTRAINT "BookReading_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookReading" ADD CONSTRAINT "BookReading_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookQuizAttempt" ADD CONSTRAINT "BookQuizAttempt_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookQuizAttempt" ADD CONSTRAINT "BookQuizAttempt_bookQuizQuestionId_fkey" FOREIGN KEY ("bookQuizQuestionId") REFERENCES "BookQuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
