-- AlterTable
ALTER TABLE "shopify_products" ADD COLUMN     "featuredImageAltText" VARCHAR(500),
ADD COLUMN     "featuredImageHeight" INTEGER,
ADD COLUMN     "featuredImageUrl" VARCHAR(2000),
ADD COLUMN     "featuredImageWidth" INTEGER;
