import { NextResponse } from "next/server";
import type { WooCommerceProduct } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type WooCommerceProductApiRow = {
  id: string;
  shopifyGid: string;
  title: string;
  status: string;
  handle: string;
  totalInventory: number;
  onlineStoreUrl: string | null;
  priceMinAmount: string | null;
  priceMaxAmount: string | null;
  currencyCode: string | null;
  shopifyCreatedAt: string;
  shopifyUpdatedAt: string;
  featuredImageUrl: string | null;
  featuredImageAltText: string | null;
  description: string | null;
};

export function mapWooCommerceProductToApiRow(p: WooCommerceProduct): WooCommerceProductApiRow {
  return {
    id: p.id,
    shopifyGid: `wc:product:${p.wcProductId}`,
    title: p.title,
    status: p.status,
    handle: p.handle,
    totalInventory: p.totalInventory,
    onlineStoreUrl: p.onlineStoreUrl,
    priceMinAmount: p.priceMinAmount,
    priceMaxAmount: p.priceMaxAmount,
    currencyCode: p.currencyCode,
    shopifyCreatedAt: p.wcCreatedAt.toISOString(),
    shopifyUpdatedAt: p.wcUpdatedAt.toISOString(),
    featuredImageUrl: p.featuredImageUrl,
    featuredImageAltText: p.featuredImageAltText,
    description: p.description,
  };
}

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const rows = await prisma.wooCommerceProduct.findMany({
    where: { companyId: session.companyId },
    orderBy: { wcUpdatedAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    data: rows.map(mapWooCommerceProductToApiRow),
  });
}
