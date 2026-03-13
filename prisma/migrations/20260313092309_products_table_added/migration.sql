-- CreateTable
CREATE TABLE "shopify_products" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "shopifyGid" VARCHAR(255) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "handle" VARCHAR(255) NOT NULL,
    "totalInventory" INTEGER NOT NULL DEFAULT 0,
    "onlineStoreUrl" VARCHAR(1000),
    "priceMinAmount" VARCHAR(64),
    "priceMaxAmount" VARCHAR(64),
    "currencyCode" VARCHAR(10),
    "shopifyCreatedAt" TIMESTAMPTZ(3) NOT NULL,
    "shopifyUpdatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shopify_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shopify_products_shopifyGid_key" ON "shopify_products"("shopifyGid");

-- CreateIndex
CREATE INDEX "shopify_products_shopId_idx" ON "shopify_products"("shopId");

-- CreateIndex
CREATE INDEX "shopify_products_companyId_idx" ON "shopify_products"("companyId");

-- CreateIndex
CREATE INDEX "shopify_products_status_idx" ON "shopify_products"("status");

-- AddForeignKey
ALTER TABLE "shopify_products" ADD CONSTRAINT "shopify_products_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shopify_shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopify_products" ADD CONSTRAINT "shopify_products_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
