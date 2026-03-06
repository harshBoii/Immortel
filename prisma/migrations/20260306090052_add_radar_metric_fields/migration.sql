-- AlterTable
ALTER TABLE "llm_radar_metrics" ADD COLUMN     "competitorRank" DOUBLE PRECISION,
ADD COLUMN     "topicAuthority" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "llm_radar_metrics_companyId_calculatedAt_idx" ON "llm_radar_metrics"("companyId", "calculatedAt" DESC);
