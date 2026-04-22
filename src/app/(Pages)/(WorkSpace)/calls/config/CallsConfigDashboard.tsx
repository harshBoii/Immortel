"use client";

import { useMemo, useState } from "react";
import { Save, Settings2 } from "lucide-react";
import { PageHeader } from "@/app/components/calls/common/PageHeader";

type CallConfig = {
  languageMode?: string;
  voiceMode?: string;
  voiceId?: string | null;
  llmProvider?: string;
  agentName?: string | null;
  agentTone?: string | null;
  systemPrompt?: string | null;
  openingGreeting?: string | null;
  useSarvamTts?: boolean;
  sarvamSpeaker?: string | null;
};

const VOICE_MODES = ["speed", "quality", "eleven_v3"] as const;
const LLM_PROVIDERS = ["groq", "openai", "gemini", "claude", "sarvam"] as const;

export default function CallsConfigDashboard({ initial }: { initial: CallConfig | null }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const [languageMode, setLanguageMode] = useState(initial?.languageMode ?? "english");
  const [voiceMode, setVoiceMode] = useState(initial?.voiceMode ?? "speed");
  const [voiceId, setVoiceId] = useState(initial?.voiceId ?? "");
  const [llmProvider, setLlmProvider] = useState(initial?.llmProvider ?? "groq");
  const [agentName, setAgentName] = useState(initial?.agentName ?? "");
  const [agentTone, setAgentTone] = useState(initial?.agentTone ?? "");
  const [openingGreeting, setOpeningGreeting] = useState(initial?.openingGreeting ?? "");
  const [systemPrompt, setSystemPrompt] = useState(initial?.systemPrompt ?? "");
  const [useSarvamTts, setUseSarvamTts] = useState(!!initial?.useSarvamTts);
  const [sarvamSpeaker, setSarvamSpeaker] = useState(initial?.sarvamSpeaker ?? "rohan");

  const payload = useMemo(
    () => ({
      languageMode,
      voiceMode,
      voiceId: voiceId.trim() ? voiceId.trim() : null,
      llmProvider,
      agentName: agentName.trim() ? agentName.trim() : null,
      agentTone: agentTone.trim() ? agentTone.trim() : null,
      openingGreeting: openingGreeting.trim() ? openingGreeting.trim() : null,
      systemPrompt: systemPrompt.trim() ? systemPrompt.trim() : null,
      useSarvamTts,
      sarvamSpeaker: useSarvamTts ? sarvamSpeaker : null,
    }),
    [
      languageMode,
      voiceMode,
      voiceId,
      llmProvider,
      agentName,
      agentTone,
      openingGreeting,
      systemPrompt,
      useSarvamTts,
      sarvamSpeaker,
    ]
  );

  async function save() {
    setSaving(true);
    setError(null);
    setSavedMsg(null);
    const r = await fetch("/api/calls/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(j.error ?? "Failed to save");
      return;
    }
    setSavedMsg("Saved.");
  }

  return (
    <div className="mx-auto flex min-h-full max-w-[1100px] flex-col gap-6 px-6 py-8">
      <PageHeader
        title="Calls Config"
        description="Default voice + agent settings applied to outbound calls when not explicitly provided."
        actions={
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--sibling-primary)] px-3 py-2 text-[13px] font-semibold text-white hover:brightness-110 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Voice defaults" icon={Settings2}>
          <Field label="Language mode" hint='Example: "english", "hindi"'>
            <input
              value={languageMode}
              onChange={(e) => setLanguageMode(e.target.value)}
              className={inputCls}
              placeholder="english"
            />
          </Field>

          <Field label="Voice mode">
            <select
              value={voiceMode}
              onChange={(e) => setVoiceMode(e.target.value)}
              className={inputCls}
            >
              {VOICE_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Voice ID" hint="ElevenLabs voiceId (optional)">
            <input
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              className={inputCls}
              placeholder="oO7sLA3dWfQXsKeSAjpA"
            />
          </Field>

          <Field label="LLM provider">
            <select
              value={llmProvider}
              onChange={(e) => setLlmProvider(e.target.value)}
              className={inputCls}
            >
              {LLM_PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>

          <label className="mt-2 flex items-center gap-2 text-[12px] text-muted-foreground">
            <input
              type="checkbox"
              checked={useSarvamTts}
              onChange={(e) => setUseSarvamTts(e.target.checked)}
            />
            Use Sarvam TTS
          </label>

          {useSarvamTts && (
            <Field label="Sarvam speaker">
              <input
                value={sarvamSpeaker}
                onChange={(e) => setSarvamSpeaker(e.target.value)}
                className={inputCls}
                placeholder="rohan"
              />
            </Field>
          )}
        </Card>

        <Card title="Agent persona" icon={Settings2}>
          <Field label="Agent name" hint="Optional override">
            <input
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              className={inputCls}
              placeholder="Neha"
            />
          </Field>

          <Field
            label="Agent tone"
            hint="Persona, goal, tone, and constraints (optional override)"
          >
            <textarea
              value={agentTone}
              onChange={(e) => setAgentTone(e.target.value)}
              className={textareaCls}
              rows={3}
              placeholder="Warm, concise, consultative. Ask 2–3 questions then pitch."
            />
          </Field>

          <Field label="Opening greeting" hint="Optional override">
            <textarea
              value={openingGreeting}
              onChange={(e) => setOpeningGreeting(e.target.value)}
              className={textareaCls}
              rows={2}
              placeholder="Hi, this is Neha from…"
            />
          </Field>

          <Field label="System prompt" hint="Optional override (advanced)">
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className={textareaCls}
              rows={5}
              placeholder="Agent persona, guardrails, and conversation policy…"
            />
          </Field>
        </Card>
      </div>

      {(error || savedMsg) && (
        <div
          className={`rounded-lg border px-3 py-2 text-[12px] ${
            error
              ? "border-rose-500/30 bg-rose-500/5 text-rose-500"
              : "border-emerald-500/30 bg-emerald-500/5 text-emerald-500"
          }`}
        >
          {error ?? savedMsg}
        </div>
      )}
    </div>
  );
}

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass)]/60 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)]">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </span>
        <h2 className="text-[13px] font-semibold">{title}</h2>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
        {label}
      </span>
      {children}
      {hint && <span className="text-[11px] text-muted-foreground/60">{hint}</span>}
    </label>
  );
}

const inputCls =
  "rounded-md border border-[var(--glass-border)] bg-[var(--glass)]/60 px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-[var(--sibling-primary)]/40";

const textareaCls =
  "rounded-md border border-[var(--glass-border)] bg-[var(--glass)]/60 px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-[var(--sibling-primary)]/40";

