import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { graphGet } from "@/lib/meta/graph";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 300;

// ─── Env ────────────────────────────────────────────────────────────────────

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const CF_STREAM_TOKEN = process.env.CLOUDFLARE_STREAM_TOKEN!;
const CF_STREAM_SUBDOMAIN = process.env.CLOUDFLARE_STREAM_SUBDOMAIN!; // customer-xxxx
const R2_BUCKET = process.env.R2_BUCKET_NAME!;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!; // https://your-domain.com or r2.dev URL

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// ─── Types ───────────────────────────────────────────────────────────────────

type VideoData = {
  video_id?: string;
  image_hash?: string;
  image_url?: string;
};

type LinkData = {
  image_hash?: string;
  video_id?: string;
  child_attachments?: Array<{ image_hash?: string; video_id?: string }>;
};

type AdCreative = {
  id: string;
  name?: string;
  image_hash?: string;
  image_url?: string;
  video_id?: string;
  thumbnail_url?: string;
  object_story_spec?: {
    video_data?: VideoData;
    link_data?: LinkData;
    template_data?: unknown; // DPA — no real media
  } | null;
};

type MetaVideoDetail = {
  id: string;
  source?: string;  // mp4 CDN URL
  picture?: string; // thumbnail CDN URL
  title?: string;
};

type StreamUploadResult = {
  uid: string;
  playbackUrl: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(step: string, data: Record<string, unknown>) {
  console.log(`[adcreatives/sync] [${step}]`, JSON.stringify(data));
}

function isMissingVideoIdFieldError(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const msg = String((e as any).message ?? "").toLowerCase();
  if (!msg.includes("video_id")) return false;
  const code =
    (e as any).code ??
    (e as any).payload?.error?.code ??
    (e as any).payload?.code ??
    (e as any).response?.error?.code;
  if (code === 100) return true;
  return (
    msg.includes("nonexisting field") ||
    msg.includes("tried accessing nonexisting field")
  );
}

function parseCursorPayload(body: unknown): { after?: string; limit: number } {
  const obj =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const after =
    typeof obj.after === "string" && obj.after.length > 0
      ? obj.after
      : undefined;
  const rawLimit =
    typeof obj.limit === "number" ? obj.limit : Number(obj.limit);
  const limit = Number.isFinite(rawLimit) ? Math.floor(rawLimit) : 10;
  return { after, limit: Math.min(50, Math.max(1, limit || 10)) };
}

// Collect all unique video IDs + image hashes from a creative
function extractMedia(c: AdCreative): {
  videoId: string | null;
  imageHash: string | null;
  imageUrl: string | null;
} {
  const videoId =
    c.video_id ||
    c.object_story_spec?.video_data?.video_id ||
    null;

  const imageHash =
    c.image_hash ||
    c.object_story_spec?.video_data?.image_hash ||
    c.object_story_spec?.link_data?.image_hash ||
    null;

  const imageUrl =
    c.image_url ||
    c.object_story_spec?.video_data?.image_url ||
    null;

  return { videoId, imageHash, imageUrl };
}

function isDpaOnly(c: AdCreative): boolean {
  return (
    !c.video_id &&
    !c.image_hash &&
    !c.image_url &&
    !c.object_story_spec?.video_data &&
    !c.object_story_spec?.link_data &&
    Boolean(c.object_story_spec?.template_data)
  );
}

// ─── Step 1: Fetch adcreatives page ─────────────────────────────────────────

const CREATIVE_FIELD_ATTEMPTS = [
  "id,name,image_hash,image_url,video_id,thumbnail_url,object_story_spec{video_data{video_id,image_hash,image_url},link_data{image_hash,video_id,child_attachments{image_hash,video_id}},template_data}",
  "id,name,image_hash,image_url,thumbnail_url,object_story_spec{video_data{video_id,image_hash,image_url},link_data{image_hash,child_attachments{image_hash}},template_data}",
  "id,name,image_hash,image_url,thumbnail_url,object_story_spec{video_data{image_hash,image_url},link_data{image_hash},template_data}",
  "id,name,image_hash,image_url,thumbnail_url",
];

async function fetchCreativesPage(
  actId: string,
  accessToken: string,
  limit: number,
  after?: string
): Promise<{ creatives: AdCreative[]; nextAfter: string | null }> {
  let lastError: unknown = null;

  for (const fields of CREATIVE_FIELD_ATTEMPTS) {
    try {
      const params: Record<string, string | number | undefined> = {
        fields,
        limit,
      };
      if (after) params.after = after;

      const page = (await graphGet(`${actId}/adcreatives`, params, {
        accessToken,
      })) as {
        data?: AdCreative[];
        paging?: { cursors?: { after?: string } };
      };

      log("fetch", {
        attempt: fields.slice(0, 60) + "...",
        count: page.data?.length ?? 0,
      });

      return {
        creatives: page.data ?? [],
        nextAfter: page.paging?.cursors?.after ?? null,
      };
    } catch (e) {
      lastError = e;
      log("fetch:retry", {
        reason: (e as any)?.message,
        isVideoIdErr: isMissingVideoIdFieldError(e),
      });
      if (!isMissingVideoIdFieldError(e)) throw e;
    }
  }

  if (lastError) throw lastError;
  return { creatives: [], nextAfter: null };
}

// ─── Step 3: Fetch Meta video details ────────────────────────────────────────

async function fetchMetaVideoDetail(
  videoId: string,
  accessToken: string
): Promise<MetaVideoDetail | null> {
  try {
    const res = (await graphGet(
      videoId,
      { fields: "id,source,picture,title" },
      { accessToken }
    )) as MetaVideoDetail;
    log("video:fetched", { videoId, hasSource: Boolean(res.source), title: res.title });
    console.log("video response", JSON.stringify(res, null, 2));
    return res;
  } catch (e) {
    log("video:failed", { videoId, error: (e as any)?.message });
    return null;
  }
}

// ─── Step 4: Upload to Cloudflare Stream ─────────────────────────────────────

async function uploadToStream(
  sourceUrl: string,
  title: string,
  metaVideoId: string
): Promise<StreamUploadResult | null> {
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/copy`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CF_STREAM_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: sourceUrl,
          meta: { name: title || metaVideoId },
          requireSignedURLs: false,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      log("stream:failed", { metaVideoId, status: res.status, error: err });
      return null;
    }

    const json = (await res.json()) as { result?: { uid?: string } };
    const uid = json.result?.uid;
    if (!uid) {
      log("stream:no-uid", { metaVideoId });
      return null;
    }

    const playbackUrl = `https://${CF_STREAM_SUBDOMAIN}.cloudflarestream.com/${uid}/manifest/video.m3u8`;
    log("stream:uploaded", { metaVideoId, uid, playbackUrl });
    return { uid, playbackUrl };
  } catch (e) {
    log("stream:error", { metaVideoId, error: (e as any)?.message });
    return null;
  }
}

// ─── Step 5: Upload image/thumbnail to R2 ────────────────────────────────────

async function uploadUrlToR2(
  sourceUrl: string,
  key: string,
  contentType: string
): Promise<string | null> {
  try {
    const fetchRes = await fetch(sourceUrl);
    if (!fetchRes.ok) {
      log("r2:fetch-failed", { key, status: fetchRes.status });
      return null;
    }
    const buffer = Buffer.from(await fetchRes.arrayBuffer());

    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    const publicUrl = `${R2_PUBLIC_URL}/${key}`;
    log("r2:uploaded", { key, bytes: buffer.length });
    return publicUrl;
  } catch (e) {
    log("r2:error", { key, error: (e as any)?.message });
    return null;
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  const { after, limit } = parseCursorPayload(
    await req.json().catch(() => null)
  );

  log("start", {
    integrationId: loaded.integrationId,
    actId: loaded.actId,
    limit,
    after: after ?? null,
  });

  // ── Step 1: Fetch creatives page ─────────────────────────────────────────

  let creatives: AdCreative[] = [];
  let nextAfter: string | null = null;

  try {
    ({ creatives, nextAfter } = await fetchCreativesPage(
      loaded.actId,
      loaded.accessToken,
      limit,
      after
    ));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fetch failed";
    log("fetch:fatal", { error: msg });
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  log("fetch:done", { total: creatives.length, nextAfter });

  // ── Step 2: Collect unique video IDs + image refs ─────────────────────────

  const videoIdToCreativeIds = new Map<string, string[]>();
  const creativeMediaMap = new Map<
    string,
    { videoId: string | null; imageHash: string | null; imageUrl: string | null }
  >();
  let dpaSkipped = 0;

  for (const c of creatives) {
    if (isDpaOnly(c)) {
      dpaSkipped += 1;
      log("creative:dpa-skip", { creativeId: c.id, name: c.name });
      continue;
    }

    const media = extractMedia(c);
    creativeMediaMap.set(c.id, media);

    if (media.videoId) {
      const existing = videoIdToCreativeIds.get(media.videoId) ?? [];
      existing.push(c.id);
      videoIdToCreativeIds.set(media.videoId, existing);
    }
  }

  log("collect", {
    withMedia: creativeMediaMap.size,
    dpaSkipped,
    uniqueVideoIds: videoIdToCreativeIds.size,
  });

  // ── Step 3: Fetch Meta video details (parallel, non-blocking) ────────────

  const videoDetails = new Map<string, MetaVideoDetail>();
  const videoFetchResults = await Promise.allSettled(
    Array.from(videoIdToCreativeIds.keys()).map(async (videoId) => {
      const detail = await fetchMetaVideoDetail(videoId, loaded.accessToken);
      if (detail) videoDetails.set(videoId, detail);
    })
  );

  const videoFetchFailed = videoFetchResults.filter(
    (r) => r.status === "rejected"
  ).length;

  log("video:fetch-summary", {
    requested: videoIdToCreativeIds.size,
    resolved: videoDetails.size,
    failed: videoFetchFailed,
  });

  // ── Step 4 + 5: Upload to Stream + R2 (per unique video) ─────────────────

  const streamResults = new Map<
    string,
    { uid: string; playbackUrl: string } | null
  >();
  const thumbnailR2Urls = new Map<string, string | null>();

  let streamUploaded = 0;
  let streamFailed = 0;
  let thumbUploaded = 0;
  let thumbFailed = 0;

  await Promise.allSettled(
    Array.from(videoDetails.entries()).map(async ([videoId, detail]) => {
      // Step 4 — Stream upload
      if (detail.source) {
        const result = await uploadToStream(
          detail.source,
          detail.title ?? videoId,
          videoId
        );
        streamResults.set(videoId, result);
        if (result) streamUploaded++;
        else streamFailed++;
      } else {
        log("stream:no-source", { videoId });
        streamFailed++;
      }

      // Step 5 — R2 thumbnail upload
      const thumbSrc = detail.picture;
      if (thumbSrc) {
        const key = `meta-creatives/thumbnails/${videoId}.jpg`;
        const r2Url = await uploadUrlToR2(thumbSrc, key, "image/jpeg");
        thumbnailR2Urls.set(videoId, r2Url);
        if (r2Url) thumbUploaded++;
        else thumbFailed++;
      }
    })
  );

  log("upload:summary", {
    streamUploaded,
    streamFailed,
    thumbUploaded,
    thumbFailed,
  });

  // ── Step 5b: R2 upload for image-only creatives ───────────────────────────

  const imageR2Urls = new Map<string, string | null>();
  let imgUploaded = 0;
  let imgFailed = 0;

  await Promise.allSettled(
    Array.from(creativeMediaMap.entries())
      .filter(([, m]) => !m.videoId && m.imageUrl)
      .map(async ([creativeId, m]) => {
        const imageHash = m.imageHash ?? creativeId;
        const key = `meta-creatives/images/${imageHash}.jpg`;
        const r2Url = await uploadUrlToR2(m.imageUrl!, key, "image/jpeg");
        imageR2Urls.set(creativeId, r2Url);
        if (r2Url) imgUploaded++;
        else imgFailed++;
      })
  );

  log("image:summary", { imgUploaded, imgFailed });

  // ── Step 6: Upsert MetaCreative rows ─────────────────────────────────────

  let upserted = 0;
  let upsertFailed = 0;

  for (const c of creatives) {
    const media = creativeMediaMap.get(c.id);
    if (!media) continue; // DPA — skip

    const videoId = media.videoId;
    const streamResult = videoId ? streamResults.get(videoId) : undefined;
    const thumbUrl = videoId
      ? (thumbnailR2Urls.get(videoId) ?? c.thumbnail_url ?? null)
      : null;
    const imgUrl = imageR2Urls.get(c.id) ?? media.imageUrl ?? null;

    try {
      await prisma.metaCreative.upsert({
        where: {
          metaIntegrationId_metaCreativeId: {
            metaIntegrationId: loaded.integrationId,
            metaCreativeId: c.id,
          },
        },
        create: {
          metaIntegrationId: loaded.integrationId,
          metaCreativeId: c.id,
          // Media fields
          imageHash: media.imageHash ?? null,
          imageUrl: imgUrl,
          videoId: videoId,
          videoStreamId: streamResult?.uid ?? null,
          videoUrl: streamResult?.playbackUrl ?? null,
          thumbnailUrl: thumbUrl,
          // Required fields — filled later by your AI pipeline
          headline: "",
          primaryText: "",
          ctaType: "LEARN_MORE",
          landingUrl: "",
        },
        update: {
          // Only update media — never overwrite AI-generated copy
          imageHash: media.imageHash ?? undefined,
          imageUrl: imgUrl ?? undefined,
          videoId: videoId ?? undefined,
          videoStreamId: streamResult?.uid ?? undefined,
          videoUrl: streamResult?.playbackUrl ?? undefined,
          thumbnailUrl: thumbUrl ?? undefined,
        },
      });

      log("upsert:ok", {
        creativeId: c.id,
        videoId,
        streamUid: streamResult?.uid ?? null,
        hasThumb: Boolean(thumbUrl),
        hasImage: Boolean(imgUrl),
      });

      upserted++;
    } catch (e) {
      log("upsert:failed", { creativeId: c.id, error: (e as any)?.message });
      upsertFailed++;
    }
  }

  log("done", { upserted, upsertFailed, hasMore: Boolean(nextAfter) });

  return NextResponse.json({
    ok: true,
    hasMore: Boolean(nextAfter && creatives.length > 0),
    nextAfter,
    creatives: {
      total: creatives.length,
      upserted,
      failed: upsertFailed,
      dpaSkipped,
    },
    videos: {
      found: videoIdToCreativeIds.size,
      streamUploaded,
      streamFailed,
    },
    thumbnails: {
      r2Uploaded: thumbUploaded,
      r2Failed: thumbFailed,
    },
    images: {
      found: imgUploaded + imgFailed,
      r2Uploaded: imgUploaded,
      r2Failed: imgFailed,
    },
  });
}