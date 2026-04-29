import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  extractHeygenDownloadUrl,
  extractHeygenSessionId,
  extractHeygenStatus,
  extractHeygenThumbnailUrl,
  extractHeygenVideoId,
  heygenFetchJson,
  requireCompanySession,
} from "@/lib/heygen/api";

export const runtime = "nodejs";
export const maxDuration = 60;

type VideoGenerationJobRow = {
  id: string;
  heygenStatus: string;
  progressMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  assetId: string | null;
  heygenVideoId: string | null;
  streamUid: string | null;
  downloadUrl: string | null;
  playbackUrl: string | null;
  thumbnailUrl: string | null;
  metadata: unknown;
};

type VideoGenerationJobDelegate = {
  findFirst(args: unknown): Promise<VideoGenerationJobRow | null>;
  update(args: unknown): Promise<unknown>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function sessionIdFromJob(job: VideoGenerationJobRow): string | null {
  const meta = asRecord(job.metadata);
  const direct = meta?.heygen_session_id;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  return extractHeygenSessionId(job.metadata);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const session = await requireCompanySession();
    const { jobId } = await params;

    const jobs = (prisma as unknown as { videoGenerationJob: VideoGenerationJobDelegate }).videoGenerationJob;
    const job = await jobs.findFirst({
      where: { id: jobId, companyId: session.companyId },
    });

    if (!job) {
      return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
    }

    const origin = new URL(request.url).origin;

    // Poll HeyGen to refresh status when we don't have an Asset yet.
    // Video Agent flow:
    // - poll /v3/video-agents/{session_id} until it gives video_id
    // - then poll /v3/videos/{video_id} for final status and video_url
    if (!job.assetId) {
      let videoId: string | null = job.heygenVideoId ?? null;

      const sessId = sessionIdFromJob(job);
      if (!videoId && sessId) {
        const sessPayload = await heygenFetchJson<unknown>(
          `/v3/video-agents/${encodeURIComponent(sessId)}`,
          { method: "GET" },
        );
        videoId = extractHeygenVideoId(sessPayload);
        const sessStatus = extractHeygenStatus(sessPayload);
        await jobs.update({
          where: { id: job.id },
          data: {
            heygenVideoId: videoId,
            heygenStatus: sessStatus ?? job.heygenStatus,
            progressMessage: videoId
              ? "HeyGen assigned a video_id. Tracking video rendering."
              : "HeyGen is generating. Waiting for video_id assignment.",
          },
        });
      }

      if (videoId) {
        const videoPayload = await heygenFetchJson<unknown>(
          `/v3/videos/${encodeURIComponent(videoId)}`,
          { method: "GET" },
        );
        const videoStatus = extractHeygenStatus(videoPayload);
        const videoUrl = extractHeygenDownloadUrl(videoPayload);
        const thumb = extractHeygenThumbnailUrl(videoPayload);

        await jobs.update({
          where: { id: job.id },
          data: {
            heygenStatus: videoStatus ?? job.heygenStatus,
            progressMessage:
              videoStatus === "completed"
                ? "HeyGen finished rendering. Waiting for delivery."
                : videoStatus === "failed"
                  ? "HeyGen reported a failure."
                  : "HeyGen is still rendering the video.",
            downloadUrl: videoUrl ?? job.downloadUrl,
            thumbnailUrl: thumb ?? job.thumbnailUrl,
          },
        });
      }
    }

    let asset: null | {
      id: string;
      title: string;
      filename: string;
      thumbnailUrl: string | null;
      playbackUrl: string | null;
      downloadUrl: string;
      assetPageUrl: string;
    } = null;

    if (typeof job.assetId === "string" && job.assetId) {
      const assetRow = await prisma.asset.findFirst({
        where: { id: job.assetId, companyId: session.companyId },
        select: {
          id: true,
          title: true,
          filename: true,
          thumbnailUrl: true,
          playbackUrl: true,
        },
      });

      if (assetRow) {
        asset = {
          id: assetRow.id,
          title: assetRow.title,
          filename: assetRow.filename,
          thumbnailUrl: assetRow.thumbnailUrl ?? null,
          playbackUrl: assetRow.playbackUrl ?? job.playbackUrl ?? null,
          downloadUrl: `${origin}/api/assets/${assetRow.id}/download`,
          assetPageUrl: `${origin}/ingestion/asset/${assetRow.id}/description`,
        };
      }
    }

    return NextResponse.json({
      ok: true,
      job: {
        id: job.id,
        heygenStatus: job.heygenStatus,
        progressMessage: job.progressMessage,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        assetId: job.assetId,
        heygenVideoId: job.heygenVideoId,
        streamUid: job.streamUid,
        downloadUrl: job.downloadUrl,
        playbackUrl: job.playbackUrl,
        thumbnailUrl: job.thumbnailUrl,
      },
      asset,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load job status";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

