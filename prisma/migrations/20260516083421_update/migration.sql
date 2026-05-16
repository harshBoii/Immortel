-- CreateTable
CREATE TABLE "subscription_usage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "radar_scans_used" INTEGER NOT NULL DEFAULT 0,
    "bounty_generator_used" INTEGER NOT NULL DEFAULT 0,
    "seo_page_generation_used" INTEGER NOT NULL DEFAULT 0,
    "rivals_analysis_used" INTEGER NOT NULL DEFAULT 0,
    "period_start" TIMESTAMPTZ(3) NOT NULL,
    "period_end" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "subscription_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_usage_companyId_key" ON "subscription_usage"("companyId");

-- CreateIndex
CREATE INDEX "subscription_usage_companyId_idx" ON "subscription_usage"("companyId");

-- CreateIndex
CREATE INDEX "subscription_usage_subscription_id_idx" ON "subscription_usage"("subscription_id");

-- AddForeignKey
ALTER TABLE "subscription_usage" ADD CONSTRAINT "subscription_usage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_usage" ADD CONSTRAINT "subscription_usage_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
