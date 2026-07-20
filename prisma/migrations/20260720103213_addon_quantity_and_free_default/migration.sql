-- AlterTable
ALTER TABLE "subscription_add_ons" ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET DEFAULT 'FREE';
