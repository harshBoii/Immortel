-- CreateEnum
CREATE TYPE "GeoSourceType" AS ENUM ('FILE', 'TEXT', 'URL');

-- CreateTable
CREATE TABLE "geo_data_sources" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sourceType" "GeoSourceType" NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "assetId" TEXT,
    "rawContent" TEXT,
    "processedContent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "geo_data_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "geo_data_sources_assetId_key" ON "geo_data_sources"("assetId");

-- CreateIndex
CREATE INDEX "geo_data_sources_companyId_idx" ON "geo_data_sources"("companyId");

-- CreateIndex
CREATE INDEX "geo_data_sources_sourceType_idx" ON "geo_data_sources"("sourceType");

-- AddForeignKey
ALTER TABLE "geo_data_sources" ADD CONSTRAINT "geo_data_sources_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geo_data_sources" ADD CONSTRAINT "geo_data_sources_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
