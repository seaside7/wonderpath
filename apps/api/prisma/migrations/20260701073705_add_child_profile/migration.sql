-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('BOY', 'GIRL');

-- CreateEnum
CREATE TYPE "Grade" AS ENUM ('GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5', 'GRADE_6');

-- CreateEnum
CREATE TYPE "Curriculum" AS ENUM ('IB', 'CAMBRIDGE', 'MERDEKA', 'NASIONAL');

-- CreateEnum
CREATE TYPE "PreferredLanguage" AS ENUM ('ENGLISH', 'BAHASA_INDONESIA');

-- CreateTable
CREATE TABLE "Child" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "nickname" TEXT,
    "dateOfBirth" DATE NOT NULL,
    "gender" "Gender" NOT NULL,
    "grade" "Grade" NOT NULL,
    "curricula" "Curriculum"[],
    "preferredLanguage" "PreferredLanguage" NOT NULL,
    "schoolName" TEXT,
    "parentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Child_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Child_parentId_idx" ON "Child"("parentId");

-- AddForeignKey
ALTER TABLE "Child" ADD CONSTRAINT "Child_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
