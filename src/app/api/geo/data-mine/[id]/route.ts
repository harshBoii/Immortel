import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Params = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const { id } = params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "Invalid body" }, { status: 400 });
  }

  const { label, isActive } = body as { label?: string; isActive?: boolean };

  const existing = await prisma.geoDataSource.findFirst({
    where: { id, companyId: session.companyId },
  });

  if (!existing) {
    return NextResponse.json({ success: false, error: "Source not found" }, { status: 404 });
  }

  const updated = await prisma.geoDataSource.update({
    where: { id },
    data: {
      label: typeof label === "string" && label.trim() ? label : undefined,
      isActive: typeof isActive === "boolean" ? isActive : undefined,
    },
  });

  return NextResponse.json({ success: true, source: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const { id } = params;

  const existing = await prisma.geoDataSource.findFirst({
    where: { id, companyId: session.companyId },
  });

  if (!existing) {
    return NextResponse.json({ success: false, error: "Source not found" }, { status: 404 });
  }

  await prisma.geoDataSource.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}

