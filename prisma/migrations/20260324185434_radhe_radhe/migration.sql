-- Idempotent: Neon may already have enum/table from earlier manual or partial applies.

DO $$
BEGIN
    CREATE TYPE "IntegrationProvider" AS ENUM ('Shopify');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "company_integration_cms" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL DEFAULT 'Shopify',
    "apiKey" VARCHAR(500),
    "apiSecret" VARCHAR(500),
    "scopes" TEXT,
    "appUrl" VARCHAR(2000),
    "connectUrl" VARCHAR(2000),
    "expectedShopDomain" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "company_integration_cms_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "company_integration_cms" ADD COLUMN IF NOT EXISTS "connectUrl" VARCHAR(2000);
ALTER TABLE "company_integration_cms" ADD COLUMN IF NOT EXISTS "expectedShopDomain" VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS "company_integration_cms_expectedShopDomain_key" ON "company_integration_cms"("expectedShopDomain");
CREATE INDEX IF NOT EXISTS "company_integration_cms_companyId_idx" ON "company_integration_cms"("companyId");
CREATE UNIQUE INDEX IF NOT EXISTS "company_integration_cms_companyId_provider_key" ON "company_integration_cms"("companyId", "provider");

DO $$
BEGIN
    ALTER TABLE "company_integration_cms" ADD CONSTRAINT "company_integration_cms_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
