import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCallsSession } from "@/lib/calls/session";
import type { IntegrationProvider } from "@prisma/client";

export const dynamic = "force-dynamic";

type ProductHit = {
  provider: IntegrationProvider;
  externalId: string;
  title: string;
  description: string | null;
};

export async function GET(request: Request) {
  const session = await getCallsSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(20, Math.max(1, parseInt(url.searchParams.get("limit") ?? "8", 10) || 8));

  if (q.length < 2) {
    return NextResponse.json({ items: [] satisfies ProductHit[] });
  }

  const [shopify, woo] = await Promise.all([
    prisma.shopifyProduct.findMany({
      where: {
        companyId: session.companyId,
        title: { contains: q, mode: "insensitive" },
      },
      orderBy: { shopifyUpdatedAt: "desc" },
      take: limit,
      select: { shopifyGid: true, title: true, description: true },
    }),
    prisma.wooCommerceProduct.findMany({
      where: {
        companyId: session.companyId,
        title: { contains: q, mode: "insensitive" },
      },
      orderBy: { wcUpdatedAt: "desc" },
      take: limit,
      select: { wcProductId: true, title: true, description: true },
    }),
  ]);

  const items: ProductHit[] = [
    ...shopify.map((p) => ({
      provider: "Shopify" as IntegrationProvider,
      externalId: p.shopifyGid,
      title: p.title,
      description: p.description ?? null,
    })),
    ...woo.map((p) => ({
      provider: "WooCommerce" as IntegrationProvider,
      externalId: String(p.wcProductId),
      title: p.title,
      description: p.description ?? null,
    })),
  ].slice(0, limit);

  return NextResponse.json({ items });
}

