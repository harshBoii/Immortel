/*
  Warnings:

  - A unique constraint covering the columns `[assetId]` on the table `meta_media` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "meta_media" ADD COLUMN     "assetId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "meta_media_assetId_key" ON "meta_media"("assetId");

-- AddForeignKey
ALTER TABLE "meta_media" ADD CONSTRAINT "meta_media_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
