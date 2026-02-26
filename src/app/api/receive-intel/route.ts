import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const INTEL_SECRET = process.env.INTEL_WEBHOOK_SECRET;

function validateAuth(request: Request): boolean {
  if (!INTEL_SECRET) return true;
  const header = request.headers.get("x-intel-secret") ?? request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    return header.slice(7) === INTEL_SECRET;
  }
  return header === INTEL_SECRET;
}

export async function POST(request: Request) {
  try {
    if (!validateAuth(request)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const payload = body?.payload ?? body;
    if (!payload?.assetId) {
      return NextResponse.json(
        { success: false, error: "Missing payload.assetId" },
        { status: 400 }
      );
    }

    const asset = await prisma.asset.findUnique({
      where: { id: payload.assetId },
      select: { companyId: true },
    });
    if (!asset) {
      return NextResponse.json(
        { success: false, error: "Asset not found" },
        { status: 404 }
      );
    }

    const companyId = asset.companyId;

    const titleVariants = payload.titleVariants ?? {};
    const chapters = Array.isArray(payload.chapters) ? payload.chapters : [];
    const shortsHooks = Array.isArray(payload.shortsHooks) ? payload.shortsHooks : [];
    const clipfoxInsights = Array.isArray(payload.clipfoxInsights) ? payload.clipfoxInsights : [];

    const data = {
      language: payload.language ?? null,
      contentType: payload.contentType ?? null,
      durationSeconds: payload.durationSeconds ?? null,
      theme: payload.theme ?? null,
      sentiment: payload.sentiment ?? null,
      intensityScore: payload.intensityScore ?? null,
      spiritualElements: Boolean(payload.spiritualElements),
      titlePrimary: payload.titlePrimary ?? null,
      shortSummary: payload.shortSummary ?? null,
      longDescription: payload.longDescription ?? null,
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      tone: Array.isArray(payload.tone) ? payload.tone : [],
      topics: Array.isArray(payload.topics) ? payload.topics : [],
      targetAudience: Array.isArray(payload.targetAudience) ? payload.targetAudience : [],
      bestPlatforms: Array.isArray(payload.bestPlatforms) ? payload.bestPlatforms : [],
      visualContext: Array.isArray(payload.visualContext) ? payload.visualContext : [],
      videoGenres: Array.isArray(payload.videoGenres) ? payload.videoGenres : [],
      titleVariants: titleVariants && typeof titleVariants === "object" ? titleVariants : {},
      chapters,
      shortsHooks,
      clipfoxInsights,
      modelVersion: payload.modelVersion ?? null,
      confidence: payload.confidence ?? null,
    };

    const existing = await prisma.assetIntelligence.findFirst({
      where: { assetId: payload.assetId, companyId },
    });

    if (existing) {
      await prisma.assetIntelligence.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.assetIntelligence.create({
        data: {
          assetId: payload.assetId,
          companyId,
          ...data,
        },
      });
    }

    await prisma.asset.update({
      where: { id: payload.assetId },
      data: { intelligenceStatus: "READY" },
    });
  } catch (e) {
    console.error("[RECEIVE-INTEL]", e);
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
