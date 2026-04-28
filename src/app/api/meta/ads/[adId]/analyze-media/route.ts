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

export async function POST(
  req: Request,
  ctx: { params: Promise<{ adId: string }> },
) {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    return NextResponse.json({ ok: false, error: "Meta not connected" }, { status: 401 });
  }

  const { adId } = await ctx.params;
  const metaAdId = typeof adId === "string" ? adId.trim() : "";
  if (!metaAdId) {
    return NextResponse.json({ ok: false, error: "Missing adId" }, { status: 400 });
  }

  const baseUrl = processingBaseUrl().replace(/\/$/, "");
  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL").replace(/\/$/, "");

  // Ensure creative/media is hydrated and linked.
  await hydrateAdMedia({ req, metaAdId });

  const ad = await prisma.metaAd.findFirst({
    where: {
      metaIntegrationId: loaded.integrationId,
      metaAdId,
    },
    select: {
      metaAdId: true,
      creative: {
        select: {
          videoId: true,
          videoUrl: true,
          imageHash: true,
        },
      },
    },
  });

  if (!ad) {
    return NextResponse.json({ ok: false, error: "Ad not found" }, { status: 404 });
  }

  const videoId = ad.creative?.videoId ?? null;
  const imageHash = ad.creative?.imageHash ?? null;
  const hasVideoUrl = Boolean(ad.creative?.videoUrl);

  let metaMedia:
    | { id: string; kind: "video" | "image" }
    | null = null;

  if (videoId) {
    const m = await prisma.metaMedia.findFirst({
      where: {
        metaIntegrationId: loaded.integrationId,
        kind: "video",
        videoId,
      },
      select: { id: true },
    });
    if (m?.id) metaMedia = { id: m.id, kind: "video" };
  }

  // Fallback to image if no video media exists.
  if (!metaMedia && imageHash) {
    const m = await prisma.metaMedia.findFirst({
      where: {
        metaIntegrationId: loaded.integrationId,
        kind: "image",
        imageHash,
      },
      select: { id: true },
    });
    if (m?.id) metaMedia = { id: m.id, kind: "image" };
  }

  if (!metaMedia) {
    return NextResponse.json(
      { ok: false, error: "No MetaMedia found for this ad (videoId/imageHash missing)" },
      { status: 404 },
    );
  }

  // Ensure an Asset exists for this media.
  const assetId =
    metaMedia.kind === "video"
      ? (await createAssetFromMetaVideo({ metaMediaId: metaMedia.id, companyId: loaded.companyId })).assetId
      : (await createAssetFromMetaImage({ metaMediaId: metaMedia.id, companyId: loaded.companyId })).assetId;

  // Skip if already analyzed.
  const already = await prisma.assetIntelligence.findFirst({
    where: { assetId, companyId: loaded.companyId },
    select: { id: true },
  });
  if (already) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      assetId,
      reason: "Already analyzed",
    });
  }

  // Match frontend logic for VIDEO vs DOCUMENT based on creative.videoUrl.
  const asset_type: "VIDEO" | "DOCUMENT" = hasVideoUrl ? "VIDEO" : "DOCUMENT";
  const api_url = hasVideoUrl
    ? `${appUrl}/api/videos/${assetId}/download`
    : `${appUrl}/api/assets/${assetId}/download`;

  console.log("[meta/ad/analyze-media] enqueue", {
    metaAdId,
    metaMediaId: metaMedia.id,
    metaMediaKind: metaMedia.kind,
    assetId,
    asset_type,
    api_url,
  });

  const payload = {
    api_url,
    asset_Id: assetId,
    asset_type,
    scene_preset: "sensitive",
  };

  const res = await fetch(`${baseUrl}/process-from-api`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      {
        ok: false,
        error: `process-from-api HTTP ${res.status}${text ? `: ${text}` : ""}`,
      },
      { status: 502 },
    );
  }

  await prisma.asset.update({
    where: { id: assetId },
    data: { intelligenceStatus: "PROCESSING" },
  });

  return NextResponse.json({
    ok: true,
    assetId,
    asset_type,
    api_url,
  });
}

