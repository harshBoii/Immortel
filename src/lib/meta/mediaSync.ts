import { graphGet } from "@/lib/meta/graph";
import type { LoadedMetaIntegration } from "@/lib/meta/loadIntegration";
import { prisma } from "@/lib/prisma";
import {
  cfStreamJson,
  getImageAccessUrl,
  getMetaBucket,
  getPresignedGetUrl,
  metaImageKey,
  pollStreamReady,
  streamAccountPath,
  streamMp4PlaybackUrl,
  streamToR2,
  type StreamBody,
} from "@/lib/cloudfare";

const CONCURRENCY = 4;

type AdImageRow = {
  hash?: string;
  permalink_url?: string;
  url?: string;
  url_128?: string;
  width?: number;
  height?: number;
  name?: string;
};

type AdVideoRow = {
  id?: string;
  source?: string;
  picture?: string;
  title?: string;
};

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      const item = items[idx]!;
      try {
        await worker(item);
      } catch (e) {
        console.error("[meta/mediaSync] worker failed", {
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }
  });
  await Promise.all(runners);
}

function uniq(values: Array<string | null | undefined>): string[] {
  const out = new Set<string>();
  for (const v of values) {
    if (typeof v === "string" && v.length > 0) out.add(v);
  }
  return Array.from(out);
}

export type MediaHydrationResult = {
  /** Meta identifier → local MetaMedia.id */
  ids: Map<string, string>;
  /** Meta identifier → row snapshot (for upsert hydration on creatives/ads) */
  rows: Map<string, MediaRowSnapshot>;
  inserted: number;
  skipped: number;
};

export type MediaRowSnapshot = {
  id: string;
  imageHash: string | null;
  videoId: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  videoStreamId: string | null;
  status: string;
};

function snapshot(row: {
  id: string;
  imageHash: string | null;
  videoId: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  videoStreamId: string | null;
  status: string;
}): MediaRowSnapshot {
  return {
    id: row.id,
    imageHash: row.imageHash,
    videoId: row.videoId,
    imageUrl: row.imageUrl,
    videoUrl: row.videoUrl,
    thumbnailUrl: row.thumbnailUrl,
    videoStreamId: row.videoStreamId,
    status: row.status,
  };
}

/**
 * Download each image_hash referenced on Meta, mirror the bytes to R2, and
 * persist a `MetaMedia` row. Safe to call with already-synced hashes: existing
 * rows short-circuit the work and are returned as-is.
 */
export async function hydrateImageHashes(
  hashes: string[],
  loaded: LoadedMetaIntegration,
): Promise<MediaHydrationResult> {
  const unique = uniq(hashes);
  const ids = new Map<string, string>();
  const rows = new Map<string, MediaRowSnapshot>();
  if (unique.length === 0) {
    return { ids, rows, inserted: 0, skipped: 0 };
  }

  const existing = await prisma.metaMedia.findMany({
    where: {
      metaIntegrationId: loaded.integrationId,
      kind: "image",
      imageHash: { in: unique },
    },
    select: {
      id: true,
      imageHash: true,
      videoId: true,
      imageUrl: true,
      videoUrl: true,
      thumbnailUrl: true,
      videoStreamId: true,
      status: true,
    },
  });
  for (const r of existing) {
    if (r.imageHash) {
      ids.set(r.imageHash, r.id);
      rows.set(r.imageHash, snapshot(r));
    }
  }

  const missing = unique.filter((h) => !ids.has(h));
  if (missing.length === 0) {
    return { ids, rows, inserted: 0, skipped: existing.length };
  }

  const bucket = getMetaBucket();
  if (!bucket) {
    console.error("[meta/mediaSync] R2 bucket not configured, skipping image hydration");
    return { ids, rows, inserted: 0, skipped: existing.length };
  }

  let inserted = 0;

  await runWithConcurrency(missing, CONCURRENCY, async (hash) => {
    const detail = (await graphGet(
      `${loaded.actId}/adimages`,
      {
        hashes: JSON.stringify([hash]),
        fields: "hash,permalink_url,url,url_128,width,height,name",
      },
      { accessToken: loaded.accessToken },
    )) as { data?: AdImageRow[] };

    const info = (detail.data ?? [])[0];
    const sourceUrl = info?.permalink_url || info?.url;
    if (!info || !sourceUrl) {
      throw new Error(`adimages lookup returned no url for hash ${hash.slice(0, 8)}`);
    }

    const res = await fetch(sourceUrl);
    if (!res.ok || !res.body) {
      throw new Error(`image download failed: HTTP ${res.status}`);
    }
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const contentLengthHeader = res.headers.get("content-length");
    const bytes = contentLengthHeader ? Number(contentLengthHeader) : null;

    const key = metaImageKey(loaded.companyId, info.name || `${hash}.jpg`);

    await streamToR2({
      body: res.body as unknown as StreamBody,
      key,
      contentType,
      bucket,
    });

    const presigned = await getPresignedGetUrl(key, 86400);
    const displayUrl = getImageAccessUrl(key, presigned);

    const row = await prisma.metaMedia.upsert({
      where: {
        metaIntegrationId_imageHash: {
          metaIntegrationId: loaded.integrationId,
          imageHash: hash,
        },
      },
      create: {
        metaIntegrationId: loaded.integrationId,
        kind: "image",
        imageHash: hash,
        r2Key: key,
        imageUrl: displayUrl,
        mimeType: contentType,
        bytes: Number.isFinite(bytes) ? bytes : null,
        width: info.width ?? null,
        height: info.height ?? null,
        filename: info.name ?? null,
        status: "ready",
      },
      update: {
        r2Key: key,
        imageUrl: displayUrl,
        mimeType: contentType,
        bytes: Number.isFinite(bytes) ? bytes : null,
        width: info.width ?? null,
        height: info.height ?? null,
        filename: info.name ?? null,
        status: "ready",
      },
      select: {
        id: true,
        imageHash: true,
        videoId: true,
        imageUrl: true,
        videoUrl: true,
        thumbnailUrl: true,
        videoStreamId: true,
        status: true,
      },
    });

    ids.set(hash, row.id);
    rows.set(hash, snapshot(row));
    inserted += 1;
  });

  return { ids, rows, inserted, skipped: existing.length };
}

/**
 * For each Meta video_id, ask Cloudflare Stream to copy the playback source
 * from Meta's CDN, then persist a `MetaMedia` row. Idempotent by video_id.
 */
export async function hydrateVideoIds(
  videoIds: string[],
  loaded: LoadedMetaIntegration,
): Promise<MediaHydrationResult> {
  const unique = uniq(videoIds);
  const ids = new Map<string, string>();
  const rows = new Map<string, MediaRowSnapshot>();
  if (unique.length === 0) {
    return { ids, rows, inserted: 0, skipped: 0 };
  }

  const existing = await prisma.metaMedia.findMany({
    where: {
      metaIntegrationId: loaded.integrationId,
      kind: "video",
      videoId: { in: unique },
    },
    select: {
      id: true,
      imageHash: true,
      videoId: true,
      imageUrl: true,
      videoUrl: true,
      thumbnailUrl: true,
      videoStreamId: true,
      status: true,
    },
  });
  for (const r of existing) {
    if (r.videoId) {
      ids.set(r.videoId, r.id);
      rows.set(r.videoId, snapshot(r));
    }
  }

  const missing = unique.filter((v) => !ids.has(v));
  if (missing.length === 0) {
    return { ids, rows, inserted: 0, skipped: existing.length };
  }

  let inserted = 0;

  await runWithConcurrency(missing, CONCURRENCY, async (videoId) => {
    // const detail = (await graphGet(
    //   videoId,
    //   { fields: "source,picture,title" },
    //   { accessToken: loaded.accessToken },
    // )) as AdVideoRow;
    const videoApiUrl = new URL(`https://graph.facebook.com/v25.0/${videoId}`);
    videoApiUrl.searchParams.set("fields", "source,picture,title");
    videoApiUrl.searchParams.set("access_token", loaded.accessToken);
    // Add this temporarily right before the fetch to see what token is being used
    console.log("[hydrateVideo] token prefix", loaded.accessToken.slice(0, 20));
    const videoApiRes = await fetch(videoApiUrl.toString());
    if (!videoApiRes.ok) {
      throw new Error(`Meta video API HTTP ${videoApiRes.status} for videoId ${videoId}`);
    }
    const detail = (await videoApiRes.json()) as AdVideoRow;
    console.log("video response", JSON.stringify(detail, null, 2));

    const source = detail.source;
    console.log("detail", JSON.stringify(detail, null, 2));
    if (!source) {
      throw new Error(`advideo ${videoId} missing source url`);
    }

    const copyEnvelope = await cfStreamJson<{
      uid?: string;
      readyToStream?: boolean;
      thumbnail?: string;
    }>(streamAccountPath("/stream/copy"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: source,
        meta: { origin: "meta", metaVideoId: videoId, title: detail.title ?? "" },
      }),
    });

    const uid = copyEnvelope.result?.uid;
    if (!uid) {
      throw new Error(`Cloudflare Stream copy returned no uid for video ${videoId}`);
    }

    const poll = await pollStreamReady(uid);
    const ready = poll.ready;
    const thumb =
      (typeof poll.result?.thumbnail === "string" && poll.result.thumbnail) ||
      copyEnvelope.result?.thumbnail ||
      detail.picture ||
      null;
    const durationMs =
      typeof poll.result?.duration === "number"
        ? Math.round((poll.result.duration as number) * 1000)
        : null;

    const row = await prisma.metaMedia.upsert({
      where: {
        metaIntegrationId_videoId: {
          metaIntegrationId: loaded.integrationId,
          videoId,
        },
      },
      create: {
        metaIntegrationId: loaded.integrationId,
        kind: "video",
        videoId,
        videoStreamId: uid,
        videoUrl: streamMp4PlaybackUrl(uid),
        thumbnailUrl: thumb,
        filename: detail.title ?? null,
        durationMs,
        status: ready ? "ready" : "processing",
      },
      update: {
        videoStreamId: uid,
        videoUrl: streamMp4PlaybackUrl(uid),
        thumbnailUrl: thumb,
        filename: detail.title ?? null,
        durationMs,
        status: ready ? "ready" : "processing",
      },
      select: {
        id: true,
        imageHash: true,
        videoId: true,
        imageUrl: true,
        videoUrl: true,
        thumbnailUrl: true,
        videoStreamId: true,
        status: true,
      },
    });

    ids.set(videoId, row.id);
    rows.set(videoId, snapshot(row));
    inserted += 1;
  });

  return { ids, rows, inserted, skipped: existing.length };
}
