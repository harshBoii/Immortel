-- CreateTable
CREATE TABLE "llm_prompts" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "topic" VARCHAR(255),
    "topicId" TEXT,
    "intent" VARCHAR(100),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "llm_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_prompt_executions" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "response" TEXT NOT NULL,
    "executedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "llm_prompt_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_citations" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "companyId" TEXT,
    "mentionedName" VARCHAR(255) NOT NULL,
    "rank" INTEGER,
    "context" VARCHAR(100),
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "llm_citations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_topics" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "llm_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_radar_metrics" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "shareOfVoice" DOUBLE PRECISION,
    "top3Rate" DOUBLE PRECISION,
    "queryCoverage" DOUBLE PRECISION,
    "avgRank" DOUBLE PRECISION,
    "calculatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "llm_radar_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "llm_prompts_intent_idx" ON "llm_prompts"("intent");

-- CreateIndex
CREATE INDEX "llm_prompts_topic_idx" ON "llm_prompts"("topic");

-- CreateIndex
CREATE INDEX "llm_prompts_topicId_idx" ON "llm_prompts"("topicId");

-- CreateIndex
CREATE INDEX "llm_prompt_executions_promptId_idx" ON "llm_prompt_executions"("promptId");

-- CreateIndex
CREATE INDEX "llm_prompt_executions_model_idx" ON "llm_prompt_executions"("model");

-- CreateIndex
CREATE INDEX "llm_prompt_executions_executedAt_idx" ON "llm_prompt_executions"("executedAt");

-- CreateIndex
CREATE INDEX "llm_citations_executionId_idx" ON "llm_citations"("executionId");

-- CreateIndex
CREATE INDEX "llm_citations_companyId_idx" ON "llm_citations"("companyId");

-- CreateIndex
CREATE INDEX "llm_citations_rank_idx" ON "llm_citations"("rank");

-- CreateIndex
CREATE UNIQUE INDEX "llm_topics_name_key" ON "llm_topics"("name");

-- CreateIndex
CREATE INDEX "llm_radar_metrics_companyId_idx" ON "llm_radar_metrics"("companyId");

-- CreateIndex
CREATE INDEX "llm_radar_metrics_model_idx" ON "llm_radar_metrics"("model");

-- AddForeignKey
ALTER TABLE "llm_prompts" ADD CONSTRAINT "llm_prompts_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "llm_topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_prompt_executions" ADD CONSTRAINT "llm_prompt_executions_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "llm_prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_citations" ADD CONSTRAINT "llm_citations_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "llm_prompt_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_citations" ADD CONSTRAINT "llm_citations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_radar_metrics" ADD CONSTRAINT "llm_radar_metrics_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
