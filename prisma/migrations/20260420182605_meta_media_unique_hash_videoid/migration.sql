/*
  Warnings:

  - A unique constraint covering the columns `[metaIntegrationId,imageHash]` on the table `meta_media` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[metaIntegrationId,videoId]` on the table `meta_media` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "meta_media_metaIntegrationId_imageHash_key" ON "meta_media"("metaIntegrationId", "imageHash");

-- CreateIndex
CREATE UNIQUE INDEX "meta_media_metaIntegrationId_videoId_key" ON "meta_media"("metaIntegrationId", "videoId");
