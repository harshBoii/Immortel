-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('DAILY', 'WEEKLY', 'MID_MONTHLY', 'MID_WEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "auto_refresh_at" TIMESTAMP(3),
ADD COLUMN     "auto_refresh_frequency" "Frequency" DEFAULT 'MONTHLY',
ADD COLUMN     "auto_refresh_last_run_at" TIMESTAMP(3);
