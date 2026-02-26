-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('VIDEO', 'IMAGE', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'READY', 'ERROR', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "UploadSource" AS ENUM ('NATIVE', 'YOUTUBE', 'GOOGLE_DRIVE', 'DROPBOX', 'URL');

-- CreateEnum
CREATE TYPE "MicroAssetStatus" AS ENUM ('DRAFT', 'READY', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "logoUrl" VARCHAR(1000),
    "website" VARCHAR(500),
    "email" VARCHAR(255) NOT NULL,
    "userName" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_branding" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "logoUrl" VARCHAR(1000),
    "faviconUrl" VARCHAR(1000),
    "banner" VARCHAR(1000),
    "themeMusic" VARCHAR(1000),
    "primaryColor" VARCHAR(20) NOT NULL DEFAULT '#D7765A',
    "secondaryColor" VARCHAR(20) NOT NULL DEFAULT '#8B5CF6',
    "bgColor" VARCHAR(20) NOT NULL DEFAULT '#141414',
    "surfaceColor" VARCHAR(20) NOT NULL DEFAULT '#181818',
    "textColor" VARCHAR(20) NOT NULL DEFAULT '#FFFFFF',
    "companyAddress" VARCHAR(500) DEFAULT '123 Main St, San Francisco, CA',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "company_branding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "assetType" "AssetType" NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "originalSize" BIGINT NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'UPLOADING',
    "r2Key" VARCHAR(500) NOT NULL,
    "r2Bucket" VARCHAR(255) NOT NULL,
    "resolution" VARCHAR(20),
    "mimeType" VARCHAR(100),
    "duration" INTEGER,
    "fps" INTEGER,
    "codec" VARCHAR(50),
    "streamId" VARCHAR(255),
    "playbackUrl" TEXT,
    "thumbnailUrl" TEXT,
    "pageCount" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "uploadSource" "UploadSource" NOT NULL DEFAULT 'NATIVE',
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_descriptions" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "seoTitle" VARCHAR(500),
    "seoSummary" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "asset_descriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "micro_assets" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "startTime" DOUBLE PRECISION NOT NULL,
    "endTime" DOUBLE PRECISION NOT NULL,
    "hook" TEXT,
    "editingIdea" TEXT,
    "description" TEXT,
    "thumbnail" VARCHAR(1000),
    "status" "MicroAssetStatus" NOT NULL DEFAULT 'DRAFT',
    "category" VARCHAR(100),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION,
    "isRendered" BOOLEAN NOT NULL DEFAULT false,
    "renderedR2Key" VARCHAR(500),
    "renderedR2Bucket" VARCHAR(255),
    "renderedFileSize" BIGINT,
    "renderedStreamId" VARCHAR(255),
    "renderedPlaybackUrl" TEXT,
    "renderedThumbnail" TEXT,
    "renderStatus" VARCHAR(50),
    "renderProgress" INTEGER,
    "renderedAt" TIMESTAMPTZ(3),
    "renderError" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "micro_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_intelligence" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "language" VARCHAR(10),
    "contentType" VARCHAR(100),
    "durationSeconds" INTEGER,
    "theme" VARCHAR(255),
    "sentiment" VARCHAR(50),
    "intensityScore" DOUBLE PRECISION,
    "spiritualElements" BOOLEAN NOT NULL DEFAULT false,
    "titlePrimary" VARCHAR(500),
    "shortSummary" TEXT,
    "longDescription" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tone" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetAudience" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bestPlatforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visualContext" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "videoGenres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "titleVariants" JSONB DEFAULT '{}',
    "chapters" JSONB DEFAULT '[]',
    "shortsHooks" JSONB DEFAULT '[]',
    "clipfoxInsights" JSONB DEFAULT '[]',
    "modelVersion" VARCHAR(50),
    "confidence" DOUBLE PRECISION,
    "processedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "asset_intelligence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "companies_email_key" ON "companies"("email");

-- CreateIndex
CREATE UNIQUE INDEX "companies_userName_key" ON "companies"("userName");

-- CreateIndex
CREATE INDEX "companies_slug_idx" ON "companies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "company_branding_companyId_key" ON "company_branding"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "assets_streamId_key" ON "assets"("streamId");

-- CreateIndex
CREATE INDEX "assets_companyId_idx" ON "assets"("companyId");

-- CreateIndex
CREATE INDEX "assets_assetType_idx" ON "assets"("assetType");

-- CreateIndex
CREATE INDEX "assets_status_idx" ON "assets"("status");

-- CreateIndex
CREATE INDEX "assets_uploadSource_idx" ON "assets"("uploadSource");

-- CreateIndex
CREATE INDEX "assets_assetType_status_idx" ON "assets"("assetType", "status");

-- CreateIndex
CREATE INDEX "assets_assetType_companyId_idx" ON "assets"("assetType", "companyId");

-- CreateIndex
CREATE INDEX "assets_createdAt_idx" ON "assets"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "asset_descriptions_assetId_key" ON "asset_descriptions"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "micro_assets_renderedStreamId_key" ON "micro_assets"("renderedStreamId");

-- CreateIndex
CREATE INDEX "micro_assets_assetId_idx" ON "micro_assets"("assetId");

-- CreateIndex
CREATE INDEX "micro_assets_companyId_idx" ON "micro_assets"("companyId");

-- CreateIndex
CREATE INDEX "micro_assets_status_idx" ON "micro_assets"("status");

-- CreateIndex
CREATE INDEX "micro_assets_category_idx" ON "micro_assets"("category");

-- CreateIndex
CREATE INDEX "micro_assets_createdAt_idx" ON "micro_assets"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "micro_assets_isRendered_idx" ON "micro_assets"("isRendered");

-- CreateIndex
CREATE INDEX "micro_assets_renderStatus_idx" ON "micro_assets"("renderStatus");

-- CreateIndex
CREATE INDEX "micro_assets_assetId_isRendered_idx" ON "micro_assets"("assetId", "isRendered");

-- CreateIndex
CREATE INDEX "asset_intelligence_assetId_idx" ON "asset_intelligence"("assetId");

-- CreateIndex
CREATE INDEX "asset_intelligence_companyId_idx" ON "asset_intelligence"("companyId");

-- CreateIndex
CREATE INDEX "asset_intelligence_language_idx" ON "asset_intelligence"("language");

-- CreateIndex
CREATE INDEX "asset_intelligence_sentiment_idx" ON "asset_intelligence"("sentiment");

-- CreateIndex
CREATE INDEX "asset_intelligence_theme_idx" ON "asset_intelligence"("theme");

-- CreateIndex
CREATE INDEX "asset_intelligence_contentType_idx" ON "asset_intelligence"("contentType");

-- CreateIndex
CREATE INDEX "asset_intelligence_spiritualElements_idx" ON "asset_intelligence"("spiritualElements");

-- CreateIndex
CREATE INDEX "asset_intelligence_processedAt_idx" ON "asset_intelligence"("processedAt" DESC);

-- AddForeignKey
ALTER TABLE "company_branding" ADD CONSTRAINT "company_branding_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_descriptions" ADD CONSTRAINT "asset_descriptions_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "micro_assets" ADD CONSTRAINT "micro_assets_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "micro_assets" ADD CONSTRAINT "micro_assets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_intelligence" ADD CONSTRAINT "asset_intelligence_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_intelligence" ADD CONSTRAINT "asset_intelligence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
