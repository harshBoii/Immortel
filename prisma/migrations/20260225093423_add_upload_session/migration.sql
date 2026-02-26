-- AlterTable
ALTER TABLE "micro_assets" ADD COLUMN     "approved_at" TIMESTAMPTZ(3),
ADD COLUMN     "is_approved" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "webinars" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "assetId" TEXT,
    "companyId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMPTZ(3),
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringDayOfWeek" VARCHAR(20),
    "recurringTime" VARCHAR(10),
    "timeZone" VARCHAR(50),
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "webinars_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "webinars_companyId_idx" ON "webinars"("companyId");

-- CreateIndex
CREATE INDEX "webinars_assetId_idx" ON "webinars"("assetId");

-- CreateIndex
CREATE INDEX "webinars_scheduledAt_idx" ON "webinars"("scheduledAt");

-- CreateIndex
CREATE INDEX "micro_assets_is_approved_idx" ON "micro_assets"("is_approved");

-- AddForeignKey
ALTER TABLE "webinars" ADD CONSTRAINT "webinars_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webinars" ADD CONSTRAINT "webinars_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
