-- AlterEnum
ALTER TYPE "IntegrationProvider" ADD VALUE 'WooCommerce';

-- CreateTable
CREATE TABLE "woocommerce_stores" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "storeUrl" VARCHAR(1000) NOT NULL,
    "consumerKeyEnc" TEXT NOT NULL,
    "consumerSecretEnc" TEXT NOT NULL,
    "wcKeyId" INTEGER,
    "keyPermissions" VARCHAR(50),
    "status" VARCHAR(50) NOT NULL DEFAULT 'installed',
    "webhookSecretEnc" TEXT,
    "installedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "woocommerce_stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "woocommerce_oauth_pending" (
    "state" VARCHAR(128) NOT NULL,
    "companyId" TEXT NOT NULL,
    "storeUrl" VARCHAR(1000) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "woocommerce_oauth_pending_pkey" PRIMARY KEY ("state")
);

-- CreateIndex
CREATE INDEX "woocommerce_stores_companyId_idx" ON "woocommerce_stores"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "woocommerce_stores_companyId_storeUrl_key" ON "woocommerce_stores"("companyId", "storeUrl");

-- CreateIndex
CREATE INDEX "woocommerce_oauth_pending_companyId_idx" ON "woocommerce_oauth_pending"("companyId");

-- CreateIndex
CREATE INDEX "woocommerce_oauth_pending_expiresAt_idx" ON "woocommerce_oauth_pending"("expiresAt");

-- AddForeignKey
ALTER TABLE "woocommerce_stores" ADD CONSTRAINT "woocommerce_stores_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "woocommerce_oauth_pending" ADD CONSTRAINT "woocommerce_oauth_pending_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
