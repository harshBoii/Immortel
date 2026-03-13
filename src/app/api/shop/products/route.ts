import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
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
    orderBy: {
      shopifyUpdatedAt: "desc",
    },
  });

  return NextResponse.json({
    success: true,
    data: products,
  });
}

