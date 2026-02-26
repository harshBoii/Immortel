-- CreateEnum
CREATE TYPE "IntelligenceStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY');

-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "intelligenceStatus" "IntelligenceStatus";

-- CreateIndex
CREATE INDEX "assets_intelligenceStatus_idx" ON "assets"("intelligenceStatus");
