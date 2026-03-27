-- AlterTable
ALTER TABLE "citation_bounties" ADD COLUMN "estimatedRevenue" DOUBLE PRECISION,
ADD COLUMN "conversionRate" DOUBLE PRECISION,
ADD COLUMN "avgOrderValue" DOUBLE PRECISION,
ADD COLUMN "publishedAt" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "radar_assumptions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0.02,
    "cvr" DOUBLE PRECISION NOT NULL DEFAULT 0.025,
    "aovMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "industryPreset" VARCHAR(50),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "radar_assumptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "radar_assumptions_companyId_key" ON "radar_assumptions"("companyId");

ALTER TABLE "radar_assumptions" ADD CONSTRAINT "radar_assumptions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "llm_prompt_metrics" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "topicId" TEXT,
    "model" VARCHAR(100) NOT NULL,
    "latestRank" INTEGER,
    "isMentioned" BOOLEAN NOT NULL DEFAULT false,
    "estimatedReach" INTEGER,
    "confidence" DOUBLE PRECISION,
    "difficulty" "Difficulty",
    "businessFit" DOUBLE PRECISION,
    "opportunityScore" DOUBLE PRECISION,
    "estimatedRevenue" DOUBLE PRECISION,
    "actionType" VARCHAR(32),
    "rankTrend7d" DOUBLE PRECISION,
    "rankTrend30d" DOUBLE PRECISION,
    "modelGapFlag" BOOLEAN NOT NULL DEFAULT false,
    "calculatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "llm_prompt_metrics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "llm_prompt_metrics_companyId_promptId_model_key" ON "llm_prompt_metrics"("companyId", "promptId", "model");

CREATE INDEX "llm_prompt_metrics_companyId_idx" ON "llm_prompt_metrics"("companyId");

CREATE INDEX "llm_prompt_metrics_promptId_idx" ON "llm_prompt_metrics"("promptId");

CREATE INDEX "llm_prompt_metrics_calculatedAt_idx" ON "llm_prompt_metrics"("calculatedAt" DESC);

ALTER TABLE "llm_prompt_metrics" ADD CONSTRAINT "llm_prompt_metrics_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "llm_prompt_metrics" ADD CONSTRAINT "llm_prompt_metrics_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "llm_prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "llm_prompt_metrics" ADD CONSTRAINT "llm_prompt_metrics_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "llm_topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
