import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated", company: null, shopify: null },
      { status: 401 }
    );
  }

  const companyId = session.companyId;

  const [company, shop] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, email: true },
    }),
    prisma.shopifyShop.findFirst({
      where: { companyId, status: "installed" },
      orderBy: { createdAt: "desc" },
      select: { id: true, shopDomain: true, status: true },
    }),
  ]);

  if (!company) {
    return NextResponse.json(
      { success: false, error: "Company not found", company: null, shopify: null },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    company,
    shopify: shop,
  });
}

