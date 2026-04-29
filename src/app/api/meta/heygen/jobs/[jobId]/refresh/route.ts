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

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function sessionIdFromMetadata(metadata: unknown): string | null {
  const meta = asRecord(metadata);
  const direct = meta?.heygen_session_id;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  return extractHeygenSessionId(metadata);
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const session = await requireCompanySession();
    const { jobId } = await params;

    const jobs = (prisma as any).videoGenerationJob;
    const job = await jobs.findFirst({
      where: { id: jobId, companyId: session.companyId },
    });
    if (!job) {
      return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
    }

    // Ensure we have a video_id (if Video Agent, derive from session_id first).
    let videoId: string | null = typeof job.heygenVideoId === "string" ? job.heygenVideoId : null;
    if (!videoId) {
      const sessId = sessionIdFromMetadata(job.metadata);
      if (sessId) {
        const sessPayload = await heygenFetchJson<unknown>(
          `/v3/video-agents/${encodeURIComponent(sessId)}`,
          { method: "GET" },
        );
        videoId = extractHeygenVideoId(sessPayload);
        if (videoId) {
          await jobs.update({
            where: { id: job.id },
            data: { heygenVideoId: videoId },
          });
        }
      }
    }

    if (!videoId) {
      return NextResponse.json(
        { ok: false, error: "No video_id available for this job yet" },
        { status: 409 },
      );
    }

    const videoPayload = await heygenFetchJson<unknown>(`/v3/videos/${encodeURIComponent(videoId)}`, {
      method: "GET",
    });

    const status = extractHeygenStatus(videoPayload) ?? job.heygenStatus;
    const downloadUrl = extractHeygenDownloadUrl(videoPayload) ?? job.downloadUrl;
    const thumbnailUrl = extractHeygenThumbnailUrl(videoPayload) ?? job.thumbnailUrl;

    await jobs.update({
      where: { id: job.id },
      data: {
        heygenStatus: status,
        progressMessage:
          status === "completed"
            ? "HeyGen video is completed."
            : status === "failed"
              ? "HeyGen video failed."
              : "HeyGen video is still processing.",
        downloadUrl,
        thumbnailUrl,
      },
    });

    return NextResponse.json({
      ok: true,
      videoId,
      status,
      downloadUrl,
      thumbnailUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to refresh job status";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

