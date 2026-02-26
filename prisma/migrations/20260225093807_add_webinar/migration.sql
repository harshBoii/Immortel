-- AlterTable
ALTER TABLE "webinars" ADD COLUMN     "approved_at" TIMESTAMPTZ(3),
ADD COLUMN     "is_approved" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "webinars_is_approved_idx" ON "webinars"("is_approved");
