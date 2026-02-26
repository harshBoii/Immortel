-- CreateTable
CREATE TABLE "upload_sessions" (
    "id" TEXT NOT NULL,
    "uploadId" VARCHAR(255) NOT NULL,
    "key" VARCHAR(500) NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "fileType" VARCHAR(200) NOT NULL,
    "totalParts" INTEGER NOT NULL,
    "uploadedParts" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "status" VARCHAR(50) NOT NULL,
    "campaignId" VARCHAR(255),
    "uploadedBy" VARCHAR(255),
    "metadata" TEXT,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "upload_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "upload_sessions_status_idx" ON "upload_sessions"("status");

-- CreateIndex
CREATE INDEX "upload_sessions_uploadedBy_idx" ON "upload_sessions"("uploadedBy");

-- CreateIndex
CREATE INDEX "upload_sessions_campaignId_idx" ON "upload_sessions"("campaignId");
