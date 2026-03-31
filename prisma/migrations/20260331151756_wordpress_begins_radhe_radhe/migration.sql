-- CreateTable
CREATE TABLE "wordpress_integrations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL,
    "authUrl" TEXT NOT NULL,
    "userLogin" TEXT NOT NULL,
    "credentials" TEXT NOT NULL,
    "siteTitle" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wordpress_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wordpress_integrations_tenantId_key" ON "wordpress_integrations"("tenantId");

-- CreateIndex
CREATE INDEX "wordpress_integrations_tenantId_idx" ON "wordpress_integrations"("tenantId");

-- AddForeignKey
ALTER TABLE "wordpress_integrations" ADD CONSTRAINT "wordpress_integrations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
