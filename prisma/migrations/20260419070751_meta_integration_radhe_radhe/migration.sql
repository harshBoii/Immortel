-- CreateTable
CREATE TABLE "meta_integrations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "adAccountId" VARCHAR(100) NOT NULL,
    "fbPageId" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_refreshed" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "meta_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meta_integrations_companyId_key" ON "meta_integrations"("companyId");

-- CreateIndex
CREATE INDEX "meta_integrations_companyId_idx" ON "meta_integrations"("companyId");

-- AddForeignKey
ALTER TABLE "meta_integrations" ADD CONSTRAINT "meta_integrations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
