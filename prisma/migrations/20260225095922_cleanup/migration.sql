/*
  Warnings:

  - You are about to drop the column `isRendered` on the `micro_assets` table. All the data in the column will be lost.
  - You are about to drop the column `renderError` on the `micro_assets` table. All the data in the column will be lost.
  - You are about to drop the column `renderProgress` on the `micro_assets` table. All the data in the column will be lost.
  - You are about to drop the column `renderStatus` on the `micro_assets` table. All the data in the column will be lost.
  - You are about to drop the column `renderedAt` on the `micro_assets` table. All the data in the column will be lost.
  - You are about to drop the column `renderedFileSize` on the `micro_assets` table. All the data in the column will be lost.
  - You are about to drop the column `renderedPlaybackUrl` on the `micro_assets` table. All the data in the column will be lost.
  - You are about to drop the column `renderedR2Bucket` on the `micro_assets` table. All the data in the column will be lost.
  - You are about to drop the column `renderedR2Key` on the `micro_assets` table. All the data in the column will be lost.
  - You are about to drop the column `renderedStreamId` on the `micro_assets` table. All the data in the column will be lost.
  - You are about to drop the column `renderedThumbnail` on the `micro_assets` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ContentStyle" AS ENUM ('EDUCATIONAL', 'FLASHY', 'CASUAL', 'STORY', 'PROMOTIONAL');

-- DropIndex
DROP INDEX "micro_assets_assetId_isRendered_idx";

-- DropIndex
DROP INDEX "micro_assets_isRendered_idx";

-- DropIndex
DROP INDEX "micro_assets_renderStatus_idx";

-- DropIndex
DROP INDEX "micro_assets_renderedStreamId_key";

-- AlterTable
ALTER TABLE "micro_assets" DROP COLUMN "isRendered",
DROP COLUMN "renderError",
DROP COLUMN "renderProgress",
DROP COLUMN "renderStatus",
DROP COLUMN "renderedAt",
DROP COLUMN "renderedFileSize",
DROP COLUMN "renderedPlaybackUrl",
DROP COLUMN "renderedR2Bucket",
DROP COLUMN "renderedR2Key",
DROP COLUMN "renderedStreamId",
DROP COLUMN "renderedThumbnail",
ADD COLUMN     "shortType" "ContentStyle" DEFAULT 'CASUAL';
