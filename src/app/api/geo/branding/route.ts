import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }
  const branding = await prisma.companyBranding.findUnique({
    where: { companyId: session.companyId },
  });
  const serialized = branding
    ? {
        ...branding,
        createdAt: branding.createdAt.toISOString(),
        updatedAt: branding.updatedAt.toISOString(),
      }
    : null;
  return NextResponse.json({ success: true, branding: serialized });
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
  const str = (v: unknown, d?: string) => (v == null ? d : String(v).trim() || d);
  const data = {
    logoUrl: b.logoUrl !== undefined ? str(b.logoUrl, null) ?? undefined : undefined,
    faviconUrl: b.faviconUrl !== undefined ? str(b.faviconUrl, null) ?? undefined : undefined,
    banner: b.banner !== undefined ? str(b.banner, null) ?? undefined : undefined,
    themeMusic: b.themeMusic !== undefined ? str(b.themeMusic, null) ?? undefined : undefined,
    primaryColor: b.primaryColor !== undefined ? str(b.primaryColor, "#D7765A") ?? undefined : undefined,
    secondaryColor: b.secondaryColor !== undefined ? str(b.secondaryColor, "#8B5CF6") ?? undefined : undefined,
    bgColor: b.bgColor !== undefined ? str(b.bgColor, "#141414") ?? undefined : undefined,
    surfaceColor: b.surfaceColor !== undefined ? str(b.surfaceColor, "#181818") ?? undefined : undefined,
    textColor: b.textColor !== undefined ? str(b.textColor, "#FFFFFF") ?? undefined : undefined,
    companyAddress: b.companyAddress !== undefined ? str(b.companyAddress, null) ?? undefined : undefined,
  };
  const filtered = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
  const branding = await prisma.companyBranding.upsert({
    where: { companyId: session.companyId },
    create: { companyId: session.companyId, ...filtered },
    update: filtered,
  });
  const serialized = {
    ...branding,
    createdAt: branding.createdAt.toISOString(),
    updatedAt: branding.updatedAt.toISOString(),
  };
  return NextResponse.json({ success: true, branding: serialized });
}
