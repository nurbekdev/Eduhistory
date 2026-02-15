-- AlterTable: Certificate.quizAttemptId optional (for course completion without final quiz)
ALTER TABLE "Certificate" ALTER COLUMN "quizAttemptId" DROP NOT NULL;

-- FK: allow null and SET NULL on attempt delete
ALTER TABLE "Certificate" DROP CONSTRAINT IF EXISTS "Certificate_quizAttemptId_fkey";
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_quizAttemptId_fkey" 
  FOREIGN KEY ("quizAttemptId") REFERENCES "QuizAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
