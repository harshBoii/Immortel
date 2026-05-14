-- CreateEnum
CREATE TYPE "AssetWarningType" AS ENUM ('TEXT_OVERLAY_HIGH', 'WRONG_DIMENSIONS', 'LOW_RESOLUTION', 'UNSUPPORTED_FORMAT');

-- CreateEnum
CREATE TYPE "WarningResolution" AS ENUM ('SKIPPED', 'REUPLOADED', 'DELETED');

-- CreateEnum
CREATE TYPE "BucketType" AS ENUM ('ASPECT_RATIO', 'DURATION', 'FORMAT', 'ORIENTATION');

-- CreateEnum
CREATE TYPE "RuleType" AS ENUM ('AUTO_PAUSE', 'FATIGUE_ALERT', 'BUDGET_PACING', 'SPEND_CONCENTRATION', 'WINNER_AMPLIFICATION');

-- CreateEnum
CREATE TYPE "AutoActionType" AS ENUM ('PAUSED', 'NOTIFIED', 'FLAGGED', 'SUGGESTED');

-- CreateEnum
CREATE TYPE "AdScheduleStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "assetBucketId" TEXT,
ADD COLUMN     "bulkUploadId" TEXT;

-- AlterTable
ALTER TABLE "meta_ad_metrics" ADD COLUMN     "daysRunning" INTEGER,
ADD COLUMN     "hookRate" DOUBLE PRECISION,
ADD COLUMN     "statusSignal" VARCHAR(64);

-- AlterTable
ALTER TABLE "meta_ads" ADD COLUMN     "duplicatedFromId" TEXT,
ADD COLUMN     "presetId" TEXT,
ADD COLUMN     "scheduleId" TEXT;

-- CreateTable
CREATE TABLE "bulk_uploads" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulk_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_buckets" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "bulkUploadId" TEXT NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "bucketType" "BucketType" NOT NULL,
    "bucketValue" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_buckets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_warnings" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "warningType" "AssetWarningType" NOT NULL,
    "detail" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolution" "WarningResolution",
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_warnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_presets" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "headline" VARCHAR(500),
    "landingPageUrl" VARCHAR(2000),
    "budgetOverride" DOUBLE PRECISION,
    "targetAgeMin" INTEGER,
    "targetAgeMax" INTEGER,
    "targetGenders" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetProfessions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pixelIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ad_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_schedules" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMPTZ(3) NOT NULL,
    "status" "AdScheduleStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_automation_rules" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "ruleType" "RuleType" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "threshold" DOUBLE PRECISION,
    "window" INTEGER,
    "lastTriggeredAt" TIMESTAMPTZ(3),
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ad_automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_automation_events" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "adId" VARCHAR(100) NOT NULL,
    "actionTaken" "AutoActionType" NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "approved" BOOLEAN,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_automation_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bulk_uploads_companyId_idx" ON "bulk_uploads"("companyId");

-- CreateIndex
CREATE INDEX "bulk_uploads_companyId_createdAt_idx" ON "bulk_uploads"("companyId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "asset_buckets_companyId_idx" ON "asset_buckets"("companyId");

-- CreateIndex
CREATE INDEX "asset_buckets_bulkUploadId_idx" ON "asset_buckets"("bulkUploadId");

-- CreateIndex
CREATE INDEX "asset_warnings_assetId_idx" ON "asset_warnings"("assetId");

-- CreateIndex
CREATE INDEX "asset_warnings_assetId_resolved_idx" ON "asset_warnings"("assetId", "resolved");

-- CreateIndex
CREATE INDEX "ad_presets_companyId_idx" ON "ad_presets"("companyId");

-- CreateIndex
CREATE INDEX "ad_presets_companyId_isDefault_idx" ON "ad_presets"("companyId", "isDefault");

-- CreateIndex
CREATE INDEX "ad_schedules_companyId_idx" ON "ad_schedules"("companyId");

-- CreateIndex
CREATE INDEX "ad_schedules_companyId_status_idx" ON "ad_schedules"("companyId", "status");

-- CreateIndex
CREATE INDEX "ad_schedules_scheduledAt_idx" ON "ad_schedules"("scheduledAt");

-- CreateIndex
CREATE INDEX "ad_automation_rules_companyId_idx" ON "ad_automation_rules"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ad_automation_rules_companyId_ruleType_key" ON "ad_automation_rules"("companyId", "ruleType");

-- CreateIndex
CREATE INDEX "ad_automation_events_companyId_idx" ON "ad_automation_events"("companyId");

-- CreateIndex
CREATE INDEX "ad_automation_events_ruleId_idx" ON "ad_automation_events"("ruleId");

-- CreateIndex
CREATE INDEX "ad_automation_events_adId_idx" ON "ad_automation_events"("adId");

-- CreateIndex
CREATE INDEX "ad_automation_events_companyId_createdAt_idx" ON "ad_automation_events"("companyId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "assets_bulkUploadId_idx" ON "assets"("bulkUploadId");

-- CreateIndex
CREATE INDEX "assets_assetBucketId_idx" ON "assets"("assetBucketId");

-- CreateIndex
CREATE INDEX "meta_ads_presetId_idx" ON "meta_ads"("presetId");

-- CreateIndex
CREATE INDEX "meta_ads_scheduleId_idx" ON "meta_ads"("scheduleId");

-- CreateIndex
CREATE INDEX "meta_ads_duplicatedFromId_idx" ON "meta_ads"("duplicatedFromId");

-- AddForeignKey
ALTER TABLE "bulk_uploads" ADD CONSTRAINT "bulk_uploads_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_buckets" ADD CONSTRAINT "asset_buckets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_buckets" ADD CONSTRAINT "asset_buckets_bulkUploadId_fkey" FOREIGN KEY ("bulkUploadId") REFERENCES "bulk_uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_warnings" ADD CONSTRAINT "asset_warnings_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_bulkUploadId_fkey" FOREIGN KEY ("bulkUploadId") REFERENCES "bulk_uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_assetBucketId_fkey" FOREIGN KEY ("assetBucketId") REFERENCES "asset_buckets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_ads" ADD CONSTRAINT "meta_ads_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "ad_presets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_ads" ADD CONSTRAINT "meta_ads_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ad_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_ads" ADD CONSTRAINT "meta_ads_duplicatedFromId_fkey" FOREIGN KEY ("duplicatedFromId") REFERENCES "meta_ads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_presets" ADD CONSTRAINT "ad_presets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_schedules" ADD CONSTRAINT "ad_schedules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_automation_rules" ADD CONSTRAINT "ad_automation_rules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_automation_events" ADD CONSTRAINT "ad_automation_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_automation_events" ADD CONSTRAINT "ad_automation_events_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "ad_automation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
