import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopifyApiVersion } from "@/lib/shopify/client";

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const shop = await prisma.shopifyShop.findFirst({
    where: { companyId: session.companyId },
    orderBy: { updatedAt: "desc" },
    select: {
      shopDomain: true,
      status: true,
      scopes: true,
      installedAt: true,
      uninstalledAt: true,
    },
  });

  if (!shop) {
    return NextResponse.json(
      { success: false, error: "No Shopify shop found for this company" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      apiVersion: getShopifyApiVersion(),
      shopDomain: shop.shopDomain,
      status: shop.status,
      scopes: shop.scopes,
      installedAt: shop.installedAt,
      uninstalledAt: shop.uninstalledAt,
      hasThemesScopes:
        shop.scopes.includes("read_themes") && shop.scopes.includes("write_themes"),
      hasContentScopes:
        shop.scopes.includes("read_content") && shop.scopes.includes("write_content"),
    },
  });
}

