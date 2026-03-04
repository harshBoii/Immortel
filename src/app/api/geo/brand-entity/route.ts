import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function str(v: unknown) {
  return v == null ? null : String(v).trim() || null;
}
function num(v: unknown) {
  return v == null || v === "" ? null : Number(v);
}
function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [];
}

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }
  const entity = await prisma.brandEntity.findUnique({
    where: { companyId: session.companyId },
  });
  const serialized = entity
    ? {
        ...entity,
        createdAt: entity.createdAt.toISOString(),
        updatedAt: entity.updatedAt.toISOString(),
        lastCrawledAt: entity.lastCrawledAt?.toISOString() ?? null,
        lastEnrichedAt: entity.lastEnrichedAt?.toISOString() ?? null,
      }
    : null;
  return NextResponse.json({ success: true, brandEntity: serialized });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "Invalid body" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const update: Record<string, unknown> = {};
  if (b.canonicalName !== undefined) update.canonicalName = str(b.canonicalName);
  if (b.aliases !== undefined) update.aliases = arr(b.aliases);
  if (b.entityType !== undefined) update.entityType = str(b.entityType) ?? "Organization";
  if (b.oneLiner !== undefined) update.oneLiner = str(b.oneLiner);
  if (b.about !== undefined) update.about = str(b.about);
  if (b.industry !== undefined) update.industry = str(b.industry);
  if (b.category !== undefined) update.category = str(b.category);
  if (b.headquartersCity !== undefined) update.headquartersCity = str(b.headquartersCity);
  if (b.headquartersCountry !== undefined) update.headquartersCountry = str(b.headquartersCountry);
  if (b.foundedYear !== undefined) update.foundedYear = num(b.foundedYear);
  if (b.employeeRange !== undefined) update.employeeRange = str(b.employeeRange);
  if (b.businessModel !== undefined) update.businessModel = str(b.businessModel);
  if (b.topics !== undefined) update.topics = arr(b.topics);
  if (b.keywords !== undefined) update.keywords = arr(b.keywords);
  if (b.targetAudiences !== undefined) update.targetAudiences = arr(b.targetAudiences);

  const filtered = Object.fromEntries(Object.entries(update).filter(([, v]) => v !== undefined));
  const entity = await prisma.brandEntity.upsert({
    where: { companyId: session.companyId },
    create: { companyId: session.companyId, ...filtered } as Prisma.BrandEntityUncheckedCreateInput,
    update: filtered as Prisma.BrandEntityUpdateInput,
  });
  const serialized = {
    ...entity,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
    lastCrawledAt: entity.lastCrawledAt?.toISOString() ?? null,
    lastEnrichedAt: entity.lastEnrichedAt?.toISOString() ?? null,
  };
  return NextResponse.json({ success: true, brandEntity: serialized });
}
