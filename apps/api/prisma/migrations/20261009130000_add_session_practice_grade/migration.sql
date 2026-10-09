-- Allow a learning session to practice one grade above the child's profile grade.
ALTER TABLE "LearningSession" ADD COLUMN "practiceGrade" "Grade";
