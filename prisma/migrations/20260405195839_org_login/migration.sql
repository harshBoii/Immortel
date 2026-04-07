-- /*
--   Warnings:

--   - A unique constraint covering the columns `[username]` on the table `organizations` will be added. If there are existing duplicate values, this will fail.
--   - Added the required column `password` to the `organizations` table without a default value. This is not possible if the table is not empty.
--   - Added the required column `username` to the `organizations` table without a default value. This is not possible if the table is not empty.

-- */
-- -- AlterTable
-- ALTER TABLE "organizations" ADD COLUMN     "password" TEXT NOT NULL,
-- ADD COLUMN     "username" TEXT NOT NULL;

-- -- CreateIndex
-- CREATE UNIQUE INDEX "organizations_username_key" ON "organizations"("username");

-- Create organizations table if shadow DB replay needs it
CREATE TABLE IF NOT EXISTS "organizations" (
  "id"        TEXT NOT NULL,
  "name"      VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  PRIMARY KEY ("id")
);

-- AlterTable (original migration)
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "password" TEXT NOT NULL DEFAULT '',
                            ADD COLUMN IF NOT EXISTS "username" TEXT NOT NULL DEFAULT '';

-- Remove the defaults after adding (they were only needed to satisfy NOT NULL)
ALTER TABLE "organizations" ALTER COLUMN "password" DROP DEFAULT,
                            ALTER COLUMN "username" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_username_key" ON "organizations"("username");