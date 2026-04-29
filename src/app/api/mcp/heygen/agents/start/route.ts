import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveCompanyByPassword } from "@/lib/mcp/companyPasswordAuth";
import {
  extractHeygenSessionId,
  extractHeygenVideoId,
  HeygenApiError,
  heygenFetchJson,
  requireAppUrl,
} from "@/lib/heygen/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const schema = z.object({
  password: z.string().min(1, "`password` is required"),
  email: z.string().optional(),
  companyName: z.string().optional(),
  userName: z.string().optional(),
  prompt: z.string().trim().min(1, "`prompt` is required").max(10000, "Prompt is too long"),
  timeoutMs: z.number().int().min(5_000).max(120_000).optional(),
  pollEveryMs: z.number().int().min(500).max(5_000).optional(),
});

type VideoGenerationJobDelegate = {
  create(args: unknown): Promise<{ id: string }>;
  update(args: unknown): Promise<unknown>;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function toPlainJson(value: unknown): Record<string, unknown> {
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

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

  const { password, email, companyName, userName, prompt } = parsed.data;
  const timeoutMs = parsed.data.timeoutMs ?? 90_000;
  const pollEveryMs = parsed.data.pollEveryMs ?? 2_000;

  const company = await resolveCompanyByPassword(password, { email, companyName, userName });
  if (!company) {
    return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
  }

  const jobs = (prisma as unknown as { videoGenerationJob: VideoGenerationJobDelegate }).videoGenerationJob;
  const appUrl = requireAppUrl();

  const job = await jobs.create({
    data: {
      companyId: company.id,
      createdByUserId: null,
      script: prompt,
      avatarId: "auto",
      voiceId: "auto",
      customAvatarId: null,
      customVoiceId: null,
      heygenStatus: "queued",
      progressMessage: "Queued for HeyGen Video Agent generation (MCP).",
      metadata: { mode: "video_agent_simple_mcp" },
    },
    select: { id: true },
  });

  try {
    const heygenBody = {
      prompt,
      callback_url: `${appUrl}/api/meta/heygen/webhook`,
      callback_id: job.id,
    };

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
        progressMessage: "Video Agent session created. Polling for video_id assignment.",
        metadata: {
          ...toPlainJson(payload),
          heygen_session_id: sessionId,
          mode: "video_agent_simple_mcp",
        },
      },
    });

    const startedAt = Date.now();
    let heygenVideoId: string | null = null;
    let lastSessionPayload: unknown = null;

    while (Date.now() - startedAt < timeoutMs) {
      const sessPayload = await heygenFetchJson<unknown>(
        `/v3/video-agents/${encodeURIComponent(sessionId)}`,
        { method: "GET" },
      );
      lastSessionPayload = sessPayload;
      heygenVideoId = extractHeygenVideoId(sessPayload);
      if (heygenVideoId) break;
      await sleep(pollEveryMs);
    }

    if (!heygenVideoId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Timed out waiting for HeyGen to assign video_id. Poll using session_id or webhook later.",
          jobId: job.id,
          sessionId,
        },
        { status: 202 },
      );
    }

    await jobs.update({
      where: { id: job.id },
      data: {
        heygenVideoId,
        progressMessage: "HeyGen assigned a video_id. Video is rendering.",
        metadata: {
          ...toPlainJson(lastSessionPayload),
          heygen_session_id: sessionId,
          mode: "video_agent_simple_mcp",
        },
      },
    });

    return NextResponse.json({ ok: true, jobId: job.id, sessionId, heygenVideoId });
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
}

