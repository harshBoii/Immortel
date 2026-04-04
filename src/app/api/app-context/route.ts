import { NextResponse } from "next/server";
import { IntegrationProvider } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json(
      {
        success: false,
        error: "Not authenticated",
        company: null,
        shopify: null,
        shopifyConnectUrl: null,
        expectedShopDomain: null,
        wordpressIntegration: null,
        woocommerce: null,
      },
      { status: 401 }
    );
  }

  const companyId = session.companyId;

  const [company, shop, cms, wp, wc] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, email: true },
    }),
    prisma.shopifyShop.findFirst({
      where: { companyId, status: "installed" },
      orderBy: { createdAt: "desc" },
      select: { id: true, shopDomain: true, status: true },
    }),
    prisma.companyIntegrationCms.findUnique({
      where: {
        companyId_provider: {
          companyId,
          provider: IntegrationProvider.Shopify,
        },
      },
      select: { connectUrl: true, expectedShopDomain: true },
    }),
    prisma.wordPressIntegration.findUnique({
      where: { tenantId: companyId },
      select: {
        tenantId: true,
        siteUrl: true,
        siteTitle: true,
        authUrl: true,
        userLogin: true,
        status: true,
        connectedAt: true,
      },
    }),
    prisma.wooCommerceStore.findFirst({
      where: { companyId, status: "installed" },
      orderBy: { installedAt: "desc" },
      select: { id: true, storeUrl: true, status: true, keyPermissions: true, installedAt: true },
    }),
  ]);

  if (!company) {
    return NextResponse.json(
      {
        success: false,
        error: "Company not found",
        company: null,
        shopify: null,
        shopifyConnectUrl: null,
        expectedShopDomain: null,
        wordpressIntegration: null,
        woocommerce: null,
      },
      { status: 404 }
    );
  }

  const shopifyConnectUrl =
    cms?.connectUrl?.trim() ? cms.connectUrl.trim() : null;

  const expectedShopDomain = cms?.expectedShopDomain?.trim() ?? "";

  return NextResponse.json({
    success: true,
    company,
    shopify: shop,
    shopifyConnectUrl,
    expectedShopDomain,
    wordpressIntegration: wp,
    woocommerce: wc,
  });
}

