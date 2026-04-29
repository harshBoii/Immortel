import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  getMetaBucket,
  pollStreamReady,
  streamMp4PlaybackUrl,
  streamToCloudflareStream,
  streamToR2,
} from "@/lib/cloudfare";
import {
  extractHeygenDownloadUrl,
  extractHeygenStatus,
  extractHeygenThumbnailUrl,
  extractHeygenCallbackId,
  extractHeygenVideoId,
  extractHeygenSessionId,
  heygenAssetKey,
  heygenFetchJson,
} from "@/lib/heygen/api";

export const runtime = "nodejs";
export const maxDuration = 300;

type VideoGenerationJobRow = {
  id: string;
  companyId: string;
  script: string;
  assetId: string | null;
};

type VideoGenerationJobDelegate = {
  findFirst(args: unknown): Promise<VideoGenerationJobRow | null>;
  update(args: unknown): Promise<unknown>;
  updateMany(args: unknown): Promise<unknown>;
};

function toInputJson(value: unknown): Prisma.InputJsonValue | null {
  try {
    if (value === undefined) return null;
    return JSON.parse(
      JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v)),
    ) as Prisma.InputJsonValue;
  } catch {
    return null;
  }
}

function assetTitleFromScript(script: string) {
  const oneLine = script.replace(/\s+/g, " ").trim();
  const short = oneLine.slice(0, 60).trim();
  return short ? `HeyGen ad - ${short}` : "HeyGen ad";
}

function assetFilenameFromJob(jobId: string) {
  return `heygen-${jobId}.mp4`;
}

function respond(body: unknown, init?: { status?: number }) {
  const status = init?.status ?? 200;
  console.log("[heygen/webhook] respond", { status, body });
  return NextResponse.json(body, { status });
}

async function resolveHeygenVideoDetails(videoId: string) {
  return heygenFetchJson<unknown>(`/v3/videos/${encodeURIComponent(videoId)}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request) {
  const jobs = (prisma as unknown as { videoGenerationJob: VideoGenerationJobDelegate })
    .videoGenerationJob;
  let payload: unknown = null;

  try {
    payload = await request.json().catch(() => ({}));
    const callbackId = extractHeygenCallbackId(payload);
    const sessionId = extractHeygenSessionId(payload);
    const heygenVideoId = extractHeygenVideoId(payload);
    const incomingStatus = extractHeygenStatus(payload);

    console.log("[heygen/webhook] request", {
      callbackId,
      sessionId,
      videoId: heygenVideoId,
      status: incomingStatus,
      payload,
    });

    const job =
      (callbackId ? await jobs.findFirst({ where: { id: callbackId } }) : null) ??
      (heygenVideoId ? await jobs.findFirst({ where: { heygenVideoId } }) : null);

    if (!job) {
      // Don't ask HeyGen to retry if we can't correlate yet.
      return respond({ ok: true, ignored: true });
    }

    if (job.assetId) {
      await jobs.update({
        where: { id: job.id },
        data: {
          heygenStatus: "completed",
          progressMessage: "Video already delivered.",
        },
      });
      return respond({ ok: true, idempotent: true });
    }

    const status = incomingStatus ?? "processing";

    if (["failed", "error"].includes(status)) {
      await jobs.update({
        where: { id: job.id },
        data: {
          heygenStatus: "failed",
          heygenError:
            typeof (payload as { error?: string })?.error === "string"
              ? (payload as { error?: string }).error
              : "HeyGen reported that the video failed.",
          progressMessage: "HeyGen failed to generate the video.",
          metadata: payload ?? {},
        },
      });
      return respond({ ok: true });
    }

    if (!["completed", "complete", "ready", "success", "succeeded"].includes(status)) {
      await jobs.update({
        where: { id: job.id },
        data: {
          heygenStatus: "processing",
          progressMessage: "HeyGen is still rendering the video.",
          metadata: payload ?? {},
        },
      });
      return respond({ ok: true });
    }

    // Video Agent can call back before a video_id is attached. In that case we just record progress.
    if (!heygenVideoId) {
      await jobs.update({
        where: { id: job.id },
        data: {
          heygenStatus: "processing",
          progressMessage: "HeyGen completed callback but video_id is not available yet.",
          metadata: payload ?? {},
        },
      });
      return respond({ ok: true });
    }

    const details = await resolveHeygenVideoDetails(heygenVideoId).catch(() => null);
    const downloadUrl =
      extractHeygenDownloadUrl(payload) ??
      extractHeygenDownloadUrl(details) ??
      null;
    const thumbnailUrl =
      extractHeygenThumbnailUrl(payload) ??
      extractHeygenThumbnailUrl(details) ??
      null;

    if (!downloadUrl) {
      await jobs.update({
        where: { id: job.id },
        data: {
          heygenStatus: "webhook_error",
          heygenError: "HeyGen completed the video but did not provide a download URL.",
          progressMessage: "Waiting for a valid HeyGen download URL.",
          metadata: { payload, details },
        },
      });
      return respond({ ok: true });
    }

    const download = await fetch(downloadUrl, { cache: "no-store" });
    if (!download.ok || !download.body) {
      throw new Error(`Failed to download HeyGen video: HTTP ${download.status}`);
    }

    const contentType = download.headers.get("content-type") || "video/mp4";
    const contentLengthHeader = download.headers.get("content-length");
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : 0;
    const buffer = Buffer.from(await download.arrayBuffer());

    const bucket = getMetaBucket();
    if (!bucket) {
      throw new Error("R2_META_BUCKET or R2_BUCKET_NAME must be set");
    }

    const r2Key = heygenAssetKey(job.companyId, job.id);
    await streamToR2({
      body: buffer,
      key: r2Key,
      contentType,
      bucket,
    });

    const streamUpload = await streamToCloudflareStream({
      body: new Blob([buffer], { type: contentType }),
      filename: assetFilenameFromJob(job.id),
      metadata: {
        source: "heygen_ad",
        companyId: job.companyId,
        jobId: job.id,
        heygenVideoId,
      },
    });

    await pollStreamReady(streamUpload.uid, {
      maxAttempts: 20,
      delayMs: 2000,
    });

    const playbackUrl = streamMp4PlaybackUrl(streamUpload.uid);

    const heygenMeta = toInputJson({ payload, details });

    const asset = await prisma.asset.create({
      data: {
        companyId: job.companyId,
        assetType: "VIDEO",
        title: assetTitleFromScript(job.script),
        filename: assetFilenameFromJob(job.id),
        originalSize: BigInt(Number.isFinite(contentLength) ? Math.max(0, contentLength) : 0),
        status: "READY",
        r2Key,
        r2Bucket: bucket,
        mimeType: contentType,
        streamId: streamUpload.uid,
        playbackUrl,
        thumbnailUrl: thumbnailUrl ?? streamUpload.thumbnail ?? null,
        intelligenceStatus: "PENDING",
        metadata: {
          source: "heygen_ad",
          heygenVideoId,
          videoGenerationJobId: job.id,
          heygen: heygenMeta,
        },
        uploadSource: "NATIVE",
      },
      select: { id: true },
    });

    await jobs.update({
      where: { id: job.id },
      data: {
        assetId: asset.id,
        streamUid: streamUpload.uid,
        r2Key,
        downloadUrl,
        playbackUrl,
        thumbnailUrl: thumbnailUrl ?? streamUpload.thumbnail ?? null,
        heygenStatus: "completed",
        progressMessage: "Video delivered and stored successfully.",
        metadata: toInputJson({ payload, details }),
      },
    });

    return respond({ ok: true, assetId: asset.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    const heygenVideoId = extractHeygenVideoId(payload);

    if (heygenVideoId) {
      await jobs.updateMany({
        where: { heygenVideoId },
        data: {
          heygenStatus: "storage_error",
          heygenError: message,
          progressMessage: "Storage failed after HeyGen completed the video.",
        },
      });
    }

    return respond({ ok: false, error: message }, { status: 500 });
  }
}

