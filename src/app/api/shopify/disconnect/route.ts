import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const shop = await prisma.shopifyShop.findFirst({
    where: { companyId: session.companyId, status: "installed" },
  });

  if (!shop) {
    return NextResponse.json(
      { success: false, error: "No connected Shopify store found" },
      { status: 404 }
    );
  }

  await prisma.shopifyShop.update({
    where: { id: shop.id },
    data: {
      status: "uninstalled",
      uninstalledAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
