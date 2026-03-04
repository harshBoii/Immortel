import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ companyId: null, pages: [], bounties: [] }, { status: 200 });
  }

  const companyId = session.companyId;

  const [pages, bounties] = await Promise.all([
    prisma.aeoPage.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.citationBounty.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ companyId, pages, bounties });
}

