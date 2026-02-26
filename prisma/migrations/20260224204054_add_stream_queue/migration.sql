-- CreateEnum
CREATE TYPE "StreamQueueStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "StreamQueuePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- CreateTable
CREATE TABLE "stream_queue" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "r2Key" VARCHAR(500) NOT NULL,
    "r2Bucket" VARCHAR(255) NOT NULL,
    "status" "StreamQueueStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "StreamQueuePriority" NOT NULL DEFAULT 'NORMAL',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "streamId" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "stream_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stream_queue_status_priority_createdAt_idx" ON "stream_queue"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "stream_queue_assetId_idx" ON "stream_queue"("assetId");

-- AddForeignKey
ALTER TABLE "stream_queue" ADD CONSTRAINT "stream_queue_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
