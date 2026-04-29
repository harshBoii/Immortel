import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveCompanyByPassword } from "@/lib/mcp/companyPasswordAuth";
import {
  extractHeygenDownloadUrl,
  extractHeygenStatus,
  extractHeygenThumbnailUrl,
  HeygenApiError,
  heygenFetchJson,
} from "@/lib/heygen/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({
  password: z.string().min(1, "`password` is required"),
  email: z.string().optional(),
  companyName: z.string().optional(),
  userName: z.string().optional(),
  videoId: z.string().trim().min(1, "`videoId` is required").max(255),
});

type VideoGenerationJobDelegate = {
  findFirst(args: unknown): Promise<{ id: string; downloadUrl: string | null; thumbnailUrl: string | null } | null>;
  update(args: unknown): Promise<unknown>;
};

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { password, email, companyName, userName, videoId } = parsed.data;

  const company = await resolveCompanyByPassword(password, { email, companyName, userName });
  if (!company) {
    return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
  }

  try {
    const payload = await heygenFetchJson<unknown>(`/v3/videos/${encodeURIComponent(videoId)}`, {
      method: "GET",
    });

    const status = extractHeygenStatus(payload) ?? "unknown";
    const videoUrl = extractHeygenDownloadUrl(payload);
    const thumbnailUrl = extractHeygenThumbnailUrl(payload);

    // Best-effort: keep our job row in sync if it exists for this company.
    const jobs = (prisma as unknown as { videoGenerationJob: VideoGenerationJobDelegate }).videoGenerationJob;
    const row = await jobs.findFirst({
      where: { companyId: company.id, heygenVideoId: videoId },
      select: { id: true, downloadUrl: true, thumbnailUrl: true },
    });
    if (row) {
      await jobs.update({
        where: { id: row.id },
        data: {
          heygenStatus: status,
          downloadUrl: videoUrl ?? row.downloadUrl,
          thumbnailUrl: thumbnailUrl ?? row.thumbnailUrl,
          progressMessage:
            status === "completed"
              ? "HeyGen finished rendering. Waiting for delivery."
              : status === "failed"
                ? "HeyGen reported a failure."
                : "HeyGen is still rendering the video.",
        },
      });
    }

    return NextResponse.json({
      ok: true,
      videoId,
      status,
      videoUrl,
      thumbnailUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "HeyGen request failed";
    const details =
      error instanceof HeygenApiError
        ? { status: error.status, path: error.path, responseBody: error.responseBody }
        : undefined;
    return NextResponse.json({ ok: false, error: message, details }, { status: 502 });
  }
}

