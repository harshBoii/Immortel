import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompanySession } from "@/lib/heygen/api";

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
};

type VideoGenerationJobDelegate = {
  findFirst(args: unknown): Promise<VideoGenerationJobRow | null>;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const session = await requireCompanySession();
    const { jobId } = await params;

    const jobs = (prisma as unknown as { videoGenerationJob: VideoGenerationJobDelegate })
      .videoGenerationJob;
    const job = await jobs.findFirst({
      where: { id: jobId, companyId: session.companyId },
    });

    if (!job) {
      return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
    }

    const origin = new URL(request.url).origin;

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

