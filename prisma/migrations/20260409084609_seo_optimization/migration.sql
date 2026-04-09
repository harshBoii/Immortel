-- AlterEnum
ALTER TYPE "AeoPageType" ADD VALUE 'PILLAR_PAGE';

-- AlterTable
ALTER TABLE "aeo_pages" ADD COLUMN     "llm_prompt_id" TEXT,
ADD COLUMN     "llm_topic_id" TEXT;

-- AddForeignKey
ALTER TABLE "aeo_pages" ADD CONSTRAINT "aeo_pages_llm_prompt_id_fkey" FOREIGN KEY ("llm_prompt_id") REFERENCES "llm_prompts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aeo_pages" ADD CONSTRAINT "aeo_pages_llm_topic_id_fkey" FOREIGN KEY ("llm_topic_id") REFERENCES "llm_topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
