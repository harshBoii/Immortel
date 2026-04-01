-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "domain" VARCHAR(255),
ADD COLUMN     "isExternal" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "userName" DROP NOT NULL,
ALTER COLUMN "password" DROP NOT NULL;

-- CreateTable
CREATE TABLE "company_plans" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "maxRivalsAllowed" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "company_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_rivals" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "rivalCompanyId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_rivals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_plans_companyId_key" ON "company_plans"("companyId");

-- CreateIndex
CREATE INDEX "company_plans_companyId_idx" ON "company_plans"("companyId");

-- CreateIndex
CREATE INDEX "company_rivals_companyId_idx" ON "company_rivals"("companyId");

-- CreateIndex
CREATE INDEX "company_rivals_rivalCompanyId_idx" ON "company_rivals"("rivalCompanyId");

-- CreateIndex
CREATE UNIQUE INDEX "company_rivals_companyId_rivalCompanyId_key" ON "company_rivals"("companyId", "rivalCompanyId");

-- AddForeignKey
ALTER TABLE "company_plans" ADD CONSTRAINT "company_plans_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_rivals" ADD CONSTRAINT "company_rivals_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_rivals" ADD CONSTRAINT "company_rivals_rivalCompanyId_fkey" FOREIGN KEY ("rivalCompanyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
