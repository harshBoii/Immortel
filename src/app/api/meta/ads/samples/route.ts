import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    return NextResponse.json({ ok: false, error: "Meta not connected" }, { status: 401 });
  }

  const u = new URL(req.url);
  const datePreset = (u.searchParams.get("date_preset") ?? "last_7d").trim() || "last_7d";

  const ads = await prisma.metaAd.findMany({
    where: {
      metaIntegrationId: loaded.integrationId,
      // use `as any` so this compiles before prisma client regen
      ...( { isSample: true } as any ),
    },
    include: {
      adSet: {
        select: {
          id: true,
          campaignId: true,
          metaAdSetId: true,
          name: true,
          status: true,
        },
      },
      creative: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const metaAdIds = ads.map((a) => a.metaAdId);
  const metricsRows =
    metaAdIds.length === 0
      ? []
      : await prisma.metaAdMetrics.findMany({
          where: {
            metaAdId: { in: metaAdIds },
            datePreset,
          },
          orderBy: { recordedAt: "desc" },
        });

  const latestByMetaAdId = new Map<string, unknown>();
  for (const m of metricsRows) {
    if (!latestByMetaAdId.has(m.metaAdId)) latestByMetaAdId.set(m.metaAdId, m);
  }

  const wantedVideoIds = Array.from(
    new Set(ads.map((a) => a.creative?.videoId).filter((v): v is string => Boolean(v))),
  );
  const wantedHashes = Array.from(
    new Set(ads.map((a) => a.creative?.imageHash).filter((h): h is string => Boolean(h))),
  );

  const [videoMedia, imageMedia] = await Promise.all([
    wantedVideoIds.length === 0
      ? []
      : prisma.metaMedia.findMany({
          where: {
            metaIntegrationId: loaded.integrationId,
            kind: "video",
            videoId: { in: wantedVideoIds },
          },
          select: {
            id: true,
            videoId: true,
            assetId: true as any,
            status: true,
            asset: {
              select: {
                id: true,
                intelligenceStatus: true,
                intelligence: { take: 1, orderBy: { processedAt: "desc" } },
              },
            } as any,
          },
        }),
    wantedHashes.length === 0
      ? []
      : prisma.metaMedia.findMany({
          where: {
            metaIntegrationId: loaded.integrationId,
            kind: "image",
            imageHash: { in: wantedHashes },
          },
          select: {
            id: true,
            imageHash: true,
            assetId: true as any,
            status: true,
            imageUrl: true,
            asset: {
              select: {
                id: true,
                intelligenceStatus: true,
                intelligence: { take: 1, orderBy: { processedAt: "desc" } },
              },
            } as any,
          },
        }),
  ]);

  const videoByVideoId = new Map<string, any>();
  for (const m of videoMedia as any[]) {
    if (m?.videoId) videoByVideoId.set(String(m.videoId), m);
  }
  const imageByHash = new Map<string, any>();
  for (const m of imageMedia as any[]) {
    if (m?.imageHash) imageByHash.set(String(m.imageHash), m);
  }

  return NextResponse.json({
    ok: true,
    datePreset,
    items: ads.map((ad) => ({
      ad,
      metrics: latestByMetaAdId.get(ad.metaAdId) ?? null,
      media: {
        video: ad.creative?.videoId ? (videoByVideoId.get(ad.creative.videoId) ?? null) : null,
        image: ad.creative?.imageHash ? (imageByHash.get(ad.creative.imageHash) ?? null) : null,
      },
    })),
  });
}

