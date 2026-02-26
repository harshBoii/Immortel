import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    const { assetId } = await params;
    if (!assetId) {
      return NextResponse.json(
        { success: false, error: "Missing assetId" },
        { status: 400 }
      );
    }

    const asset = await prisma.asset.findFirst({
      where: { id: assetId, companyId: session.companyId },
      include: {
        intelligence: { take: 1, orderBy: { processedAt: "desc" } },
      },
    });

    if (!asset) {
      return NextResponse.json(
        { success: false, error: "Asset not found" },
        { status: 404 }
      );
    }

    const intelligence = asset.intelligence[0] ?? null;
    return NextResponse.json({
      success: true,
      data: {
        asset: {
          id: asset.id,
          title: asset.title,
          filename: asset.filename,
          assetType: asset.assetType,
          status: asset.status,
          duration: asset.duration,
          resolution: asset.resolution,
          thumbnailUrl: asset.thumbnailUrl,
          playbackUrl: asset.playbackUrl,
          streamId: asset.streamId,
          createdAt: asset.createdAt.toISOString(),
        },
        intelligence: intelligence
          ? {
              id: intelligence.id,
              language: intelligence.language,
              contentType: intelligence.contentType,
              durationSeconds: intelligence.durationSeconds,
              theme: intelligence.theme,
              sentiment: intelligence.sentiment,
              intensityScore: intelligence.intensityScore,
              spiritualElements: intelligence.spiritualElements,
              titlePrimary: intelligence.titlePrimary,
              shortSummary: intelligence.shortSummary,
              longDescription: intelligence.longDescription,
              tags: intelligence.tags,
              tone: intelligence.tone,
              topics: intelligence.topics,
              targetAudience: intelligence.targetAudience,
              bestPlatforms: intelligence.bestPlatforms,
              visualContext: intelligence.visualContext,
              videoGenres: intelligence.videoGenres,
              titleVariants: intelligence.titleVariants,
              chapters: intelligence.chapters,
              shortsHooks: intelligence.shortsHooks,
              clipfoxInsights: intelligence.clipfoxInsights,
              modelVersion: intelligence.modelVersion,
              confidence: intelligence.confidence,
              processedAt: intelligence.processedAt.toISOString(),
            }
          : null,
      },
    });
  } catch (error) {
    console.error("[ASSET DESCRIPTION]", error);
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message ?? "Failed to load asset description" },
      { status: 500 }
    );
  }
}
