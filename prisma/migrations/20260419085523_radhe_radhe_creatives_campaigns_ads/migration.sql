-- AlterTable
ALTER TABLE "meta_integrations" ADD COLUMN     "audienceInsights" JSONB,
ADD COLUMN     "avgWinningCtr" DOUBLE PRECISION,
ADD COLUMN     "brandVoice" JSONB,
ADD COLUMN     "contextBuiltAt" TIMESTAMP(3),
ADD COLUMN     "topAdExamples" JSONB;

-- CreateTable
CREATE TABLE "meta_campaigns" (
    "id" TEXT NOT NULL,
    "metaIntegrationId" TEXT NOT NULL,
    "metaCampaignId" VARCHAR(100) NOT NULL,
    "name" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dailyBudget" INTEGER NOT NULL,
    "specialAdCategory" TEXT,
    "metaAdSetId" VARCHAR(100),
    "metaAdId" VARCHAR(100),
    "targeting" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "reviewStatus" TEXT,
    "reviewFeedback" TEXT,

    CONSTRAINT "meta_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_creatives" (
    "id" TEXT NOT NULL,
    "metaIntegrationId" TEXT NOT NULL,
    "metaCampaignId" TEXT,
    "metaCreativeId" VARCHAR(100),
    "imageHash" VARCHAR(200),
    "videoId" VARCHAR(100),
    "headline" TEXT NOT NULL,
    "primaryText" TEXT NOT NULL,
    "description" TEXT,
    "ctaType" TEXT NOT NULL,
    "landingUrl" TEXT NOT NULL,
    "imageUrl" TEXT,
    "imagePrompt" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT true,
    "compliancePassed" BOOLEAN NOT NULL DEFAULT false,
    "complianceFlags" JSONB,
    "complianceCheckedAt" TIMESTAMP(3),
    "approvedByUser" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meta_creatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_ad_metrics" (
    "id" TEXT NOT NULL,
    "metaCampaignId" TEXT NOT NULL,
    "metaAdId" VARCHAR(100) NOT NULL,
    "impressions" INTEGER NOT NULL,
    "clicks" INTEGER NOT NULL,
    "ctr" DOUBLE PRECISION NOT NULL,
    "spend" DOUBLE PRECISION NOT NULL,
    "cpc" DOUBLE PRECISION,
    "roas" DOUBLE PRECISION,
    "actions" JSONB,
    "datePreset" TEXT NOT NULL,
    "recordedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meta_ad_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meta_campaigns_metaIntegrationId_idx" ON "meta_campaigns"("metaIntegrationId");

-- CreateIndex
CREATE INDEX "meta_campaigns_metaCampaignId_idx" ON "meta_campaigns"("metaCampaignId");

-- CreateIndex
CREATE UNIQUE INDEX "meta_creatives_metaCampaignId_key" ON "meta_creatives"("metaCampaignId");

-- CreateIndex
CREATE INDEX "meta_creatives_metaIntegrationId_idx" ON "meta_creatives"("metaIntegrationId");

-- CreateIndex
CREATE INDEX "meta_creatives_metaCreativeId_idx" ON "meta_creatives"("metaCreativeId");

-- CreateIndex
CREATE INDEX "meta_ad_metrics_metaCampaignId_idx" ON "meta_ad_metrics"("metaCampaignId");

-- CreateIndex
CREATE INDEX "meta_ad_metrics_metaAdId_idx" ON "meta_ad_metrics"("metaAdId");

-- AddForeignKey
ALTER TABLE "meta_campaigns" ADD CONSTRAINT "meta_campaigns_metaIntegrationId_fkey" FOREIGN KEY ("metaIntegrationId") REFERENCES "meta_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_creatives" ADD CONSTRAINT "meta_creatives_metaIntegrationId_fkey" FOREIGN KEY ("metaIntegrationId") REFERENCES "meta_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_creatives" ADD CONSTRAINT "meta_creatives_metaCampaignId_fkey" FOREIGN KEY ("metaCampaignId") REFERENCES "meta_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
