-- CreateTable
CREATE TABLE "shopify_shops" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "shopDomain" VARCHAR(255) NOT NULL,
    "accessToken" VARCHAR(500) NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" VARCHAR(50) NOT NULL DEFAULT 'installed',
    "installedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uninstalledAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shopify_shops_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shopify_shops_shopDomain_key" ON "shopify_shops"("shopDomain");

-- CreateIndex
CREATE INDEX "shopify_shops_companyId_idx" ON "shopify_shops"("companyId");

-- AddForeignKey
ALTER TABLE "shopify_shops" ADD CONSTRAINT "shopify_shops_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
