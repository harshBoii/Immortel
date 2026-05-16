/*
  Warnings:

  - You are about to drop the column `subscription_created_at` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `subscription_id` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `subscription_status` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `subscription_updated_at` on the `companies` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('STARTER', 'GROWTH', 'SCALE');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "AddOnType" AS ENUM ('AEO_CONTENT_BOOST', 'ALTERNATE_DAY_AUTOMATION', 'EXTRA_RIVALS_PACK');

-- AlterTable
ALTER TABLE "companies" DROP COLUMN "subscription_created_at",
DROP COLUMN "subscription_id",
DROP COLUMN "subscription_status",
DROP COLUMN "subscription_updated_at";

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "external_id" VARCHAR(255),
    "provider" VARCHAR(50) DEFAULT 'razorpay',
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'STARTER',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "cycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "price_amount" INTEGER NOT NULL DEFAULT 4900,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "radar_scans_quota" INTEGER NOT NULL DEFAULT 40,
    "bounty_generator_quota" INTEGER NOT NULL DEFAULT 30,
    "seo_page_generation_quota" INTEGER NOT NULL DEFAULT 20,
    "rivals_analysis_quota" INTEGER NOT NULL DEFAULT 10,
    "trial_ends_at" TIMESTAMPTZ(3),
    "current_period_start" TIMESTAMPTZ(3),
    "current_period_end" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_add_ons" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "add_on_type" "AddOnType" NOT NULL,
    "external_id" VARCHAR(255),
    "price_amount" INTEGER NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "activated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "subscription_add_ons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_companyId_key" ON "subscriptions"("companyId");

-- CreateIndex
CREATE INDEX "subscriptions_companyId_idx" ON "subscriptions"("companyId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_plan_idx" ON "subscriptions"("plan");

-- CreateIndex
CREATE INDEX "subscriptions_external_id_idx" ON "subscriptions"("external_id");

-- CreateIndex
CREATE INDEX "subscription_add_ons_subscription_id_idx" ON "subscription_add_ons"("subscription_id");

-- CreateIndex
CREATE INDEX "subscription_add_ons_add_on_type_idx" ON "subscription_add_ons"("add_on_type");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_add_ons_subscription_id_add_on_type_key" ON "subscription_add_ons"("subscription_id", "add_on_type");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_add_ons" ADD CONSTRAINT "subscription_add_ons_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
