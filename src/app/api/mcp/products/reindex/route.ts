import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bulkIndexProducts } from "@/lib/productsIndex";

export async function POST() {
  const session = await getSession();

  if (!session?.companyId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const products = await (prisma as any).shopifyProduct.findMany({
    where: {
      companyId: session.companyId,
    },
  });

  await bulkIndexProducts(products);

  return NextResponse.json({
    success: true,
    indexed: products.length,
  });
}

