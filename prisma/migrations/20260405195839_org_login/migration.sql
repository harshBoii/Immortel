/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `organizations` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `password` to the `organizations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `organizations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "password" TEXT NOT NULL,
ADD COLUMN     "username" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "organizations_username_key" ON "organizations"("username");
