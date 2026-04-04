-- CreateTable
CREATE TABLE "woocommerce_products" (
    "id" TEXT NOT NULL,
    "wooCommerceStoreId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "wcProductId" INTEGER NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "wcStatusRaw" VARCHAR(50),
    "handle" VARCHAR(255) NOT NULL,
    "totalInventory" INTEGER NOT NULL DEFAULT 0,
    "onlineStoreUrl" VARCHAR(1000),
    "priceMinAmount" VARCHAR(64),
    "priceMaxAmount" VARCHAR(64),
    "currencyCode" VARCHAR(10),
    "wcCreatedAt" TIMESTAMPTZ(3) NOT NULL,
    "wcUpdatedAt" TIMESTAMPTZ(3) NOT NULL,
    "featuredImageAltText" VARCHAR(500),
    "featuredImageHeight" INTEGER,
    "featuredImageUrl" VARCHAR(2000),
    "featuredImageWidth" INTEGER,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "woocommerce_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "woocommerce_products_companyId_idx" ON "woocommerce_products"("companyId");

-- CreateIndex
CREATE INDEX "woocommerce_products_wooCommerceStoreId_idx" ON "woocommerce_products"("wooCommerceStoreId");

-- CreateIndex
CREATE UNIQUE INDEX "woocommerce_products_wooCommerceStoreId_wcProductId_key" ON "woocommerce_products"("wooCommerceStoreId", "wcProductId");

-- AddForeignKey
ALTER TABLE "woocommerce_products" ADD CONSTRAINT "woocommerce_products_wooCommerceStoreId_fkey" FOREIGN KEY ("wooCommerceStoreId") REFERENCES "woocommerce_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "woocommerce_products" ADD CONSTRAINT "woocommerce_products_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
