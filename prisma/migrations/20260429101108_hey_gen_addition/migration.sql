-- CreateTable
CREATE TABLE "video_generation_jobs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdByUserId" VARCHAR(255),
    "script" TEXT NOT NULL,
    "avatarId" VARCHAR(255) NOT NULL,
    "voiceId" VARCHAR(255) NOT NULL,
    "customAvatarId" VARCHAR(255),
    "customVoiceId" VARCHAR(255),
    "heygenVideoId" VARCHAR(255),
    "heygenStatus" VARCHAR(50) NOT NULL DEFAULT 'queued',
    "heygenError" TEXT,
    "assetId" TEXT,
    "streamUid" VARCHAR(255),
    "r2Key" VARCHAR(500),
    "downloadUrl" VARCHAR(2000),
    "playbackUrl" VARCHAR(2000),
    "thumbnailUrl" VARCHAR(2000),
    "progressMessage" VARCHAR(500),
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "video_generation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "video_generation_jobs_heygenVideoId_key" ON "video_generation_jobs"("heygenVideoId");

-- CreateIndex
CREATE INDEX "video_generation_jobs_companyId_idx" ON "video_generation_jobs"("companyId");

-- CreateIndex
CREATE INDEX "video_generation_jobs_companyId_createdAt_idx" ON "video_generation_jobs"("companyId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "video_generation_jobs_companyId_heygenStatus_idx" ON "video_generation_jobs"("companyId", "heygenStatus");

-- CreateIndex
CREATE INDEX "video_generation_jobs_assetId_idx" ON "video_generation_jobs"("assetId");

-- AddForeignKey
ALTER TABLE "video_generation_jobs" ADD CONSTRAINT "video_generation_jobs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_generation_jobs" ADD CONSTRAINT "video_generation_jobs_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
