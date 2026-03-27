-- AlterTable
ALTER TABLE "llm_prompts" ADD COLUMN     "expectedRevenue" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "llm_prompt_revenues" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "monthlyPromptReach" DOUBLE PRECISION,
    "visibilityWeight" DOUBLE PRECISION,
    "ctr" DOUBLE PRECISION,
    "cvr" DOUBLE PRECISION,
    "aov" DOUBLE PRECISION,
    "estimatedRevenue" DOUBLE PRECISION,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "llm_prompt_revenues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "llm_prompt_revenues_promptId_key" ON "llm_prompt_revenues"("promptId");

-- CreateIndex
CREATE INDEX "llm_prompt_revenues_estimatedRevenue_idx" ON "llm_prompt_revenues"("estimatedRevenue");

-- AddForeignKey
ALTER TABLE "llm_prompt_revenues" ADD CONSTRAINT "llm_prompt_revenues_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "llm_prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
