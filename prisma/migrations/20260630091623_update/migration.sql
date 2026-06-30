-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BillingCycle" ADD VALUE 'TWO_YEAR';
ALTER TYPE "BillingCycle" ADD VALUE 'THREE_YEAR';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SubscriptionPlan" ADD VALUE 'DEALIFY_STARTER';
ALTER TYPE "SubscriptionPlan" ADD VALUE 'DEALIFY_PRO';

-- CreateTable
CREATE TABLE "subscription_coupons" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "expiresAt" TIMESTAMPTZ(3),
    "redeemedAt" TIMESTAMPTZ(3),
    "redeemed_by_company_id" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_coupons_code_key" ON "subscription_coupons"("code");

-- CreateIndex
CREATE INDEX "subscription_coupons_plan_redeemedAt_idx" ON "subscription_coupons"("plan", "redeemedAt");

-- AddForeignKey
ALTER TABLE "subscription_coupons" ADD CONSTRAINT "subscription_coupons_redeemed_by_company_id_fkey" FOREIGN KEY ("redeemed_by_company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
