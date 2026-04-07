-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PENDING', 'FAILED');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "subscription_created_at" TIMESTAMP(3),
ADD COLUMN     "subscription_id" TEXT,
ADD COLUMN     "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "subscription_updated_at" TIMESTAMP(3);
