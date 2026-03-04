import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ companyId: null, sources: [] }, { status: 200 });
  }

  const companyId = session.companyId;

  const sources = await prisma.geoDataSource.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    include: {
      asset: {
        select: {
          id: true,
          assetType: true,
          title: true,
          filename: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  return NextResponse.json({ companyId, sources });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const companyId = session.companyId;
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "Invalid body" }, { status: 400 });
  }

  const { sourceType, label, assetId, rawContent } = body as {
    sourceType?: "FILE" | "TEXT" | "URL";
    label?: string;
    assetId?: string | null;
    rawContent?: string | null;
  };

  if (!sourceType || !["FILE", "TEXT", "URL"].includes(sourceType)) {
    return NextResponse.json({ success: false, error: "Invalid or missing sourceType" }, { status: 400 });
  }

  if (!label || typeof label !== "string") {
    return NextResponse.json({ success: false, error: "Label is required" }, { status: 400 });
  }

  if (sourceType === "FILE") {
    if (!assetId || typeof assetId !== "string") {
      return NextResponse.json({ success: false, error: "assetId is required for FILE sources" }, { status: 400 });
    }

    const asset = await prisma.asset.findFirst({
      where: { id: assetId, companyId },
      select: { id: true },
    });

    if (!asset) {
      return NextResponse.json({ success: false, error: "Asset not found for this company" }, { status: 404 });
    }
  } else {
    if (!rawContent || typeof rawContent !== "string" || !rawContent.trim()) {
      return NextResponse.json(
        { success: false, error: "rawContent is required for TEXT and URL sources" },
        { status: 400 }
      );
    }
  }

  const created = await prisma.geoDataSource.create({
    data: {
      companyId,
      sourceType,
      label,
      assetId: sourceType === "FILE" ? (assetId as string) : null,
      rawContent: sourceType === "FILE" ? null : (rawContent ?? null),
    },
  });

  return NextResponse.json({ success: true, source: created });
}

