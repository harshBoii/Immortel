import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCallsSession } from "@/lib/calls/session";
import { getPreviousChatContext } from "@/lib/calling-agent/previousChatContext";

type RouteContext = { params: Promise<{ id: string }> };

const CALLING_AGENT_BASE = "https://calling-agent-ki3j.onrender.com";

/**
 * Retry a previously attempted call. Uses the original call's `Lead` for phone/name
 * and re-invokes the calling-agent with a minimal payload. Creates a new `Call` row
 * queued against the same `(leadId, campaignId)` pair.
 */
export async function POST(_request: Request, ctx: RouteContext) {
  const session = await getCallsSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const source = await prisma.call.findFirst({
    where: { id, companyId: session.companyId },
    include: {
      lead: true,
      company: { select: { name: true } },
    },
  });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!source.lead) {
    return NextResponse.json(
      { error: "Cannot retry: original call has no linked Lead" },
      { status: 400 }
    );
  }

  const payload: Record<string, unknown> = {
    to: source.lead.phone,
    language: "English",
    deepgram_language: "en",
    elevenlabs_model: "eleven_multilingual_v2",
    name: source.lead.name,
    company: source.company?.name ?? "",
    product: "",
    perks_of_product: "—",
    info_about_lead: source.lead.notes ?? "—",
    voiceId: "oO7sLA3dWfQXsKeSAjpA",
    llm_provider: "groq",
    companyId: session.companyId,
    leadId: source.lead.id,
    campaignId: source.campaignId,
  };

  const previousChatContext = await getPreviousChatContext(session.companyId, source.lead.id);
  if (previousChatContext) payload.previousChatContext = previousChatContext;

  let externalCallId: string | null = null;
  let ok = false;
  let upstreamStatus = 0;

  try {
    const res = await fetch(`${CALLING_AGENT_BASE}/call/outbound`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    upstreamStatus = res.status;
    ok = res.ok;
    const data = await res.json().catch(() => null);
    if (data && typeof data === "object") {
      const d = data as Record<string, unknown>;
      const candidate = d.call_id ?? d.callId ?? d.id;
      if (typeof candidate === "string" && candidate.trim()) externalCallId = candidate.trim();
    }
  } catch {
    ok = false;
  }

  const newCall = await prisma.call.create({
    data: {
      companyId: session.companyId,
      leadId: source.lead.id,
      campaignId: source.campaignId,
      direction: "OUTBOUND",
      status: ok ? "QUEUED" : "FAILED",
      externalCallId,
      failureReason: ok ? null : `Retry failed (HTTP ${upstreamStatus || "network"})`,
      metadata: { retryOf: source.id, upstreamStatus },
    },
  });

  return NextResponse.json({ success: ok, call: newCall }, { status: ok ? 200 : 502 });
}
