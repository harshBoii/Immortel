import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { rivalCompanyId: string } }
) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const { rivalCompanyId } = params;
  if (!rivalCompanyId) {
    return NextResponse.json(
      { success: false, error: "rivalCompanyId is required" },
      { status: 400 }
    );
  }

  const companyId = session.companyId;

  const existing = await prisma.companyRival.findUnique({
    where: {
      companyId_rivalCompanyId: {
        companyId,
        rivalCompanyId,
      },
    },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ success: true, deleted: false });
  }

  await prisma.companyRival.delete({ where: { id: existing.id } });
  return NextResponse.json({ success: true, deleted: true });
}

