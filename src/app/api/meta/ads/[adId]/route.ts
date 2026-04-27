import { NextResponse } from "next/server";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";
import { prisma } from "@/lib/prisma";
import { fetchMetaAdInsights } from "@/lib/meta/insights";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ adId: string }> },
) {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  const { adId } = await ctx.params;
  const metaAdId = typeof adId === "string" ? adId : "";
  if (!metaAdId) return NextResponse.json({ error: "Missing adId" }, { status: 400 });

  const ad = await prisma.metaAd.findFirst({
    where: {
      metaIntegrationId: loaded.integrationId,
      metaAdId,
    },
    include: {
      adSet: { select: { id: true, name: true, metaAdSetId: true } },
      creative: {
        select: {
          id: true,
          metaCreativeId: true,
          headline: true,
          primaryText: true,
          description: true,
          ctaType: true,
          landingUrl: true,
          imageHash: true,
          imageUrl: true,
          videoId: true,
          videoUrl: true,
          thumbnailUrl: true,
        },
      },
    },
  });

  if (!ad) {
    return NextResponse.json({ error: "Ad not found" }, { status: 404 });
  }

  const latestMetrics = await prisma.metaAdMetrics.findFirst({
    where: { metaAdId },
    orderBy: { recordedAt: "desc" },
  });

  const u = new URL(_req.url);
  const live = u.searchParams.get("live") === "1";
  const liveDatePreset = u.searchParams.get("date_preset") ?? "last_7d";

  let liveInsights: Awaited<ReturnType<typeof fetchMetaAdInsights>> = null;
  if (live) {
    try {
      liveInsights = await fetchMetaAdInsights({
        metaAdId,
        accessToken: loaded.accessToken,
        datePreset: liveDatePreset,
      });
    } catch (e) {
      // Don’t fail the page if live insights are blocked; return DB snapshot.
      console.error("[api/meta/ads/[adId]] live insights failed", e);
      liveInsights = null;
    }
  }

  return NextResponse.json({
    ad,
    metrics: latestMetrics,
    live: live ? liveInsights : null,
    datePreset: live ? liveDatePreset : null,
  });
}

