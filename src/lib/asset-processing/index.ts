import { prisma } from "@/lib/prisma";
import { streamToR2 } from "@/lib/cloudfare";

type AssetType = "VIDEO" | "IMAGE";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

function processingBaseUrl(): string {
  return (
    process.env.PROCESSING_API_BASE ??
    process.env.CLIPFOX_PROCESSING_URL ??
    "https://harshboii--asset-intelligence-fastapi-app.modal.run"
  );
}

function assetsBucket(): string {
  return process.env.R2_BUCKET_NAME ?? "";
}

function metaVideoAssetKey(companyId: string, metaVideoId: string): string {
  return `assets/${companyId}/meta/${metaVideoId}.mp4`;
}

export async function processAsset(opts: {
  assetId: string;
  assetType: AssetType;
  scenePreset?: string;
}): Promise<void> {
  const baseUrl = processingBaseUrl().replace(/\/$/, "");
  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL").replace(/\/$/, "");

  const api_url = `${appUrl}/api/videos/${opts.assetId}/download`;
  const payload = {
    api_url,
    asset_Id: opts.assetId,
    asset_type: opts.assetType,
    scene_preset: opts.scenePreset ?? "sensitive",
  };

  const res = await fetch(`${baseUrl}/process-from-api`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `process-from-api failed: HTTP ${res.status}${text ? `: ${text}` : ""}`
    );
  }
}

/**
 * Ensure a Meta video is represented as an `Asset` (R2-backed download),
 * then link the `Asset.id` back onto `MetaMedia.assetId`.
 */
export async function createAssetFromMetaVideo(opts: {
  metaMediaId: string;
  companyId: string;
}): Promise<{ assetId: string }> {
  const bucket = assetsBucket();
  if (!bucket) {
    throw new Error("R2_BUCKET_NAME must be set (assets bucket)");
  }

  const row = await prisma.metaMedia.findUnique({
    where: { id: opts.metaMediaId },
    select: {
      id: true,
      kind: true,
      metaIntegrationId: true,
      videoId: true,
      videoUrl: true,
      thumbnailUrl: true,
      filename: true,
      mimeType: true,
      bytes: true,
      assetId: true as any, // added by migration; keep TS happy before generate
    },
  });

  if (!row) throw new Error("MetaMedia not found");
  if (row.kind !== "video") throw new Error("MetaMedia is not a video");
  if (!row.videoId) throw new Error("MetaMedia.videoId missing");

  // If already linked, just ensure the asset exists.
  if (row.assetId) {
    const existing = await prisma.asset.findFirst({
      where: { id: row.assetId, companyId: opts.companyId },
      select: { id: true },
    });
    if (existing) return { assetId: existing.id };
  }

  const sourceUrl = row.videoUrl;
  if (!sourceUrl) {
    throw new Error("MetaMedia.videoUrl missing (cannot mirror video)");
  }

  const key = metaVideoAssetKey(opts.companyId, row.videoId);

  const dl = await fetch(sourceUrl);
  if (!dl.ok || !dl.body) {
    throw new Error(`Failed to download meta video bytes: HTTP ${dl.status}`);
  }

  const contentType =
    dl.headers.get("content-type") ?? row.mimeType ?? "video/mp4";
  const contentLengthHeader = dl.headers.get("content-length");
  const bytesFromHeader = contentLengthHeader
    ? Number(contentLengthHeader)
    : null;
  const bytes =
    Number.isFinite(bytesFromHeader) && bytesFromHeader != null
      ? bytesFromHeader
      : row.bytes ?? 0;

  await streamToR2({
    body: dl.body as any,
    key,
    contentType,
    bucket,
  });

  const filename = row.filename?.trim() || `meta-${row.videoId}.mp4`;

  const asset = await prisma.asset.create({
    data: {
      companyId: opts.companyId,
      assetType: "VIDEO",
      title: filename,
      filename,
      originalSize: BigInt(bytes),
      status: "READY",
      r2Key: key,
      r2Bucket: bucket,
      mimeType: contentType,
      thumbnailUrl: row.thumbnailUrl ?? null,
      intelligenceStatus: "PROCESSING",
      metadata: {
        source: "meta_ad",
        metaMediaId: row.id,
        metaVideoId: row.videoId,
        metaIntegrationId: row.metaIntegrationId,
      },
      uploadSource: "NATIVE",
    },
    select: { id: true },
  });

  await prisma.metaMedia.update({
    where: { id: row.id },
    data: { assetId: asset.id } as any, // assetId added by migration
  });

  return { assetId: asset.id };
}

export async function listMetaAnalyzedAssets(opts: {
  metaIntegrationId: string;
  companyId: string;
}): Promise<
  Array<{
    metaMediaId: string;
    metaVideoId: string | null;
    thumbnailUrl: string | null;
    asset: {
      id: string;
      title: string;
      filename: string;
      intelligenceStatus: string | null;
      intelligence: any | null;
    };
  }>
> {
  const rows = await prisma.metaMedia.findMany({
    where: {
      metaIntegrationId: opts.metaIntegrationId,
      kind: "video",
      assetId: { not: null } as any,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      videoId: true,
      thumbnailUrl: true,
      assetId: true as any,
      asset: {
        select: {
          id: true,
          title: true,
          filename: true,
          intelligenceStatus: true,
          intelligence: { take: 1, orderBy: { processedAt: "desc" } },
        },
      } as any,
    },
  });

  return rows.map((r: any) => ({
    metaMediaId: r.id,
    metaVideoId: r.videoId ?? null,
    thumbnailUrl: r.thumbnailUrl ?? null,
    asset: {
      id: r.asset.id,
      title: r.asset.title,
      filename: r.asset.filename,
      intelligenceStatus: r.asset.intelligenceStatus ?? null,
      intelligence: (r.asset.intelligence?.[0] ?? null) as any,
    },
  }));
}

