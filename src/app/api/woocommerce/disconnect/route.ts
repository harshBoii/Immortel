import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  await prisma.wooCommerceStore.deleteMany({
    where: { companyId: session.companyId },
  });

  await prisma.wooCommerceOAuthPending.deleteMany({
    where: { companyId: session.companyId },
  });

  return NextResponse.json({ success: true });
}
