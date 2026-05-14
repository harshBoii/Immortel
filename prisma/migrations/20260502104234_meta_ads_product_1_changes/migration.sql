/*
  Warnings:

  - Added the required column `updatedAt` to the `ad_schedules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `asset_buckets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `asset_warnings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `bulk_uploads` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BulkUploadStatus" AS ENUM ('PROCESSING', 'READY', 'PARTIAL', 'FAILED');

-- AlterTable
ALTER TABLE "ad_schedules" ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL;

-- AlterTable
ALTER TABLE "asset_buckets" ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL;

-- AlterTable
ALTER TABLE "asset_warnings" ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL;

-- AlterTable
ALTER TABLE "bulk_uploads" ADD COLUMN     "status" "BulkUploadStatus" NOT NULL DEFAULT 'PROCESSING',
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3) NOT NULL;

-- AlterTable
ALTER TABLE "meta_ad_sets" ADD COLUMN     "adsetPresetId" TEXT,
ADD COLUMN     "bidAmount" INTEGER,
ADD COLUMN     "bidConstraints" JSONB DEFAULT '{}',
ADD COLUMN     "lifetimeBudget" INTEGER;

-- AlterTable
ALTER TABLE "meta_campaigns" ADD COLUMN     "campaignPresetId" TEXT,
ADD COLUMN     "lifetimeBudget" INTEGER,
ADD COLUMN     "spendCap" BIGINT;

-- CreateTable
CREATE TABLE "campaign_presets" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "objective" VARCHAR(64),
    "status" VARCHAR(32),
    "spendCap" BIGINT,
    "dailyBudget" BIGINT,
    "lifetimeBudget" BIGINT,
    "bidStrategy" VARCHAR(64),
    "specialAdCategories" JSONB DEFAULT '[]',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "campaign_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adset_presets" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "dailyBudget" BIGINT,
    "lifetimeBudget" BIGINT,
    "startTime" TIMESTAMPTZ(3),
    "endTime" TIMESTAMPTZ(3),
    "bidStrategy" VARCHAR(64),
    "bidAmount" BIGINT,
    "bidConstraints" JSONB DEFAULT '{}',
    "targeting" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "adset_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "eventId" TEXT,
    "type" VARCHAR(64) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaign_presets_companyId_idx" ON "campaign_presets"("companyId");

-- CreateIndex
CREATE INDEX "campaign_presets_companyId_isDefault_idx" ON "campaign_presets"("companyId", "isDefault");

-- CreateIndex
CREATE INDEX "adset_presets_companyId_idx" ON "adset_presets"("companyId");

-- CreateIndex
CREATE INDEX "adset_presets_companyId_isDefault_idx" ON "adset_presets"("companyId", "isDefault");

-- CreateIndex
CREATE INDEX "notifications_companyId_idx" ON "notifications"("companyId");

-- CreateIndex
CREATE INDEX "notifications_companyId_isRead_idx" ON "notifications"("companyId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "meta_campaigns" ADD CONSTRAINT "meta_campaigns_campaignPresetId_fkey" FOREIGN KEY ("campaignPresetId") REFERENCES "campaign_presets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_ad_sets" ADD CONSTRAINT "meta_ad_sets_adsetPresetId_fkey" FOREIGN KEY ("adsetPresetId") REFERENCES "adset_presets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_presets" ADD CONSTRAINT "campaign_presets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adset_presets" ADD CONSTRAINT "adset_presets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ad_automation_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
