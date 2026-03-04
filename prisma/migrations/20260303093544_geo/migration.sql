-- CreateEnum
CREATE TYPE "AeoPageType" AS ENUM ('DEFINITION', 'HOW_TO', 'COMPARISON', 'FAQ', 'USE_CASE', 'THOUGHT_LEADERSHIP');

-- CreateEnum
CREATE TYPE "AeoPageStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OfferingType" AS ENUM ('PRODUCT', 'SERVICE', 'FEATURE', 'INTEGRATION', 'PLAN');

-- CreateTable
CREATE TABLE "brand_entities" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "canonicalName" VARCHAR(255),
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "entityType" VARCHAR(100) NOT NULL DEFAULT 'Organization',
    "oneLiner" VARCHAR(500),
    "about" TEXT,
    "industry" VARCHAR(100),
    "category" VARCHAR(100),
    "headquartersCity" VARCHAR(100),
    "headquartersCountry" VARCHAR(100),
    "foundedYear" INTEGER,
    "employeeRange" VARCHAR(50),
    "businessModel" VARCHAR(50),
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetAudiences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "authorityScore" DOUBLE PRECISION,
    "citationCount" INTEGER NOT NULL DEFAULT 0,
    "lastCrawledAt" TIMESTAMPTZ(3),
    "completenessScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastEnrichedAt" TIMESTAMPTZ(3),
    "enrichmentSource" VARCHAR(50),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "brand_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_same_as_links" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "platform" VARCHAR(100) NOT NULL,
    "url" VARCHAR(1000) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMPTZ(3),
    "verifiedBy" VARCHAR(50),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "entity_same_as_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_offerings" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "offeringType" "OfferingType" NOT NULL DEFAULT 'PRODUCT',
    "url" VARCHAR(1000),
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "useCases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetAudiences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "differentiators" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "competitors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "entity_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_clusters" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "pillarPageId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "content_clusters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aeo_pages" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "locale" VARCHAR(10) NOT NULL DEFAULT 'en',
    "pageType" "AeoPageType" NOT NULL DEFAULT 'DEFINITION',
    "status" "AeoPageStatus" NOT NULL DEFAULT 'DRAFT',
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT NOT NULL,
    "facts" JSONB NOT NULL DEFAULT '[]',
    "faq" JSONB NOT NULL DEFAULT '[]',
    "claims" JSONB NOT NULL DEFAULT '[]',
    "summary" JSONB NOT NULL DEFAULT '{}',
    "knowledgeGraph" JSONB NOT NULL DEFAULT '{}',
    "seoTitle" VARCHAR(500),
    "seoDescription" TEXT,
    "canonicalUrl" VARCHAR(1000),
    "clusterId" TEXT,
    "publishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "aeo_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aeo_page_sources" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "assetId" TEXT,
    "intelligenceId" TEXT,
    "contributionScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aeo_page_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RelatedAeoPages" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RelatedAeoPages_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "brand_entities_companyId_key" ON "brand_entities"("companyId");

-- CreateIndex
CREATE INDEX "brand_entities_industry_idx" ON "brand_entities"("industry");

-- CreateIndex
CREATE INDEX "brand_entities_completenessScore_idx" ON "brand_entities"("completenessScore");

-- CreateIndex
CREATE INDEX "entity_same_as_links_entityId_idx" ON "entity_same_as_links"("entityId");

-- CreateIndex
CREATE INDEX "entity_same_as_links_platform_idx" ON "entity_same_as_links"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "entity_same_as_links_entityId_platform_key" ON "entity_same_as_links"("entityId", "platform");

-- CreateIndex
CREATE INDEX "entity_offerings_entityId_idx" ON "entity_offerings"("entityId");

-- CreateIndex
CREATE INDEX "entity_offerings_offeringType_idx" ON "entity_offerings"("offeringType");

-- CreateIndex
CREATE INDEX "entity_offerings_isPrimary_idx" ON "entity_offerings"("isPrimary");

-- CreateIndex
CREATE INDEX "entity_offerings_isActive_idx" ON "entity_offerings"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "entity_offerings_entityId_slug_key" ON "entity_offerings"("entityId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "content_clusters_pillarPageId_key" ON "content_clusters"("pillarPageId");

-- CreateIndex
CREATE INDEX "content_clusters_companyId_idx" ON "content_clusters"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "content_clusters_companyId_slug_key" ON "content_clusters"("companyId", "slug");

-- CreateIndex
CREATE INDEX "aeo_pages_companyId_idx" ON "aeo_pages"("companyId");

-- CreateIndex
CREATE INDEX "aeo_pages_status_idx" ON "aeo_pages"("status");

-- CreateIndex
CREATE INDEX "aeo_pages_pageType_idx" ON "aeo_pages"("pageType");

-- CreateIndex
CREATE INDEX "aeo_pages_clusterId_idx" ON "aeo_pages"("clusterId");

-- CreateIndex
CREATE INDEX "aeo_pages_companyId_status_idx" ON "aeo_pages"("companyId", "status");

-- CreateIndex
CREATE INDEX "aeo_pages_publishedAt_idx" ON "aeo_pages"("publishedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "aeo_pages_companyId_slug_locale_key" ON "aeo_pages"("companyId", "slug", "locale");

-- CreateIndex
CREATE INDEX "aeo_page_sources_pageId_idx" ON "aeo_page_sources"("pageId");

-- CreateIndex
CREATE INDEX "aeo_page_sources_assetId_idx" ON "aeo_page_sources"("assetId");

-- CreateIndex
CREATE INDEX "_RelatedAeoPages_B_index" ON "_RelatedAeoPages"("B");

-- AddForeignKey
ALTER TABLE "brand_entities" ADD CONSTRAINT "brand_entities_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_same_as_links" ADD CONSTRAINT "entity_same_as_links_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "brand_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_offerings" ADD CONSTRAINT "entity_offerings_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "brand_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_clusters" ADD CONSTRAINT "content_clusters_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_clusters" ADD CONSTRAINT "content_clusters_pillarPageId_fkey" FOREIGN KEY ("pillarPageId") REFERENCES "aeo_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aeo_pages" ADD CONSTRAINT "aeo_pages_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aeo_pages" ADD CONSTRAINT "aeo_pages_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "content_clusters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aeo_page_sources" ADD CONSTRAINT "aeo_page_sources_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "aeo_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aeo_page_sources" ADD CONSTRAINT "aeo_page_sources_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aeo_page_sources" ADD CONSTRAINT "aeo_page_sources_intelligenceId_fkey" FOREIGN KEY ("intelligenceId") REFERENCES "asset_intelligence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RelatedAeoPages" ADD CONSTRAINT "_RelatedAeoPages_A_fkey" FOREIGN KEY ("A") REFERENCES "aeo_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RelatedAeoPages" ADD CONSTRAINT "_RelatedAeoPages_B_fkey" FOREIGN KEY ("B") REFERENCES "aeo_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
