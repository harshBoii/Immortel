/*
  Warnings:

  - A unique constraint covering the columns `[metaIntegrationId,metaCampaignId]` on the table `meta_campaigns` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[metaIntegrationId,metaCreativeId]` on the table `meta_creatives` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "meta_campaigns" ALTER COLUMN "dailyBudget" SET DEFAULT 0;

-- CreateTable
CREATE TABLE "meta_media" (
    "id" TEXT NOT NULL,
    "metaIntegrationId" TEXT NOT NULL,
    "kind" VARCHAR(10) NOT NULL,
    "imageHash" VARCHAR(200),
    "videoId" VARCHAR(100),
    "imageUrl" VARCHAR(1000),
    "videoUrl" VARCHAR(1000),
    "videoStreamId" VARCHAR(100),
    "thumbnailUrl" VARCHAR(1000),
    "r2Key" VARCHAR(500),
    "filename" VARCHAR(500),
    "mimeType" VARCHAR(200),
    "bytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "durationMs" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ready',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meta_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_ad_sets" (
    "id" TEXT NOT NULL,
    "metaIntegrationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "metaAdSetId" VARCHAR(100) NOT NULL,
    "name" TEXT,
    "status" VARCHAR(50),
    "dailyBudget" INTEGER,
    "optimizationGoal" VARCHAR(100),
    "billingEvent" VARCHAR(50),
    "bidStrategy" VARCHAR(50),
    "targeting" JSONB,
    "startTime" TIMESTAMPTZ(3),
    "endTime" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "meta_ad_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_ads" (
    "id" TEXT NOT NULL,
    "metaIntegrationId" TEXT NOT NULL,
    "adSetId" TEXT NOT NULL,
    "metaCreativeDbId" TEXT,
    "metaAdId" VARCHAR(100) NOT NULL,
    "name" TEXT,
    "status" VARCHAR(50),
    "publishedAt" TIMESTAMPTZ(3),
    "reviewStatus" VARCHAR(50),
    "reviewFeedback" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "meta_ads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meta_media_metaIntegrationId_idx" ON "meta_media"("metaIntegrationId");

-- CreateIndex
CREATE INDEX "meta_media_imageHash_idx" ON "meta_media"("imageHash");

-- CreateIndex
CREATE INDEX "meta_media_videoId_idx" ON "meta_media"("videoId");

-- CreateIndex
CREATE INDEX "meta_media_videoStreamId_idx" ON "meta_media"("videoStreamId");

-- CreateIndex
CREATE INDEX "meta_ad_sets_campaignId_idx" ON "meta_ad_sets"("campaignId");

-- CreateIndex
CREATE INDEX "meta_ad_sets_metaIntegrationId_idx" ON "meta_ad_sets"("metaIntegrationId");

-- CreateIndex
CREATE UNIQUE INDEX "meta_ad_sets_metaIntegrationId_metaAdSetId_key" ON "meta_ad_sets"("metaIntegrationId", "metaAdSetId");

-- CreateIndex
CREATE INDEX "meta_ads_adSetId_idx" ON "meta_ads"("adSetId");

-- CreateIndex
CREATE INDEX "meta_ads_metaIntegrationId_idx" ON "meta_ads"("metaIntegrationId");

-- CreateIndex
CREATE UNIQUE INDEX "meta_ads_metaIntegrationId_metaAdId_key" ON "meta_ads"("metaIntegrationId", "metaAdId");

-- CreateIndex
CREATE UNIQUE INDEX "meta_campaigns_metaIntegrationId_metaCampaignId_key" ON "meta_campaigns"("metaIntegrationId", "metaCampaignId");

-- CreateIndex
CREATE UNIQUE INDEX "meta_creatives_metaIntegrationId_metaCreativeId_key" ON "meta_creatives"("metaIntegrationId", "metaCreativeId");

-- AddForeignKey
ALTER TABLE "meta_media" ADD CONSTRAINT "meta_media_metaIntegrationId_fkey" FOREIGN KEY ("metaIntegrationId") REFERENCES "meta_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_ad_sets" ADD CONSTRAINT "meta_ad_sets_metaIntegrationId_fkey" FOREIGN KEY ("metaIntegrationId") REFERENCES "meta_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_ad_sets" ADD CONSTRAINT "meta_ad_sets_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "meta_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_ads" ADD CONSTRAINT "meta_ads_metaIntegrationId_fkey" FOREIGN KEY ("metaIntegrationId") REFERENCES "meta_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_ads" ADD CONSTRAINT "meta_ads_adSetId_fkey" FOREIGN KEY ("adSetId") REFERENCES "meta_ad_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_ads" ADD CONSTRAINT "meta_ads_metaCreativeDbId_fkey" FOREIGN KEY ("metaCreativeDbId") REFERENCES "meta_creatives"("id") ON DELETE SET NULL ON UPDATE CASCADE;
