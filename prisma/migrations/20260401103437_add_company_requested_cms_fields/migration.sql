-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "requestedCmsIntegrations" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "wordpressRequestedSiteUrl" VARCHAR(1000);
