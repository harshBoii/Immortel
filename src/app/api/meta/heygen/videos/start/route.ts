import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  extractHeygenVideoId,
  HeygenApiError,
  heygenFetchJson,
  requireAppUrl,
  requireCompanySession,
} from "@/lib/heygen/api";

export const runtime = "nodejs";
export const maxDuration = 120;

const startSchema = z.object({
  script: z.string().trim().min(1, "Script is required").max(10000, "Script is too long"),
  avatarId: z.string().trim().optional(),
  voiceId: z.string().trim().optional(),
  customAvatarId: z.string().trim().optional(),
  customVoiceId: z.string().trim().optional(),
});

function resolveSelectedId(primary?: string, custom?: string) {
  if (custom && custom.trim()) return custom.trim();
  if (primary && primary.trim()) return primary.trim();
  return "";
}

type VideoGenerationJobDelegate = {
  create(args: unknown): Promise<{ id: string }>;
  update(args: unknown): Promise<unknown>;
};

export async function POST(request: Request) {
  try {
    const session = await requireCompanySession();
    const body = await request.json().catch(() => ({}));
    const parsed = startSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const finalAvatarId = resolveSelectedId(
      parsed.data.avatarId,
      parsed.data.customAvatarId,
    );
    const finalVoiceId = resolveSelectedId(
      parsed.data.voiceId,
      parsed.data.customVoiceId,
    );

    if (!finalAvatarId || !finalVoiceId) {
      return NextResponse.json(
        { ok: false, error: "Avatar and voice are required" },
        { status: 400 },
      );
    }

    const jobs = (prisma as unknown as { videoGenerationJob: VideoGenerationJobDelegate })
      .videoGenerationJob;
    const appUrl = requireAppUrl();

    const job = await jobs.create({
      data: {
        companyId: session.companyId,
        script: parsed.data.script,
        avatarId: finalAvatarId,
        voiceId: finalVoiceId,
        customAvatarId: parsed.data.customAvatarId || null,
        customVoiceId: parsed.data.customVoiceId || null,
        heygenStatus: "queued",
        progressMessage: "Queued for HeyGen video creation.",
      },
      select: { id: true },
    });

    try {
      const payload = await heygenFetchJson<unknown>("/v3/videos", {
        method: "POST",
        body: JSON.stringify({
          type: "avatar",
          avatar_id: finalAvatarId,
          voice_id: finalVoiceId,
          script: parsed.data.script,
          callback_url: `${appUrl}/api/meta/heygen/webhook`,
        }),
      });

      const heygenVideoId = extractHeygenVideoId(payload);
      if (!heygenVideoId) {
        throw new Error("HeyGen did not return a video_id");
      }

      await jobs.update({
        where: { id: job.id },
        data: {
          heygenVideoId,
          heygenStatus: "processing",
          progressMessage: "HeyGen accepted the request and is generating the video.",
          metadata: payload ?? {},
        },
      });

      return NextResponse.json({ ok: true, jobId: job.id, heygenVideoId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "HeyGen request failed";
      const details =
        error instanceof HeygenApiError
          ? { status: error.status, path: error.path, responseBody: error.responseBody }
          : undefined;
      await jobs.update({
        where: { id: job.id },
        data: {
          heygenStatus: "failed",
          heygenError: message,
          progressMessage: "HeyGen rejected the request.",
        },
      });

      return NextResponse.json({ ok: false, error: message, details }, { status: 502 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start video generation";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

