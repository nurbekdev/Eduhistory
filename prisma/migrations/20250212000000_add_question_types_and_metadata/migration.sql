-- AlterEnum: add new QuestionType values
ALTER TYPE "QuestionType" ADD VALUE 'TRUE_FALSE';
ALTER TYPE "QuestionType" ADD VALUE 'MATCHING';
ALTER TYPE "QuestionType" ADD VALUE 'CLOZE';
ALTER TYPE "QuestionType" ADD VALUE 'NUMERICAL';
ALTER TYPE "QuestionType" ADD VALUE 'DRAG_DROP_IMAGE';
ALTER TYPE "QuestionType" ADD VALUE 'DRAG_DROP_TEXT';

-- AlterTable: add metadata to Question
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
