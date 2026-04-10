import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const CALLING_AGENT_BASE = "https://calling-agent-ki3j.onrender.com";
const DEFAULT_VOICE_ID = "oO7sLA3dWfQXsKeSAjpA";

type LanguageMode = "english" | "hindi" | "other";
type VoiceMode = "quality" | "speed" | "eleven_v3";
type LlmProvider = "gemini" | "openai" | "claude" | "groq";

const LLM_PROVIDERS: LlmProvider[] = ["gemini", "openai", "claude", "groq"];

function normalizeLlmProvider(raw: unknown): LlmProvider {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return LLM_PROVIDERS.includes(s as LlmProvider) ? (s as LlmProvider) : "groq";
}

function mapElevenlabsModel(mode: VoiceMode) {
  if (mode === "speed") return "eleven_flash_v2_5";
  if (mode === "eleven_v3") return "eleven_v3";
  return "eleven_multilingual_v2";
}

function mapLanguage(mode: LanguageMode) {
  if (mode === "hindi") {
    return { language: "Hindi", deepgram_language: "hi" as const };
  }
  if (mode === "english") {
    return { language: "English", deepgram_language: "en" as const };
  }
  return { language: "Multi", deepgram_language: "multi" as const };
}

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

  const modeRaw = body.languageMode;
  const languageMode: LanguageMode =
    modeRaw === "hindi" || modeRaw === "english" || modeRaw === "other"
      ? modeRaw
      : "english";

  const voiceRaw = body.voiceMode;
  const voiceMode: VoiceMode =
    voiceRaw === "speed" || voiceRaw === "quality" || voiceRaw === "eleven_v3"
      ? voiceRaw
      : "quality";

  const llm_provider = normalizeLlmProvider(body.llm_provider);

  if (!to || !name || !company || !product) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing required fields: to, name, company, product",
      },
      { status: 400 }
    );
  }

  const { language, deepgram_language } = mapLanguage(languageMode);
  const elevenlabs_model = mapElevenlabsModel(voiceMode);

  const payload = {
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
      },
      { status: res.ok ? 200 : 502 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to reach calling agent service" },
      { status: 502 }
    );
  }
}
