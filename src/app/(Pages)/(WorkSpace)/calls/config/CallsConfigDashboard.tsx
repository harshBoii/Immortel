"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, Settings2, Plus, Trash2, Star } from "lucide-react";
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
const LANGUAGE_OPTIONS = [
  { value: "english", label: "English", deepgram: "en" },
  { value: "hindi", label: "Hindi", deepgram: "hi" },
  { value: "marathi", label: "Marathi", deepgram: "mr" },
  { value: "kannada", label: "Kannada", deepgram: "kn" },
  { value: "telugu", label: "Telugu", deepgram: "te" },
  { value: "tamil", label: "Tamil", deepgram: "ta" },
  { value: "malayalam", label: "Malayalam", deepgram: "ml" },
  { value: "punjabi", label: "Punjabi", deepgram: "pa" },
  { value: "bengali", label: "Bengali", deepgram: "bn" },
  { value: "gujarati", label: "Gujarati", deepgram: "gu" },
  { value: "odia", label: "Odia", deepgram: "or" },
] as const;

export default function CallsConfigDashboard({ initial }: { initial: CallConfig | null }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [presetErr, setPresetErr] = useState<string | null>(null);

  const [presets, setPresets] = useState<
    { id: string; name: string; isDefault: boolean; questions: string[] }[]
  >([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newQuestionsText, setNewQuestionsText] = useState("");

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

  const deepgramLanguage =
    LANGUAGE_OPTIONS.find((l) => l.value === languageMode)?.deepgram ?? "en";

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

  async function refreshPresets() {
    const r = await fetch("/api/calls/question-presets", { cache: "no-store" });
    const j = (await r.json().catch(() => ({}))) as {
      items?: { id: string; name: string; isDefault: boolean; questions: string[] }[];
    };
    setPresets(r.ok ? (j.items ?? []) : []);
  }

  useEffect(() => {
    void refreshPresets();
  }, []);

  function parseQuestions(text: string) {
    return text
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);
  }

  async function createPreset() {
    setPresetErr(null);
    const questions = parseQuestions(newQuestionsText);
    const r = await fetch("/api/calls/question-presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), questions }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setPresetErr(j.error ?? "Failed to create preset");
      return;
    }
    setNewName("");
    setNewQuestionsText("");
    setCreating(false);
    await refreshPresets();
  }

  async function setDefaultPreset(id: string) {
    setPresetErr(null);
    const r = await fetch(`/api/calls/question-presets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setPresetErr(j.error ?? "Failed to set default");
      return;
    }
    await refreshPresets();
  }

  async function savePreset(id: string, name: string, questionsText: string) {
    setPresetErr(null);
    const questions = parseQuestions(questionsText);
    const r = await fetch(`/api/calls/question-presets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), questions }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setPresetErr(j.error ?? "Failed to save preset");
      return;
    }
    await refreshPresets();
  }

  async function deletePreset(id: string) {
    if (!confirm("Delete this preset?")) return;
    setPresetErr(null);
    const r = await fetch(`/api/calls/question-presets/${id}`, { method: "DELETE" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setPresetErr(j.error ?? "Failed to delete preset");
      return;
    }
    await refreshPresets();
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
          <Field label="Language mode" hint={`Deepgram language: ${deepgramLanguage}`}>
            <select
              value={languageMode}
              onChange={(e) => setLanguageMode(e.target.value)}
              className={inputCls}
            >
              {LANGUAGE_OPTIONS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
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

          {/* <Field label="System prompt" hint="Optional override (advanced)">
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className={textareaCls}
              rows={5}
              placeholder="Agent persona, guardrails, and conversation policy…"
            />
          </Field> */}
        </Card>
      </div>

      <section className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass)]/60 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-[13px] font-semibold">Question presets</h2>
            <p className="text-[12px] text-muted-foreground/70">
              Create presets (max 4 questions each) and set one as the company default.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--glass-border)] bg-[var(--glass)] px-3 py-2 text-[12px] font-semibold hover:bg-[var(--glass-hover)]"
          >
            <Plus className="h-3.5 w-3.5" /> New preset
          </button>
        </div>

        {creating && (
          <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/40 p-3">
            <Field label="Preset name">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className={inputCls}
                placeholder="Qualification v1"
              />
            </Field>
            <Field label="Questions (one per line, max 4)">
              <textarea
                value={newQuestionsText}
                onChange={(e) => setNewQuestionsText(e.target.value)}
                className={textareaCls}
                rows={4}
                placeholder={"What are you looking for?\nWhat is your budget?\nWhen do you want to buy?\nAny constraints?"}
              />
            </Field>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass)] px-3 py-2 text-[12px] font-semibold hover:bg-[var(--glass-hover)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createPreset}
                disabled={!newName.trim()}
                className="rounded-lg bg-[var(--sibling-primary)] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        )}

        {presetErr && (
          <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-[12px] text-rose-500">
            {presetErr}
          </div>
        )}

        {presets.length === 0 ? (
          <div className="text-[12px] text-muted-foreground">No presets yet.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {presets.map((p) => (
              <PresetCard
                key={p.id}
                preset={p}
                onSetDefault={() => void setDefaultPreset(p.id)}
                onSave={(name, qs) => void savePreset(p.id, name, qs)}
                onDelete={() => void deletePreset(p.id)}
              />
            ))}
          </div>
        )}
      </section>

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

function PresetCard({
  preset,
  onSetDefault,
  onSave,
  onDelete,
}: {
  preset: { id: string; name: string; isDefault: boolean; questions: string[] };
  onSetDefault: () => void;
  onSave: (name: string, questionsText: string) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(preset.name);
  const [qs, setQs] = useState((preset.questions ?? []).join("\n"));

  return (
    <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
          <div className="mt-1 flex items-center gap-2">
            {preset.isDefault ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                <Star className="h-3 w-3" /> Default
              </span>
            ) : (
              <button
                type="button"
                onClick={onSetDefault}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass)] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:bg-[var(--glass-hover)]"
              >
                <Star className="h-3 w-3" /> Make default
              </button>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--glass-border)] bg-[var(--glass)] hover:bg-[var(--glass-hover)]"
          aria-label="Delete preset"
        >
          <Trash2 className="h-4 w-4 text-rose-500" />
        </button>
      </div>

      <div className="mt-2">
        <textarea
          value={qs}
          onChange={(e) => setQs(e.target.value)}
          rows={4}
          className={textareaCls}
          placeholder={"Question 1\nQuestion 2\nQuestion 3\nQuestion 4"}
        />
        <div className="mt-1 text-[11px] text-muted-foreground/70">
          Only the first 4 non-empty lines are saved.
        </div>
      </div>

      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onSave(name, qs)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--sibling-primary)] px-3 py-2 text-[12px] font-semibold text-white hover:brightness-110"
        >
          <Save className="h-3.5 w-3.5" /> Save
        </button>
      </div>
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

