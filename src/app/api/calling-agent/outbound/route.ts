import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const CALLING_AGENT_BASE = "https://calling-agent-ki3j.onrender.com";
const DEFAULT_VOICE_ID = "oO7sLA3dWfQXsKeSAjpA";

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
  const voiceId = voiceIdRaw || DEFAULT_VOICE_ID;

  const languageMode = normalizeLanguageSlug(
    body.languageMode ?? body.language
  );

  const voiceRaw = body.voiceMode;
  const voiceMode: VoiceMode =
    voiceRaw === "speed" || voiceRaw === "quality" || voiceRaw === "eleven_v3"
      ? voiceRaw
      : "speed";

  const llm_provider = normalizeLlmProvider(body.llm_provider);

  const mapped = LANGUAGE_BY_SLUG[languageMode];
  const clientDg = optionalTrimmedString(body.deepgram_language);
  const deepgram_language = clientDg ?? mapped.deepgram_language;
  const language = mapped.language;

  const system_prompt = optionalTrimmedString(body.system_prompt);
  const opening_greeting = optionalTrimmedString(body.opening_greeting);
  const agent_name = optionalTrimmedString(body.agent_name);
  const agent_role = optionalTrimmedString(body.agent_role);
  const questions_to_ask = optionalTrimmedString(body.questions_to_ask);
  const use_sarvam_tts = optionalBoolean(body.use_sarvam_tts) ?? false;
  const sarvam_speaker = normalizeSarvamSpeaker(body.sarvam_speaker);

  if (!to || !name || !company || !product) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing required fields: to, name, company, product",
      },
      { status: 400 }
    );
  }

  const elevenlabs_model = mapElevenlabsModel(voiceMode);

  const payload: Record<string, unknown> = {
    to,
    language,
    deepgram_language,
    elevenlabs_model,
    name,
    company,
    product,
    perks_of_product: perks_of_product || "—",
    info_about_lead: info_about_lead || "—",
    voiceId,
    llm_provider,
  };

  payload.use_sarvam_tts = use_sarvam_tts;
  if (use_sarvam_tts && sarvam_speaker !== undefined) {
    payload.sarvam_speaker = sarvam_speaker;
  }

  if (system_prompt !== undefined) payload.system_prompt = system_prompt;
  if (opening_greeting !== undefined) payload.opening_greeting = opening_greeting;
  if (agent_name !== undefined) payload.agent_name = agent_name;
  if (agent_role !== undefined) payload.agent_role = agent_role;
  if (questions_to_ask !== undefined) payload.questions_to_ask = questions_to_ask;

  const responseFields: OutboundForwardedPayload = {
    to,
    name,
    company,
    product,
    perks_of_product: perks_of_product || "—",
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
    ...(questions_to_ask !== undefined && { questions_to_ask }),
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

    return NextResponse.json(
      {
        success: res.ok,
        status: res.status,
        data,
        ...responseFields,
      },
      { status: res.ok ? 200 : 502 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to reach calling agent service",
        ...responseFields,
      },
      { status: 502 }
    );
  }
}
