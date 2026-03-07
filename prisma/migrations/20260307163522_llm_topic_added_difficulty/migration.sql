-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- AlterTable
ALTER TABLE "llm_topics" ADD COLUMN     "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM';
