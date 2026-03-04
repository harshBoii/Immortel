-- CreateTable
CREATE TABLE "entity_intelligence" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "productDocs" TEXT,
    "marketResearch" TEXT,
    "customerFeedback" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "entity_intelligence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aeo_generation_profiles" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "brandEntityId" TEXT,
    "baseUrl" VARCHAR(1000) NOT NULL,
    "locale" VARCHAR(10) NOT NULL DEFAULT 'en',
    "clusterId" VARCHAR(255),
    "existingSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "defaultPageType" "AeoPageType" NOT NULL DEFAULT 'COMPARISON',
    "defaultQuery" TEXT,
    "label" VARCHAR(255),
    "slug" VARCHAR(255),
    "lastGeneratedAeoPageId" TEXT,
    "lastRunAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "aeo_generation_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "entity_intelligence_entityId_key" ON "entity_intelligence"("entityId");

-- CreateIndex
CREATE INDEX "entity_intelligence_entityId_idx" ON "entity_intelligence"("entityId");

-- CreateIndex
CREATE INDEX "aeo_generation_profiles_companyId_idx" ON "aeo_generation_profiles"("companyId");

-- CreateIndex
CREATE INDEX "aeo_generation_profiles_brandEntityId_idx" ON "aeo_generation_profiles"("brandEntityId");

-- CreateIndex
CREATE INDEX "aeo_generation_profiles_defaultPageType_idx" ON "aeo_generation_profiles"("defaultPageType");

-- AddForeignKey
ALTER TABLE "entity_intelligence" ADD CONSTRAINT "entity_intelligence_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "brand_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aeo_generation_profiles" ADD CONSTRAINT "aeo_generation_profiles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aeo_generation_profiles" ADD CONSTRAINT "aeo_generation_profiles_brandEntityId_fkey" FOREIGN KEY ("brandEntityId") REFERENCES "brand_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aeo_generation_profiles" ADD CONSTRAINT "aeo_generation_profiles_lastGeneratedAeoPageId_fkey" FOREIGN KEY ("lastGeneratedAeoPageId") REFERENCES "aeo_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
