import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";
import { checkLimit } from "@/lib/subscription/check-limit";
import { incrementUsage } from "@/lib/subscription/increment-usage";

export const runtime = "nodejs";
export const maxDuration = 300;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

type ContractAsset = {
  id: string;
  asset_type: "VIDEO" | "IMAGE";
  title: string;
  filename: string;
  intelligence_status: string | null;
};

type ContractAssetIntelligence = null | {
  id: string | null;
  asset_id: string;
  company_id: string;
  processed_at: string | null;
  language: string | null;
  content_type: string | null;
  duration_seconds: number | null;
  theme: string | null;
  sentiment: string | null;
  intensity_score: number | null;
  spiritual_elements: boolean;
  title_primary: string | null;
  short_summary: string | null;
  long_description: string | null;
  tags: string[];
  tone: string[];
  topics: string[];
  target_audience: string[];
  best_platforms: string[];
  visual_context: string[];
  video_genres: string[];
  title_variants: any;
  chapters: any;
  shorts_hooks: any;
  clipfox_insights: any;
  model_version: string | null;
  confidence: number | null;
};

type ContractMetrics = {
  recorded_at: string | null;
  date_preset: string | null;
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  cpc: number | null;
  roas: number | null;
};

export async function POST() {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    return NextResponse.json({ ok: false, error: "Meta not connected" }, { status: 401 });
  }

  // 1) Eligible MetaMedia: linked Asset AND asset has at least one intelligence row
  const eligibleMedia = await prisma.metaMedia.findMany({
    where: {
      metaIntegrationId: loaded.integrationId,
      assetId: { not: null } as any,
      asset: { intelligence: { some: {} } } as any,
    },
    select: {
      id: true,
      kind: true,
      videoId: true,
      imageHash: true,
      assetId: true as any,
      asset: {
        select: {
          id: true,
          assetType: true,
          title: true,
          filename: true,
          intelligenceStatus: true,
          intelligence: { take: 1, orderBy: { processedAt: "desc" } },
        },
      } as any,
    },
    orderBy: { createdAt: "desc" },
  });

  if (eligibleMedia.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No eligible Meta media found (needs Asset + AssetIntelligence)" },
      { status: 400 },
    );
  }

  const videoIds = eligibleMedia
    .filter((m: any) => m.kind === "video")
    .map((m: any) => m.videoId)
    .filter(Boolean) as string[];

  const imageHashes = eligibleMedia
    .filter((m: any) => m.kind === "image")
    .map((m: any) => m.imageHash)
    .filter(Boolean) as string[];

  // 2) Resolve MetaCreatives that match media identifiers
  const creatives = await prisma.metaCreative.findMany({
    where: {
      metaIntegrationId: loaded.integrationId,
      OR: [
        ...(videoIds.length ? [{ videoId: { in: videoIds } }] : []),
        ...(imageHashes.length ? [{ imageHash: { in: imageHashes } }] : []),
      ],
    },
    select: { id: true, videoId: true, imageHash: true },
  });

  const creativeIds = creatives.map((c) => c.id);
  if (creativeIds.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No MetaCreative rows matched eligible media" },
      { status: 400 },
    );
  }

  // 3) Resolve MetaAds that point at those creatives
  const ads = await prisma.metaAd.findMany({
    where: {
      metaIntegrationId: loaded.integrationId,
      metaCreativeDbId: { in: creativeIds },
    },
    select: { id: true, metaAdId: true, metaCreativeDbId: true },
  });

  if (ads.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No MetaAds matched eligible creatives" },
      { status: 400 },
    );
  }

  // 4) Latest metrics per Meta ad id
  const metaAdIds = Array.from(new Set(ads.map((a) => a.metaAdId)));
  const metricsRows = await prisma.metaAdMetrics.findMany({
    where: { metaAdId: { in: metaAdIds } },
    orderBy: { recordedAt: "desc" },
    select: {
      metaAdId: true,
      impressions: true,
      clicks: true,
      ctr: true,
      spend: true,
      cpc: true,
      roas: true,
      datePreset: true,
      recordedAt: true,
    },
  });

  const latestByMetaAdId = new Map<string, ContractMetrics>();
  for (const r of metricsRows) {
    if (latestByMetaAdId.has(r.metaAdId)) continue;
    latestByMetaAdId.set(r.metaAdId, {
      recorded_at: r.recordedAt?.toISOString?.() ?? null,
      date_preset: r.datePreset ?? null,
      impressions: r.impressions ?? 0,
      clicks: r.clicks ?? 0,
      ctr: r.ctr ?? 0,
      spend: r.spend ?? 0,
      cpc: r.cpc ?? null,
      roas: r.roas ?? null,
    });
  }

  // Map creativeId → (videoId/imageHash)
  const creativeById = new Map<string, { videoId: string | null; imageHash: string | null }>();
  for (const c of creatives) creativeById.set(c.id, { videoId: c.videoId ?? null, imageHash: c.imageHash ?? null });

  // Helper: find a MetaMedia row corresponding to a creative's identifiers.
  const mediaByVideoId = new Map<string, any>();
  const mediaByImageHash = new Map<string, any>();
  for (const m of eligibleMedia as any[]) {
    if (m.kind === "video" && m.videoId) mediaByVideoId.set(m.videoId, m);
    if (m.kind === "image" && m.imageHash) mediaByImageHash.set(m.imageHash, m);
  }

  // Build items (one per eligible ad/creative, mapped to one MetaMedia+Asset)
  const items: Array<{
    asset: ContractAsset;
    asset_intelligence: ContractAssetIntelligence;
    meta_media: { id: string };
    meta_ad_metrics_latest: ContractMetrics;
  }> = [];

  for (const ad of ads) {
    const identifiers = ad.metaCreativeDbId ? creativeById.get(ad.metaCreativeDbId) : undefined;
    if (!identifiers) continue;

    const media =
      (identifiers.videoId && mediaByVideoId.get(identifiers.videoId)) ||
      (identifiers.imageHash && mediaByImageHash.get(identifiers.imageHash)) ||
      null;
    if (!media?.asset) continue;

    const assetRow = media.asset as any;
    const intelRow = (assetRow.intelligence?.[0] ?? null) as any;

    const asset: ContractAsset = {
      id: assetRow.id,
      asset_type: assetRow.assetType === "VIDEO" ? "VIDEO" : "IMAGE",
      title: assetRow.title,
      filename: assetRow.filename,
      intelligence_status: assetRow.intelligenceStatus ?? null,
    };

    const asset_intelligence: ContractAssetIntelligence = intelRow
      ? {
          id: intelRow.id ?? null,
          asset_id: assetRow.id,
          company_id: loaded.companyId,
          processed_at: intelRow.processedAt ? new Date(intelRow.processedAt).toISOString() : null,
          language: intelRow.language ?? null,
          content_type: intelRow.contentType ?? null,
          duration_seconds: intelRow.durationSeconds ?? null,
          theme: intelRow.theme ?? null,
          sentiment: intelRow.sentiment ?? null,
          intensity_score: intelRow.intensityScore ?? null,
          spiritual_elements: Boolean(intelRow.spiritualElements),
          title_primary: intelRow.titlePrimary ?? null,
          short_summary: intelRow.shortSummary ?? null,
          long_description: intelRow.longDescription ?? null,
          tags: Array.isArray(intelRow.tags) ? intelRow.tags : [],
          tone: Array.isArray(intelRow.tone) ? intelRow.tone : [],
          topics: Array.isArray(intelRow.topics) ? intelRow.topics : [],
          target_audience: Array.isArray(intelRow.targetAudience) ? intelRow.targetAudience : [],
          best_platforms: Array.isArray(intelRow.bestPlatforms) ? intelRow.bestPlatforms : [],
          visual_context: Array.isArray(intelRow.visualContext) ? intelRow.visualContext : [],
          video_genres: Array.isArray(intelRow.videoGenres) ? intelRow.videoGenres : [],
          title_variants: intelRow.titleVariants ?? {},
          chapters: intelRow.chapters ?? [],
          shorts_hooks: intelRow.shortsHooks ?? [],
          clipfox_insights: intelRow.clipfoxInsights ?? [],
          model_version: intelRow.modelVersion ?? null,
          confidence: intelRow.confidence ?? null,
        }
      : null;

    items.push({
      asset,
      asset_intelligence,
      meta_media: { id: media.id },
      meta_ad_metrics_latest:
        latestByMetaAdId.get(ad.metaAdId) ?? {
          recorded_at: null,
          date_preset: null,
          impressions: 0,
          clicks: 0,
          ctr: 0,
          spend: 0,
          cpc: null,
          roas: null,
        },
    });
  }

  if (items.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No items could be built (missing mapping or intelligence)" },
      { status: 400 },
    );
  }

  const payload = {
    company_id: loaded.companyId,
    meta_integration_id: loaded.integrationId,
    generated_at: new Date().toISOString(),
    items,
    webhook_url: `${requireEnv("NEXT_PUBLIC_APP_URL").replace(/\/$/, "")}/api/meta/winning-formula/webhook`,
  };

  console.log("[meta/winning-formula/build] POST payload", JSON.stringify(payload, null, 2));

  const limit = await checkLimit(loaded.companyId, "bountyGenerator");
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "reason" in limit ? limit.reason : "Quota exceeded",
        ...("used" in limit
          ? { used: limit.used, quota: limit.quota, remaining: limit.remaining }
          : {}),
      },
      { status: 403 }
    );
  }

  const microserviceBase = requireEnv("MICROSERVICE_URL").replace(/\/$/, "");
  const res = await fetch(`${microserviceBase}/winning-formula/from-meta-analyzed-assets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    return NextResponse.json(
      { ok: false, error: typeof json?.error === "string" ? json.error : "Microservice failed", details: json },
      { status: 502 },
    );
  }

  await incrementUsage(loaded.companyId, "bountyGenerator");

  return NextResponse.json({
    ok: true,
    job_id: typeof json?.job_id === "string" ? json.job_id : null,
  });
}

