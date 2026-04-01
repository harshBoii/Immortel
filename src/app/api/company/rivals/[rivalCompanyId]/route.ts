import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ rivalCompanyId: string }> }
) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const { rivalCompanyId } = await params;
  if (!rivalCompanyId) {
    return NextResponse.json(
      { success: false, error: "rivalCompanyId is required" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ success: false, error: "name is required" }, { status: 400 });
  }

  const companyId = session.companyId;

  // AuthZ: can only edit companies that are in your rivals list.
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
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.company.update({
    where: { id: rivalCompanyId },
    data: { name },
    select: { id: true, name: true, updatedAt: true },
  });

  return NextResponse.json({
    success: true,
    company: { id: updated.id, name: updated.name, updatedAt: updated.updatedAt.toISOString() },
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ rivalCompanyId: string }> }
) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const { rivalCompanyId } = await params;
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

