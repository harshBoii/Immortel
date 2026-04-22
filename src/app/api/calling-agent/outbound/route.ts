import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CallDirection, CallStatus } from "@prisma/client";

const CALLING_AGENT_BASE = "https://calling-agent-ki3j.onrender.com";
const DEFAULT_VOICE_ID = "oO7sLA3dWfQXsKeSAjpA";

function extractExternalCallId(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const candidates = [
    d.call_id,
    d.callId,
    d.external_call_id,
    d.externalCallId,
    d.id,
    d.sid,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

type VoiceMode = "quality" | "speed" | "eleven_v3";
type LlmProvider = "gemini" | "openai" | "claude" | "groq" | "sarvam";
type SarvamSpeaker = "rohan" | "dev" | "sunny";

const LLM_PROVIDERS: LlmProvider[] = [
  "gemini",
  "openai",
  "claude",
  "groq",
  "sarvam",
];

/** Slugs aligned with call-center page `LANGUAGE_OPTIONS` */
const LANGUAGE_SLUGS = [
  "english",
  "hindi",
  "marathi",
  "kannada",
  "telugu",
  "tamil",
  "malayalam",
  "punjabi",
  "bengali",
  "gujarati",
  "odia",
] as const;

type LanguageSlug = (typeof LANGUAGE_SLUGS)[number];

const LANGUAGE_BY_SLUG: Record<
  LanguageSlug,
  { language: string; deepgram_language: string }
> = {
  english: { language: "English", deepgram_language: "en" },
  hindi: { language: "Hindi", deepgram_language: "hi" },
  marathi: { language: "Marathi", deepgram_language: "mr" },
  kannada: { language: "Kannada", deepgram_language: "kn" },
  telugu: { language: "Telugu", deepgram_language: "te" },
  tamil: { language: "Tamil", deepgram_language: "ta" },
  malayalam: { language: "Malayalam", deepgram_language: "ml" },
  punjabi: { language: "Punjabi", deepgram_language: "pa" },
  bengali: { language: "Bengali", deepgram_language: "bn" },
  gujarati: { language: "Gujarati", deepgram_language: "gu" },
  odia: { language: "Odia", deepgram_language: "or" },
};

function normalizeLanguageSlug(raw: unknown): LanguageSlug {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return LANGUAGE_SLUGS.includes(s as LanguageSlug) ? (s as LanguageSlug) : "english";
}

function normalizeLlmProvider(raw: unknown): LlmProvider {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return LLM_PROVIDERS.includes(s as LlmProvider) ? (s as LlmProvider) : "groq";
}

function mapElevenlabsModel(mode: VoiceMode) {
  if (mode === "speed") return "eleven_flash_v2_5";
  if (mode === "eleven_v3") return "eleven_v3";
  return "eleven_multilingual_v2";
}

function optionalTrimmedString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t || undefined;
}

function optionalBoolean(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true") return true;
    if (s === "false") return false;
  }
  return undefined;
}

function normalizeSarvamSpeaker(raw: unknown): SarvamSpeaker | undefined {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (s === "rohan" || s === "dev" || s === "sunny") return s;
  return undefined;
}

export type OutboundForwardedPayload = {
  to: string;
  name: string;
  company: string;
  product: string;
  perks_of_product: string;
  info_about_lead: string;
  languageMode: LanguageSlug;
  voiceMode: VoiceMode;
  voiceId: string;
  llm_provider: LlmProvider;
  /** Same slug as the call-center page sends as `language` (e.g. english, hindi). */
  language: LanguageSlug;
  deepgram_language: string;
  /** Derived for ElevenLabs; included so the client sees the full outbound shape. */
  elevenlabs_model: string;
  use_sarvam_tts?: boolean;
  sarvam_speaker?: SarvamSpeaker;
  system_prompt?: string;
  opening_greeting?: string;
  agent_name?: string;
  agent_role?: string;
  questions_to_ask?: string;
};

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }
  const companyId = session.companyId;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const to = typeof body.to === "string" ? body.to.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const company = typeof body.company === "string" ? body.company.trim() : "";
  const product = typeof body.product === "string" ? body.product.trim() : "";
  const perks_of_product =
    typeof body.perks_of_product === "string" ? body.perks_of_product.trim() : "";
  const info_about_lead =
    typeof body.info_about_lead === "string" ? body.info_about_lead.trim() : "";
  const voiceIdRaw =
    typeof body.voiceId === "string" ? body.voiceId.trim() : "";

  const leadIdInput = typeof body.leadId === "string" ? body.leadId.trim() : "";
  const campaignIdInput =
    typeof body.campaignId === "string" ? body.campaignId.trim() : "";

  const productExternalIdInput =
    typeof body.productExternalId === "string"
      ? body.productExternalId.trim()
      : typeof body.product_id === "string"
        ? body.product_id.trim()
        : typeof body.productId === "string"
          ? body.productId.trim()
          : "";
  const productNameInput =
    typeof body.productName === "string"
      ? body.productName.trim()
      : typeof body.product_name === "string"
        ? body.product_name.trim()
        : "";

  // Tenant ownership checks — never trust IDs from the client until verified.
  let resolvedLeadId: string | null = null;
  if (leadIdInput) {
    const lead = await prisma.lead.findFirst({
      where: { id: leadIdInput, companyId: session.companyId },
      select: { id: true },
    });
    if (!lead) {
      return NextResponse.json(
        { success: false, error: "Lead not found or not accessible" },
        { status: 403 }
      );
    }
    resolvedLeadId = lead.id;
  }

  let resolvedCampaignId: string | null = null;
  if (campaignIdInput) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignIdInput, companyId: session.companyId },
      select: { id: true },
    });
    if (!campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found or not accessible" },
        { status: 403 }
      );
    }
    resolvedCampaignId = campaign.id;
  }

  const callConfig = (await (prisma as any).callConfig
    .findUnique({ where: { companyId } })
    .catch(() => null)) as
    | {
        languageMode?: string | null;
        voiceMode?: string | null;
        voiceId?: string | null;
        llmProvider?: string | null;
        agentName?: string | null;
        agentTone?: string | null;
        systemPrompt?: string | null;
        openingGreeting?: string | null;
        useSarvamTts?: boolean | null;
        sarvamSpeaker?: string | null;
      }
    | null;

  const languageMode = normalizeLanguageSlug(
    body.languageMode ?? body.language ?? callConfig?.languageMode
  );

  const voiceRaw = body.voiceMode ?? callConfig?.voiceMode;
  const voiceMode: VoiceMode =
    voiceRaw === "speed" || voiceRaw === "quality" || voiceRaw === "eleven_v3"
      ? voiceRaw
      : "speed";

  const llm_provider = normalizeLlmProvider(body.llm_provider ?? callConfig?.llmProvider);

  const mapped = LANGUAGE_BY_SLUG[languageMode];
  const clientDg = optionalTrimmedString(body.deepgram_language);
  const deepgram_language = clientDg ?? mapped.deepgram_language;
  const language = mapped.language;

  const system_prompt =
    optionalTrimmedString(body.system_prompt) ??
    optionalTrimmedString(callConfig?.systemPrompt);
  const opening_greeting =
    optionalTrimmedString(body.opening_greeting) ??
    optionalTrimmedString(callConfig?.openingGreeting);
  const agent_name =
    optionalTrimmedString(body.agent_name) ??
    optionalTrimmedString(callConfig?.agentName);
  const agent_role =
    optionalTrimmedString(body.agent_role) ??
    optionalTrimmedString(callConfig?.agentTone);
  const questions_to_ask = optionalTrimmedString(body.questions_to_ask);
  const questionsToAskList =
    Array.isArray((body as any).questionsToAsk) && (body as any).questionsToAsk.length > 0
      ? ((body as any).questionsToAsk as unknown[])
          .filter((x): x is string => typeof x === "string")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  const use_sarvam_tts =
    optionalBoolean(body.use_sarvam_tts) ??
    (typeof callConfig?.useSarvamTts === "boolean" ? callConfig.useSarvamTts : undefined) ??
    false;
  const sarvam_speaker = normalizeSarvamSpeaker(
    body.sarvam_speaker ?? callConfig?.sarvamSpeaker
  );

  const effectiveCompany =
    company ||
    (await prisma.company
      .findUnique({
        where: { id: session.companyId },
        select: { name: true },
      })
      .then((c) => c?.name?.trim())
      .catch(() => undefined)) ||
    "Your company";

  // Product context is optional. If not provided by the UI, we try to resolve it:
  // - from the Lead's saved productExternalId/productName
  // - from cached Shopify/WooCommerce product tables
  type ResolvedProduct = { title: string; description: string | null };
  async function resolveProductContext(args: {
    productExternalId?: string;
    productName?: string;
    leadId?: string | null;
  }): Promise<ResolvedProduct | null> {
    let externalId = (args.productExternalId ?? "").trim();
    let nameQuery = (args.productName ?? "").trim();

    if ((!externalId || !nameQuery) && args.leadId) {
      const lead = (await prisma.lead.findFirst({
        where: { id: args.leadId, companyId },
        // Note: these fields are added via a Prisma migration; cast keeps TS compiling
        // until the user runs prisma migrate+generate.
        select: { id: true } as unknown as { id: true; productExternalId: true; productName: true },
      })) as unknown as { productExternalId?: string | null; productName?: string | null } | null;
      if (!externalId) externalId = lead?.productExternalId ?? "";
      if (!nameQuery) nameQuery = lead?.productName ?? "";
    }

    // 1) Exact ID match
    if (externalId) {
      if (externalId.startsWith("gid://")) {
        const p = await prisma.shopifyProduct.findFirst({
          where: { companyId, shopifyGid: externalId },
          select: { title: true, description: true },
        });
        if (p) return { title: p.title, description: p.description ?? null };
      }
      if (/^\\d+$/.test(externalId)) {
        const wcId = parseInt(externalId, 10);
        const p = await prisma.wooCommerceProduct.findFirst({
          where: { companyId, wcProductId: wcId },
          select: { title: true, description: true },
        });
        if (p) return { title: p.title, description: p.description ?? null };
      }
    }

    // 2) Fuzzy name match (cached catalog)
    if (nameQuery) {
      const shopify = await prisma.shopifyProduct.findFirst({
        where: { companyId, title: { contains: nameQuery, mode: "insensitive" } },
        select: { title: true, description: true },
      });
      if (shopify) return { title: shopify.title, description: shopify.description ?? null };

      const woo = await prisma.wooCommerceProduct.findFirst({
        where: { companyId, title: { contains: nameQuery, mode: "insensitive" } },
        select: { title: true, description: true },
      });
      if (woo) return { title: woo.title, description: woo.description ?? null };
    }

    return null;
  }

  if (!to || !name) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing required fields: to, name",
      },
      { status: 400 }
    );
  }

  // If no leadId was provided but we can match by phone, auto-attach it.
  if (!resolvedLeadId) {
    const match = await prisma.lead.findFirst({
      where: { companyId: session.companyId, phone: to },
      select: { id: true },
    });
    if (match) resolvedLeadId = match.id;
  }

  const resolvedProduct =
    !product || !perks_of_product || productExternalIdInput || productNameInput
      ? await resolveProductContext({
          productExternalId: productExternalIdInput || undefined,
          productName: productNameInput || undefined,
          leadId: resolvedLeadId,
        })
      : null;

  const isPlaceholderProduct =
    !product ||
    product.trim().toLowerCase() === "our product" ||
    product.trim().toLowerCase() === "follow-up";

  const effectiveProduct = isPlaceholderProduct
    ? resolvedProduct?.title || "Outbound Call"
    : product;
  const effectivePerks =
    perks_of_product || resolvedProduct?.description || "—";

  async function resolveQuestionsToAsk(): Promise<string | undefined> {
    if (questionsToAskList.length > 0) return questionsToAskList.join("\n");
    if (questions_to_ask) return questions_to_ask;
    if (!resolvedLeadId) return undefined;

    const lead = (await prisma.lead.findFirst({
      where: { id: resolvedLeadId, companyId },
      // Cast: new fields exist after migration+generate.
      select: { id: true } as unknown as {
        id: true;
        questionsToAsk: true;
        questionPresetId: true;
      },
    })) as unknown as
      | { questionsToAsk?: string[]; questionPresetId?: string | null }
      | null;

    const leadOverride =
      Array.isArray(lead?.questionsToAsk) && lead!.questionsToAsk.length > 0
        ? lead!.questionsToAsk.filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim())
        : [];
    if (leadOverride.length > 0) return leadOverride.join("\n");

    const presetId = lead?.questionPresetId ?? null;
    if (presetId) {
      const preset = await (prisma as any).callQuestionPreset.findFirst({
        where: { id: presetId, companyId },
        select: { questions: true },
      });
      const qs = (preset?.questions ?? []).map((s) => s.trim()).filter(Boolean);
      if (qs.length > 0) return qs.join("\n");
    }

    const def = await (prisma as any).callQuestionPreset.findFirst({
      where: { companyId, isDefault: true },
      orderBy: { updatedAt: "desc" },
      select: { questions: true },
    });
    const qs = (def?.questions ?? []).map((s) => s.trim()).filter(Boolean);
    return qs.length > 0 ? qs.join("\n") : undefined;
  }

  const effectiveQuestionsToAsk = await resolveQuestionsToAsk();

  const voiceId = voiceIdRaw || callConfig?.voiceId || DEFAULT_VOICE_ID;

  const elevenlabs_model = mapElevenlabsModel(voiceMode);

  const payload: Record<string, unknown> = {
    to,
    language,
    deepgram_language,
    elevenlabs_model,
    name,
    company: effectiveCompany,
    product: effectiveProduct,
    perks_of_product: effectivePerks,
    info_about_lead: info_about_lead || "—",
    voiceId,
    llm_provider,
    // Tenancy / linking IDs echoed back on webhook events
    companyId: session.companyId,
    leadId: resolvedLeadId,
    campaignId: resolvedCampaignId,
  };

  payload.use_sarvam_tts = use_sarvam_tts;
  if (use_sarvam_tts && sarvam_speaker !== undefined) {
    payload.sarvam_speaker = sarvam_speaker;
  }

  if (system_prompt !== undefined) payload.system_prompt = system_prompt;
  if (opening_greeting !== undefined) payload.opening_greeting = opening_greeting;
  if (agent_name !== undefined) payload.agent_name = agent_name;
  if (agent_role !== undefined) payload.agent_role = agent_role;
  if (effectiveQuestionsToAsk !== undefined)
    payload.questions_to_ask = effectiveQuestionsToAsk;

  const responseFields: OutboundForwardedPayload = {
    to,
    name,
    company: effectiveCompany,
    product: effectiveProduct,
    perks_of_product: effectivePerks,
    info_about_lead: info_about_lead || "—",
    languageMode,
    voiceMode,
    voiceId,
    llm_provider,
    language: languageMode,
    deepgram_language,
    elevenlabs_model,
    use_sarvam_tts,
    ...(use_sarvam_tts && sarvam_speaker !== undefined && { sarvam_speaker }),
    ...(system_prompt !== undefined && { system_prompt }),
    ...(opening_greeting !== undefined && { opening_greeting }),
    ...(agent_name !== undefined && { agent_name }),
    ...(agent_role !== undefined && { agent_role }),
    ...(effectiveQuestionsToAsk !== undefined && { questions_to_ask: effectiveQuestionsToAsk }),
  };

  try {
    const res = await fetch(`${CALLING_AGENT_BASE}/call/outbound`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);
    const externalCallId = extractExternalCallId(data);

    // Persist a Call row so the webhook can later upsert it by externalCallId.
    try {
      await prisma.call.create({
        data: {
          companyId: session.companyId,
          leadId: resolvedLeadId,
          campaignId: resolvedCampaignId,
          direction: CallDirection.OUTBOUND,
          status: res.ok ? CallStatus.QUEUED : CallStatus.FAILED,
          externalCallId,
          failureReason: res.ok
            ? null
            : `Upstream responded with HTTP ${res.status}`,
          metadata: {
            language,
            llm_provider,
            voiceMode,
            voiceId,
            product: effectiveProduct,
            company: effectiveCompany,
            upstreamStatus: res.status,
          },
        },
      });

      // Mark the matching CampaignMessage as SENT (or FAILED) if this call is part of a campaign run.
      if (resolvedCampaignId && resolvedLeadId) {
        await prisma.campaignMessage.upsert({
          where: {
            campaignId_leadId: {
              campaignId: resolvedCampaignId,
              leadId: resolvedLeadId,
            },
          },
          create: {
            campaignId: resolvedCampaignId,
            leadId: resolvedLeadId,
            channel: "VOICE",
            status: res.ok ? "SENT" : "FAILED",
            sentAt: res.ok ? new Date() : null,
          },
          update: {
            status: res.ok ? "SENT" : "FAILED",
            sentAt: res.ok ? new Date() : undefined,
          },
        });

        if (res.ok) {
          await prisma.campaign.update({
            where: { id: resolvedCampaignId },
            data: { sentCount: { increment: 1 } },
          });
        }
      }
    } catch (err) {
      console.error("outbound: failed to persist Call row", err);
    }

    return NextResponse.json(
      {
        success: res.ok,
        status: res.status,
        data,
        externalCallId,
        leadId: resolvedLeadId,
        campaignId: resolvedCampaignId,
        ...responseFields,
      },
      { status: res.ok ? 200 : 502 }
    );
  } catch {
    // Network error reaching upstream — still record the FAILED call.
    try {
      await prisma.call.create({
        data: {
          companyId: session.companyId,
          leadId: resolvedLeadId,
          campaignId: resolvedCampaignId,
          direction: CallDirection.OUTBOUND,
          status: CallStatus.FAILED,
          failureReason: "Failed to reach calling agent service",
          metadata: { language, llm_provider, voiceMode },
        },
      });
    } catch (err) {
      console.error("outbound: failed to persist FAILED Call row", err);
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to reach calling agent service",
        leadId: resolvedLeadId,
        campaignId: resolvedCampaignId,
        ...responseFields,
      },
      { status: 502 }
    );
  }
}
