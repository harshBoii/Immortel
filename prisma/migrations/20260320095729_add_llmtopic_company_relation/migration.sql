/*
  Warnings:

  - A unique constraint covering the columns `[companyId,name]` on the table `llm_topics` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `companyId` to the `llm_topics` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "llm_topics_name_key";

-- AlterTable
ALTER TABLE "llm_topics" ADD COLUMN     "companyId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "llm_topics_companyId_idx" ON "llm_topics"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "llm_topics_companyId_name_key" ON "llm_topics"("companyId", "name");

-- AddForeignKey
ALTER TABLE "llm_topics" ADD CONSTRAINT "llm_topics_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
