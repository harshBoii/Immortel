import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }
  const entity = await prisma.brandEntity.findUnique({
    where: { companyId: session.companyId },
    select: { id: true },
  });
  if (!entity) {
    return NextResponse.json({ success: false, error: "Brand entity not found" }, { status: 404 });
  }
  const existing = await prisma.entityOffering.findFirst({
    where: { id, entityId: entity.id },
  });
  if (!existing) {
    return NextResponse.json({ success: false, error: "Offering not found" }, { status: 404 });
  }
  const body = await _request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "Invalid body" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const str = (v: unknown) => (v == null ? undefined : String(v).trim() || undefined);
  const arr = (v: unknown): string[] | undefined =>
    Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : undefined;
  const data: Parameters<typeof prisma.entityOffering.update>[0]["data"] = {};
  if (b.name !== undefined) {
    const name = str(b.name);
    if (name) {
      data.name = name;
      data.slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || existing.slug;
    }
  }
  if (b.description !== undefined) data.description = str(b.description) ?? null;
  if (b.offeringType !== undefined) data.offeringType = (str(b.offeringType) as "PRODUCT" | "SERVICE" | "FEATURE" | "INTEGRATION" | "PLAN") ?? existing.offeringType;
  if (b.url !== undefined) data.url = str(b.url) ?? null;
  if (b.keywords !== undefined) data.keywords = arr(b.keywords) ?? existing.keywords;
  if (b.useCases !== undefined) data.useCases = arr(b.useCases) ?? existing.useCases;
  if (b.targetAudiences !== undefined) data.targetAudiences = arr(b.targetAudiences) ?? existing.targetAudiences;
  if (b.differentiators !== undefined) data.differentiators = arr(b.differentiators) ?? existing.differentiators;
  if (b.competitors !== undefined) data.competitors = arr(b.competitors) ?? existing.competitors;
  if (typeof b.isPrimary === "boolean") data.isPrimary = b.isPrimary;
  if (typeof b.isActive === "boolean") data.isActive = b.isActive;
  const offering = await prisma.entityOffering.update({
    where: { id },
    data,
  });
  const serialized = {
    ...offering,
    createdAt: offering.createdAt.toISOString(),
    updatedAt: offering.updatedAt.toISOString(),
  };
  return NextResponse.json({ success: true, offering: serialized });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }
  const entity = await prisma.brandEntity.findUnique({
    where: { companyId: session.companyId },
    select: { id: true },
  });
  if (!entity) {
    return NextResponse.json({ success: false, error: "Brand entity not found" }, { status: 404 });
  }
  const existing = await prisma.entityOffering.findFirst({
    where: { id, entityId: entity.id },
  });
  if (!existing) {
    return NextResponse.json({ success: false, error: "Offering not found" }, { status: 404 });
  }
  await prisma.entityOffering.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
