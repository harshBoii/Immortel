-- CreateEnum
CREATE TYPE "BountyStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'HUNTED', 'DISMISSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BountyDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateTable
CREATE TABLE "citation_bounties" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "intent" VARCHAR(255),
    "pageType" "AeoPageType" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "difficulty" "BountyDifficulty" NOT NULL DEFAULT 'EASY',
    "estimatedReach" INTEGER,
    "suggestedCluster" VARCHAR(255),
    "status" "BountyStatus" NOT NULL DEFAULT 'OPEN',
    "huntedAt" TIMESTAMPTZ(3),
    "aeoPageId" TEXT,
    "generationContext" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "citation_bounties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "citation_bounties_aeoPageId_key" ON "citation_bounties"("aeoPageId");

-- CreateIndex
CREATE INDEX "citation_bounties_companyId_idx" ON "citation_bounties"("companyId");

-- CreateIndex
CREATE INDEX "citation_bounties_status_idx" ON "citation_bounties"("status");

-- CreateIndex
CREATE INDEX "citation_bounties_confidence_idx" ON "citation_bounties"("confidence");

-- CreateIndex
CREATE INDEX "citation_bounties_difficulty_idx" ON "citation_bounties"("difficulty");

-- CreateIndex
CREATE INDEX "citation_bounties_companyId_status_idx" ON "citation_bounties"("companyId", "status");

-- CreateIndex
CREATE INDEX "citation_bounties_companyId_status_confidence_idx" ON "citation_bounties"("companyId", "status", "confidence");

-- AddForeignKey
ALTER TABLE "citation_bounties" ADD CONSTRAINT "citation_bounties_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citation_bounties" ADD CONSTRAINT "citation_bounties_aeoPageId_fkey" FOREIGN KEY ("aeoPageId") REFERENCES "aeo_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
