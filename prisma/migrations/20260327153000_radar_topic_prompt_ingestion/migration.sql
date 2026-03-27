-- AlterTable
ALTER TABLE "llm_prompts" ADD COLUMN "reason" TEXT;

-- AlterTable
ALTER TABLE "llm_topics" ADD COLUMN "reason" TEXT;

-- CreateTable
CREATE TABLE "llm_prompt_rivals_by_model" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "companyName" VARCHAR(255) NOT NULL,
    "rank" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "llm_prompt_rivals_by_model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_prompt_rivals_consensus" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "companyName" VARCHAR(255) NOT NULL,
    "avgRank" DOUBLE PRECISION,
    "mentions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "llm_prompt_rivals_consensus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "llm_prompt_rivals_by_model_promptId_model_companyName_key"
ON "llm_prompt_rivals_by_model"("promptId", "model", "companyName");

-- CreateIndex
CREATE INDEX "llm_prompt_rivals_by_model_promptId_idx"
ON "llm_prompt_rivals_by_model"("promptId");

-- CreateIndex
CREATE INDEX "llm_prompt_rivals_by_model_model_idx"
ON "llm_prompt_rivals_by_model"("model");

-- CreateIndex
CREATE UNIQUE INDEX "llm_prompt_rivals_consensus_promptId_companyName_key"
ON "llm_prompt_rivals_consensus"("promptId", "companyName");

-- CreateIndex
CREATE INDEX "llm_prompt_rivals_consensus_promptId_idx"
ON "llm_prompt_rivals_consensus"("promptId");

-- AddForeignKey
ALTER TABLE "llm_prompt_rivals_by_model"
ADD CONSTRAINT "llm_prompt_rivals_by_model_promptId_fkey"
FOREIGN KEY ("promptId") REFERENCES "llm_prompts"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_prompt_rivals_consensus"
ADD CONSTRAINT "llm_prompt_rivals_consensus_promptId_fkey"
FOREIGN KEY ("promptId") REFERENCES "llm_prompts"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
