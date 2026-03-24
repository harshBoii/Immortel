-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('Shopify');

-- CreateTable
CREATE TABLE "company_integration_cms" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL DEFAULT 'Shopify',
    "apiKey" VARCHAR(500),
    "apiSecret" VARCHAR(500),
    "scopes" TEXT,
    "appUrl" VARCHAR(2000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "company_integration_cms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "company_integration_cms_companyId_idx" ON "company_integration_cms"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "company_integration_cms_companyId_provider_key" ON "company_integration_cms"("companyId", "provider");

-- AddForeignKey
ALTER TABLE "company_integration_cms" ADD CONSTRAINT "company_integration_cms_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Align llm_radar_metrics with schema (idempotent; matches 20260306090052_add_radar_metric_fields)
ALTER TABLE "llm_radar_metrics" ADD COLUMN IF NOT EXISTS "competitorRank" DOUBLE PRECISION;
ALTER TABLE "llm_radar_metrics" ADD COLUMN IF NOT EXISTS "topicAuthority" DOUBLE PRECISION;
CREATE INDEX IF NOT EXISTS "llm_radar_metrics_companyId_calculatedAt_idx" ON "llm_radar_metrics"("companyId", "calculatedAt" DESC);
