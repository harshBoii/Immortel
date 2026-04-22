import { NextResponse } from "next/server";
import { Prisma, CampaignStatus, CampaignType, LeadStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCallsSession } from "@/lib/calls/session";

const CALLING_AGENT_BASE = "https://calling-agent-ki3j.onrender.com";
const DEFAULT_VOICE_ID = "oO7sLA3dWfQXsKeSAjpA";
const MAX_LEADS_PER_RUN = 500;

type RouteContext = { params: Promise<{ id: string }> };

type AudienceFilter = {
  stage?: string[];
  city?: string[];
  industry?: string[];
  source?: string[];
  tags?: string[];
  minIntentScore?: number;
  uncontactedOnly?: boolean;
};

type VoiceScript = {
  product?: string;
  perks_of_product?: string;
  info_about_lead?: string;
  system_prompt?: string;
  opening_greeting?: string;
  agent_name?: string;
  agent_role?: string;
  questions_to_ask?: string;
  language?: string;
  voiceId?: string;
  voiceMode?: "quality" | "speed" | "eleven_v3";
  llm_provider?: "gemini" | "openai" | "claude" | "groq" | "sarvam";
};

function mapElevenlabsModel(mode: VoiceScript["voiceMode"]) {
  if (mode === "speed") return "eleven_flash_v2_5";
  if (mode === "eleven_v3") return "eleven_v3";
  return "eleven_multilingual_v2";
}

export async function POST(_request: Request, ctx: RouteContext) {
  const session = await getCallsSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const campaign = await prisma.campaign.findFirst({
    where: { id, companyId: session.companyId },
    include: { company: { select: { name: true } } },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (campaign.type !== CampaignType.VOICE) {
    return NextResponse.json(
      {
        error: `Starting ${campaign.type} campaigns is not yet supported — voice only.`,
      },
      { status: 400 }
    );
  }

  if (
    campaign.status !== CampaignStatus.DRAFT &&
    campaign.status !== CampaignStatus.PAUSED
  ) {
    return NextResponse.json(
      { error: `Cannot start a campaign in status ${campaign.status}` },
      { status: 400 }
    );
  }

  const raw = (campaign.audience ?? {}) as Record<string, unknown>;
  const filter = (raw.filter ?? {}) as AudienceFilter;
  const script = (raw.script ?? {}) as VoiceScript;

  const leadWhere: Prisma.LeadWhereInput = {
    companyId: session.companyId,
    ...(filter.stage?.length && {
      stage: {
        in: filter.stage.filter((s): s is LeadStage =>
          Object.values(LeadStage).includes(s as LeadStage)
        ),
      },
    }),
    ...(filter.city?.length && { city: { in: filter.city } }),
    ...(filter.industry?.length && { industry: { in: filter.industry } }),
    ...(filter.source?.length && { source: { in: filter.source } }),
    ...(filter.tags?.length && { tags: { hasSome: filter.tags } }),
    ...(typeof filter.minIntentScore === "number" && {
      intentScore: { gte: filter.minIntentScore },
    }),
    ...(filter.uncontactedOnly && { lastContactAt: null }),
  };

  const leads = await prisma.lead.findMany({
    where: leadWhere,
    orderBy: [{ intentScore: "desc" }, { createdAt: "asc" }],
    take: MAX_LEADS_PER_RUN,
  });

  if (leads.length === 0) {
    return NextResponse.json(
      { error: "No leads matched this campaign's audience filter." },
      { status: 400 }
    );
  }

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: CampaignStatus.RUNNING, startedAt: new Date() },
  });

  const language = script.language ?? "English";
  const deepgram = language === "Hindi" ? "hi" : "en";
  const voiceId = script.voiceId || DEFAULT_VOICE_ID;
  const elevenlabs_model = mapElevenlabsModel(script.voiceMode);

  let triggered = 0;
  let failed = 0;

  // Sequential dispatch keeps the upstream service from being hammered. For
  // larger runs the right move is to enqueue on Qstash or a worker; this is
  // MVP.
  for (const lead of leads) {
    const payload: Record<string, unknown> = {
      to: lead.phone,
      language,
      deepgram_language: deepgram,
      elevenlabs_model,
      name: lead.name,
      company: campaign.company?.name ?? "",
      product: script.product ?? campaign.name,
      perks_of_product: script.perks_of_product ?? "—",
      info_about_lead: script.info_about_lead ?? lead.notes ?? "—",
      voiceId,
      llm_provider: script.llm_provider ?? "groq",
      ...(script.system_prompt && { system_prompt: script.system_prompt }),
      ...(script.opening_greeting && { opening_greeting: script.opening_greeting }),
      ...(script.agent_name && { agent_name: script.agent_name }),
      ...(script.agent_role && { agent_role: script.agent_role }),
      ...(script.questions_to_ask && { questions_to_ask: script.questions_to_ask }),
      companyId: session.companyId,
      leadId: lead.id,
      campaignId: campaign.id,
    };

    let ok = false;
    let externalCallId: string | null = null;
    let upstreamStatus = 0;

    try {
      const res = await fetch(`${CALLING_AGENT_BASE}/call/outbound`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      ok = res.ok;
      upstreamStatus = res.status;
      const data = await res.json().catch(() => null);
      if (data && typeof data === "object") {
        const d = data as Record<string, unknown>;
        const candidate = d.call_id ?? d.callId ?? d.id;
        if (typeof candidate === "string" && candidate.trim())
          externalCallId = candidate.trim();
      }
    } catch {
      ok = false;
    }

    try {
      await prisma.call.create({
        data: {
          companyId: session.companyId,
          leadId: lead.id,
          campaignId: campaign.id,
          direction: "OUTBOUND",
          status: ok ? "QUEUED" : "FAILED",
          externalCallId,
          failureReason: ok ? null : `Upstream HTTP ${upstreamStatus || "network error"}`,
          metadata: { campaignRun: true },
        },
      });
      await prisma.campaignMessage.upsert({
        where: { campaignId_leadId: { campaignId: campaign.id, leadId: lead.id } },
        create: {
          campaignId: campaign.id,
          leadId: lead.id,
          channel: "VOICE",
          status: ok ? "SENT" : "FAILED",
          sentAt: ok ? new Date() : null,
        },
        update: {
          status: ok ? "SENT" : "FAILED",
          sentAt: ok ? new Date() : undefined,
        },
      });
    } catch (err) {
      console.error("campaigns/start: persist failed", err);
    }

    if (ok) triggered++;
    else failed++;
  }

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { sentCount: { increment: triggered } },
  });

  return NextResponse.json({
    success: true,
    triggered,
    failed,
    total: leads.length,
    campaignId: campaign.id,
  });
}
