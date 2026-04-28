import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";
import { createAssetFromMetaImage, createAssetFromMetaVideo } from "@/lib/asset-processing";

export const runtime = "nodejs";
export const maxDuration = 300;

function processingBaseUrl(): string {
  return (
    process.env.PROCESSING_API_BASE ??
    process.env.CLIPFOX_PROCESSING_URL ??
    "https://harshboii--asset-intelligence-fastapi-app.modal.run"
  );
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  let cursor = 0;
  const results: R[] = new Array(items.length);
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await worker(items[idx]!, idx);
    }
  });
  await Promise.all(runners);
  return results;
}

async function hydrateAdMedia(opts: { req: Request; metaAdId: string }) {
  const origin = new URL(opts.req.url).origin;
  const cookie = opts.req.headers.get("cookie") ?? "";
  const res = await fetch(
    `${origin}/api/meta/ads/${encodeURIComponent(opts.metaAdId)}/fetch-media`,
    {
      method: "POST",
      headers: cookie ? { cookie } : undefined,
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `fetch-media HTTP ${res.status}`);
  }
}

type MediaWorkItem =
  | { kind: "video"; metaMediaId: string; metaAdId: string }
  | { kind: "image"; metaMediaId: string; metaAdId: string };

export async function POST(req: Request) {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    return NextResponse.json({ ok: false, error: "Meta not connected" }, { status: 401 });
  }

  const baseUrl = processingBaseUrl().replace(/\/$/, "");
  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL").replace(/\/$/, "");

  // 1) Load sample ads.
  const ads = await prisma.metaAd.findMany({
    where: {
      metaIntegrationId: loaded.integrationId,
      ...( { isSample: true } as any ),
    },
    select: {
      metaAdId: true,
      creative: {
        select: {
          imageHash: true,
          videoId: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (ads.length === 0) {
    return NextResponse.json({
      ok: true,
      counts: { sampleAds: 0, hydratedAds: 0, mediaFound: 0, assetsEnsured: 0, enqueued: 0, skipped: 0, errors: 0 },
      perAd: {},
      errors: [],
    });
  }

  // 2) Hydrate creative/media for each ad (serial; usually small set).
  const hydrateErrors: Array<{ metaAdId: string; error: string }> = [];
  for (const a of ads) {
    try {
      await hydrateAdMedia({ req, metaAdId: a.metaAdId });
    } catch (e) {
      hydrateErrors.push({ metaAdId: a.metaAdId, error: e instanceof Error ? e.message : String(e) });
    }
  }

  // 3) Reload ads (creative fields may now be filled) and resolve MetaMedia rows.
  const refreshed = await prisma.metaAd.findMany({
    where: {
      metaIntegrationId: loaded.integrationId,
      metaAdId: { in: ads.map((a) => a.metaAdId) },
    },
    select: {
      metaAdId: true,
      creative: { select: { imageHash: true, videoId: true } },
    },
  });

  const wantedVideoIds = Array.from(
    new Set(refreshed.map((a) => a.creative?.videoId).filter((v): v is string => Boolean(v))),
  );
  const wantedHashes = Array.from(
    new Set(refreshed.map((a) => a.creative?.imageHash).filter((h): h is string => Boolean(h))),
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
          select: { id: true, videoId: true, assetId: true as any, videoUrl: true, thumbnailUrl: true },
        }),
    wantedHashes.length === 0
      ? []
      : prisma.metaMedia.findMany({
          where: {
            metaIntegrationId: loaded.integrationId,
            kind: "image",
            imageHash: { in: wantedHashes },
          },
          select: { id: true, imageHash: true, assetId: true as any, imageUrl: true },
        }),
  ]);

  const videoById = new Map<string, { id: string }>();
  for (const m of videoMedia as any[]) {
    if (m?.videoId) videoById.set(String(m.videoId), m);
  }
  const imageByHash = new Map<string, { id: string }>();
  for (const m of imageMedia as any[]) {
    if (m?.imageHash) imageByHash.set(String(m.imageHash), m);
  }

  const work: MediaWorkItem[] = [];
  const perAd: Record<string, { video?: { metaMediaId: string }; image?: { metaMediaId: string } }> = {};
  for (const a of refreshed) {
    const metaAdId = a.metaAdId;
    const vid = a.creative?.videoId ?? null;
    const hash = a.creative?.imageHash ?? null;

    const videoRow = vid ? videoById.get(vid) : undefined;
    if (vid && videoRow?.id) {
      const metaMediaId = videoRow.id;
      work.push({ kind: "video", metaMediaId, metaAdId });
      perAd[metaAdId] = { ...(perAd[metaAdId] ?? {}), video: { metaMediaId } };
    }

    const imageRow = hash ? imageByHash.get(hash) : undefined;
    if (hash && imageRow?.id) {
      const metaMediaId = imageRow.id;
      work.push({ kind: "image", metaMediaId, metaAdId });
      perAd[metaAdId] = { ...(perAd[metaAdId] ?? {}), image: { metaMediaId } };
    }
  }

  // 4) Ensure Assets exist for each MetaMedia.
  const ensured: Array<{ metaAdId: string; kind: "video" | "image"; metaMediaId: string; assetId?: string; error?: string }> =
    [];

  for (const item of work) {
    try {
      const assetId =
        item.kind === "video"
          ? (await createAssetFromMetaVideo({ metaMediaId: item.metaMediaId, companyId: loaded.companyId })).assetId
          : (await createAssetFromMetaImage({ metaMediaId: item.metaMediaId, companyId: loaded.companyId })).assetId;

      ensured.push({ metaAdId: item.metaAdId, kind: item.kind, metaMediaId: item.metaMediaId, assetId });
    } catch (e) {
      ensured.push({
        metaAdId: item.metaAdId,
        kind: item.kind,
        metaMediaId: item.metaMediaId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const ensuredAssetIds = Array.from(new Set(ensured.map((e) => e.assetId).filter((v): v is string => Boolean(v))));
  const assets =
    ensuredAssetIds.length === 0
      ? []
      : await prisma.asset.findMany({
          where: { id: { in: ensuredAssetIds }, companyId: loaded.companyId },
          select: {
            id: true,
            intelligenceStatus: true,
            intelligence: { take: 1, orderBy: { processedAt: "desc" } },
          } as any,
        });
  const assetById = new Map(assets.map((a: any) => [a.id, a]));

  // 5) Enqueue Harshboii (skip already analyzed).
  const enqueueItems = ensured
    .filter((e) => Boolean(e.assetId) && !e.error)
    .map((e) => ({
      ...e,
      assetId: e.assetId as string,
      alreadyAnalyzed: Boolean((assetById.get(e.assetId as string) as any)?.intelligence?.[0]),
    }))
    .filter((e) => !e.alreadyAnalyzed)
    // Prioritize VIDEO work before IMAGE work
    .sort((a, b) => {
      const ak = a.kind === "video" ? 0 : 1;
      const bk = b.kind === "video" ? 0 : 1;
      return ak - bk;
    });

  const enqueueResults = await runWithConcurrency(enqueueItems, 3, async (it) => {
    try {
      let api_url: string;
      let asset_type: "VIDEO" | "DOCUMENT";

      if (it.kind === "video") {
        const path = `/api/videos/${it.assetId}/download`;
        api_url = `${appUrl}${path}`;
        asset_type = "VIDEO";
      } else {
        // For image LLM analysis, still use DOCUMENT but provide a URL served by our app.
        // This endpoint redirects to R2 so the microservice can download the image bytes.
        const path = `/api/assets/${it.assetId}/download`;
        api_url = `${appUrl}${path}`;
        asset_type = "DOCUMENT";
      }

      const payload = {
        api_url,
        asset_Id: it.assetId,
        asset_type,
        scene_preset: "sensitive",
      };

      console.log("[meta/samples/analyze] enqueue", {
        metaAdId: it.metaAdId,
        kind: it.kind,
        metaMediaId: it.metaMediaId,
        assetId: it.assetId,
        asset_type,
        api_url,
      });

      const res = await fetch(`${baseUrl}/process-from-api`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`process-from-api HTTP ${res.status}${text ? `: ${text}` : ""}`);
      }

      await prisma.asset.update({
        where: { id: it.assetId },
        data: { intelligenceStatus: "PROCESSING" },
      });

      return { ok: true as const, ...it };
    } catch (e) {
      return { ok: false as const, ...it, error: e instanceof Error ? e.message : String(e) };
    }
  });

  const enqueued = enqueueResults.filter((r) => r.ok).length;
  const errors =
    hydrateErrors.length +
    ensured.filter((e) => e.error).length +
    enqueueResults.filter((r) => !r.ok).length;

  return NextResponse.json({
    ok: true,
    counts: {
      sampleAds: ads.length,
      hydratedAds: ads.length - hydrateErrors.length,
      mediaFound: work.length,
      assetsEnsured: ensured.filter((e) => e.assetId && !e.error).length,
      enqueued,
      skipped: enqueueItems.length ? ensured.filter((e) => {
        if (!e.assetId || e.error) return false;
        return Boolean((assetById.get(e.assetId) as any)?.intelligence?.[0]);
      }).length : 0,
      errors,
    },
    perAd,
    hydrateErrors,
    ensured,
    enqueueResults,
  });
}

