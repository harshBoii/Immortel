import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }
  const entity = await prisma.brandEntity.findUnique({
    where: { companyId: session.companyId },
    select: { id: true },
  });
  if (!entity) {
    return NextResponse.json({ success: true, offerings: [] });
  }
  const offerings = await prisma.entityOffering.findMany({
    where: { entityId: entity.id },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
  const serialized = offerings.map((o) => ({
    ...o,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  }));
  return NextResponse.json({ success: true, offerings: serialized });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }
  const entity = await prisma.brandEntity.findUnique({
    where: { companyId: session.companyId },
    select: { id: true },
  });
  if (!entity) {
    return NextResponse.json(
      { success: false, error: "Create a Brand Entity first in Company & brand section." },
      { status: 400 }
    );
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "Invalid body" }, { status: 400 });
  }
  const name = String((body as { name?: string }).name ?? "").trim();
  if (!name) {
    return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });
  }
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [];
  const offering = await prisma.entityOffering.create({
    data: {
      entityId: entity.id,
      name,
      slug: slug || `offering-${Date.now()}`,
      description: (body as { description?: string }).description != null ? String((body as { description?: string }).description).trim() || null : undefined,
      offeringType: ((body as { offeringType?: string }).offeringType as "PRODUCT" | "SERVICE" | "FEATURE" | "INTEGRATION" | "PLAN") ?? "PRODUCT",
      url: (body as { url?: string }).url != null ? String((body as { url?: string }).url).trim() || null : undefined,
      keywords: arr((body as { keywords?: unknown }).keywords),
      useCases: arr((body as { useCases?: unknown }).useCases),
      targetAudiences: arr((body as { targetAudiences?: unknown }).targetAudiences),
      differentiators: arr((body as { differentiators?: unknown }).differentiators),
      competitors: arr((body as { competitors?: unknown }).competitors),
      isPrimary: Boolean((body as { isPrimary?: boolean }).isPrimary),
      isActive: (body as { isActive?: boolean }).isActive !== false,
    },
  });
  const serialized = {
    ...offering,
    createdAt: offering.createdAt.toISOString(),
    updatedAt: offering.updatedAt.toISOString(),
  };
  return NextResponse.json({ success: true, offering: serialized });
}
