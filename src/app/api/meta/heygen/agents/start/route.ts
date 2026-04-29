import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  extractHeygenSessionId,
  HeygenApiError,
  heygenFetchJson,
  requireAppUrl,
  requireCompanySession,
} from "@/lib/heygen/api";

export const runtime = "nodejs";
export const maxDuration = 120;

const startSchema = z.object({
  prompt: z.string().trim().min(1, "Prompt is required").max(10000, "Prompt is too long"),
});

type VideoGenerationJobDelegate = {
  create(args: unknown): Promise<{ id: string }>;
  update(args: unknown): Promise<unknown>;
};

function toPlainJson(value: unknown): Record<string, unknown> {
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

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

    const jobs = (prisma as unknown as { videoGenerationJob: VideoGenerationJobDelegate })
      .videoGenerationJob;
    const appUrl = requireAppUrl();

    // Reuse the existing job table; no avatar/voice selection for this mode.
    const job = await jobs.create({
      data: {
        companyId: session.companyId,
        script: parsed.data.prompt,
        avatarId: "auto",
        voiceId: "auto",
        customAvatarId: null,
        customVoiceId: null,
        heygenStatus: "queued",
        progressMessage: "Queued for HeyGen Video Agent generation.",
        metadata: {
          mode: "video_agent_simple",
        },
      },
      select: { id: true },
    });

    try {
      const heygenBody = {
        prompt: parsed.data.prompt,
        callback_url: `${appUrl}/api/meta/heygen/webhook`,
        callback_id: job.id,
      };

      console.log("[heygen/agents/start] POST /v3/video-agents body", {
        jobId: job.id,
        companyId: session.companyId,
        ...heygenBody,
        prompt_preview: parsed.data.prompt.slice(0, 140),
        prompt_length: parsed.data.prompt.length,
      });

      const payload = await heygenFetchJson<unknown>("/v3/video-agents", {
        method: "POST",
        body: JSON.stringify(heygenBody),
      });

      const sessionId = extractHeygenSessionId(payload);
      if (!sessionId) {
        throw new Error("HeyGen did not return a session_id");
      }

      await jobs.update({
        where: { id: job.id },
        data: {
          heygenStatus: "processing",
          progressMessage: "Video Agent session created. Waiting for video_id assignment.",
          metadata: {
            ...toPlainJson(payload),
            heygen_session_id: sessionId,
            mode: "video_agent_simple",
          },
        },
      });

      return NextResponse.json({ ok: true, jobId: job.id, sessionId });
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
          progressMessage: "HeyGen rejected the Video Agent request.",
        },
      });

      return NextResponse.json({ ok: false, error: message, details }, { status: 502 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start Video Agent";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

