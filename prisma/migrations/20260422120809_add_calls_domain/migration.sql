-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "productExternalId" VARCHAR(255),
ADD COLUMN     "productName" VARCHAR(500),
ADD COLUMN     "productProvider" "IntegrationProvider";
