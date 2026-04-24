"use client";

import { useEffect, useMemo, useState, useRef, KeyboardEvent } from "react";
import { Save, Mic, Bot, Star, Plus, Trash2, ListChecks, X } from "lucide-react";
import { PageHeader } from "@/app/components/calls/common/PageHeader";
import { SelectDropdown } from "@/app/components/common/UI/SelectDropdown";
import { DEFAULT_QUESTION_PRESETS } from "@/lib/defaults/questionPresets";

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

const VOICE_MODE_OPTIONS = [
  { value: "speed", label: "Speed" },
  { value: "quality", label: "Quality" },
  { value: "eleven_v3", label: "Premium" },
] as const;

const LLM_PROVIDER_OPTIONS = [
  { value: "groq", label: "Vayu", subtitle: "Lightning fast, light on depth" },
  { value: "openai", label: "Themis", subtitle: "Follows the rules, balanced, never surprising" },
  { value: "gemini", label: "Argus", subtitle: "All-seeing, but slow to speak" },
  { value: "claude", label: "Narada", subtitle: "Wisest in the room, costs more" },
  { value: "sarvam", label: "Vani", subtitle: "Speaks your language, best in regional" },
] as const;

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

const MAX_QUESTIONS = 4;

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
  const [newQuestions, setNewQuestions] = useState<string[]>([]);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [templateErr, setTemplateErr] = useState<string | null>(null);
  const [selectedTemplateNames, setSelectedTemplateNames] = useState<Set<string>>(
    () => new Set()
  );

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

  useEffect(() => {
    const forced = languageMode !== "english" && languageMode !== "hindi";
    setUseSarvamTts(forced);
  }, [languageMode]);

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
    [languageMode, voiceMode, voiceId, llmProvider, agentName, agentTone, openingGreeting, systemPrompt, useSarvamTts, sarvamSpeaker]
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
    if (!r.ok) { setError(j.error ?? "Failed to save"); return; }
    setSavedMsg("Saved.");
  }

  async function refreshPresets() {
    const r = await fetch("/api/calls/question-presets", { cache: "no-store" });
    const j = (await r.json().catch(() => ({}))) as {
      items?: { id: string; name: string; isDefault: boolean; questions: string[] }[];
    };
    setPresets(r.ok ? (j.items ?? []) : []);
  }

  useEffect(() => { void refreshPresets(); }, []);

  async function createPreset() {
    setPresetErr(null);
    const questions = newQuestions.filter(Boolean).slice(0, MAX_QUESTIONS);
    const r = await fetch("/api/calls/question-presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), questions }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setPresetErr(j.error ?? "Failed to create preset"); return; }
    setNewName(""); setNewQuestions([]); setCreating(false);
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
    if (!r.ok) { setPresetErr(j.error ?? "Failed to set default"); return; }
    await refreshPresets();
  }

  async function savePreset(id: string, name: string, questions: string[]) {
    setPresetErr(null);
    const r = await fetch(`/api/calls/question-presets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), questions: questions.filter(Boolean).slice(0, MAX_QUESTIONS) }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setPresetErr(j.error ?? "Failed to save preset"); return; }
    await refreshPresets();
  }

  async function deletePreset(id: string) {
    if (!confirm("Delete this preset?")) return;
    setPresetErr(null);
    const r = await fetch(`/api/calls/question-presets/${id}`, { method: "DELETE" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setPresetErr(j.error ?? "Failed to delete preset"); return; }
    await refreshPresets();
  }

  function toggleTemplate(name: string) {
    setSelectedTemplateNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function selectAllTemplates() {
    setSelectedTemplateNames(new Set(DEFAULT_QUESTION_PRESETS.map((t) => t.name)));
  }

  function clearAllTemplates() {
    setSelectedTemplateNames(new Set());
  }

  async function applyTemplates() {
    const picked = DEFAULT_QUESTION_PRESETS.filter((t) => selectedTemplateNames.has(t.name));
    if (picked.length === 0) return;

    setTemplateBusy(true);
    setTemplateErr(null);
    try {
      for (const t of picked) {
        const r = await fetch("/api/calls/question-presets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: t.name, isDefault: false, questions: t.questions }),
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error ?? `Failed to create preset: ${t.name}`);
        }
      }
      await refreshPresets();
      setTemplatesOpen(false);
      clearAllTemplates();
    } catch (e) {
      setTemplateErr(e instanceof Error ? e.message : "Failed to apply templates");
    } finally {
      setTemplateBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-[1100px] flex-col gap-8 px-6 py-8">
      <PageHeader
        title="Calls Config"
        description="Default voice + agent settings applied to outbound calls when not explicitly provided."
        actions={
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--sibling-primary)] px-4 py-2 text-[13px] font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-50 transition-all"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving…" : "Save changes"}
          </button>
        }
      />

      {(error || savedMsg) && (
        <div
          className={`rounded-xl border px-4 py-3 text-[13px] font-medium ${
            error
              ? "border-rose-500/30 bg-rose-500/5 text-rose-400"
              : "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
          }`}
        >
          {error ?? savedMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Voice Defaults */}
        <Card title="Voice defaults" icon={Mic} description="Speech recognition, synthesis, and model selection">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Language">
              <SelectDropdown
                value={languageMode}
                onChange={setLanguageMode}
                options={LANGUAGE_OPTIONS.map((l) => ({ value: l.value, label: l.label }))}
              />
            </Field>
            <Field label="Voice mode">
              <SelectDropdown
                value={voiceMode}
                onChange={setVoiceMode}
                options={VOICE_MODE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
            </Field>
          </div>

          <Divider />

          <Field label="Calling Agent">
            <SelectDropdown
              value={llmProvider}
              onChange={setLlmProvider}
              options={LLM_PROVIDER_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
                subtitle: o.subtitle,
              }))}
            />
          </Field>

          <Field label="Voice ID" hint="Leave blank to use default voice">
            <input
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              className={inputCls}
              placeholder="oO7sLA3dWfQXsKeSAjpA"
            />
          </Field>

          {useSarvamTts && (
            <Field label="Sarvam speaker" hint="Auto-enabled for non-English/Hindi languages">
              <input
                value={sarvamSpeaker}
                onChange={(e) => setSarvamSpeaker(e.target.value)}
                className={inputCls}
                placeholder="rohan"
              />
            </Field>
          )}
        </Card>

        {/* Agent Persona */}
        <Card title="Agent persona" icon={Bot} description="Name, tone, and opening message for your AI agent">
          <Field label="Agent name" hint="How the agent introduces itself">
            <input
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              className={inputCls}
              placeholder="Neha"
            />
          </Field>
          <Field label="Agent tone" hint="Persona, goal, and constraints">
            <textarea
              value={agentTone}
              onChange={(e) => setAgentTone(e.target.value)}
              className={textareaCls}
              rows={4}
              placeholder="Warm, concise, consultative. Ask 2–3 questions then pitch."
            />
          </Field>
          <Field label="Opening greeting" hint="First thing the agent says">
            <textarea
              value={openingGreeting}
              onChange={(e) => setOpeningGreeting(e.target.value)}
              className={textareaCls}
              rows={3}
              placeholder="Hi, this is Neha from…"
            />
          </Field>
        </Card>
      </div>

      {/* ── Question Presets ── */}
      <section className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass)]/60">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--glass-border)] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)]">
              <ListChecks className="h-4 w-4 text-muted-foreground" />
            </span>
            <div>
              <h2 className="text-[13px] font-semibold">Question presets</h2>
              <p className="text-[12px] text-muted-foreground/60">
                Up to 4 questions per preset · one can be set as company default
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setTemplateErr(null);
                setTemplatesOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--glass-border)] bg-[var(--glass)] px-3 py-2 text-[12px] font-semibold hover:bg-[var(--glass-hover)] transition-colors"
            >
              Use templates
            </button>
            <button
              type="button"
              onClick={() => setCreating((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--glass-border)] bg-[var(--glass)] px-3 py-2 text-[12px] font-semibold hover:bg-[var(--glass-hover)] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              New preset
            </button>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Inline create form */}
          {creating && (
            <div className="rounded-xl border border-[var(--sibling-primary)]/20 bg-[var(--glass)]/40 p-4 flex flex-col gap-3">
              <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wide">New preset</p>
              <Field label="Preset name">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={inputCls}
                  placeholder="Qualification v1"
                  autoFocus
                />
              </Field>
              <Field label={`Questions (${newQuestions.filter(Boolean).length}/${MAX_QUESTIONS})`} hint="Press Enter to add · click × to remove">
                <QuestionTagInput
                  questions={newQuestions}
                  onChange={setNewQuestions}
                  max={MAX_QUESTIONS}
                />
              </Field>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setCreating(false); setNewName(""); setNewQuestions([]); }}
                  className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass)] px-3 py-2 text-[12px] font-semibold hover:bg-[var(--glass-hover)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={createPreset}
                  disabled={!newName.trim() || newQuestions.filter(Boolean).length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--sibling-primary)] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50 hover:brightness-110 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" /> Create preset
                </button>
              </div>
            </div>
          )}

          {presetErr && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-[12px] text-rose-400">
              {presetErr}
            </div>
          )}

          {presets.length === 0 && !creating ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <ListChecks className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-[13px] font-medium text-muted-foreground/50">No presets yet</p>
              <p className="text-[12px] text-muted-foreground/40">
                Create a preset to define reusable question sets for calls.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-hidden pb-1">
              <div className="flex min-w-max gap-3">
                {presets.map((p) => (
                  <div key={p.id} className="w-[420px] max-w-[86vw] shrink-0">
                    <PresetCard
                      preset={p}
                      onSetDefault={() => void setDefaultPreset(p.id)}
                      onSave={(name, questions) => void savePreset(p.id, name, questions)}
                      onDelete={() => void deletePreset(p.id)}
                    />
                  </div>
                ))}

                {/* Dashed "add" card */}
                {presets.length > 0 && !creating && (
                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="w-[420px] max-w-[86vw] shrink-0 group flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--glass-border)] bg-transparent px-4 py-8 text-[12px] font-semibold text-muted-foreground/50 hover:border-[var(--sibling-primary)]/40 hover:text-muted-foreground/80 hover:bg-[var(--glass)]/30 transition-all min-h-[120px]"
                  >
                    <Plus className="h-5 w-5 transition-transform group-hover:scale-110" />
                    Add preset
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {templatesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-3xl rounded-2xl border border-[var(--glass-border)] bg-[var(--glass)]/90 p-5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[14px] font-semibold">Use templates</h3>
                <p className="mt-0.5 text-[12px] text-muted-foreground/70">
                  Select one or more templates to add as presets for your company.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTemplatesOpen(false);
                  setTemplateErr(null);
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--glass-border)] bg-[var(--glass)] hover:bg-[var(--glass-hover)]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllTemplates}
                  className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass)] px-3 py-1.5 text-[12px] font-semibold hover:bg-[var(--glass-hover)]"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={clearAllTemplates}
                  className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass)] px-3 py-1.5 text-[12px] font-semibold hover:bg-[var(--glass-hover)]"
                >
                  Clear
                </button>
              </div>
              <div className="text-[12px] text-muted-foreground/70">
                Selected: <span className="font-semibold">{selectedTemplateNames.size}</span>
              </div>
            </div>

            {templateErr && (
              <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-[12px] text-rose-400">
                {templateErr}
              </div>
            )}

            <div className="mt-4 max-h-[55vh] overflow-y-auto overflow-x-hidden pr-1">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {DEFAULT_QUESTION_PRESETS.map((t) => {
                  const checked = selectedTemplateNames.has(t.name);
                  return (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => toggleTemplate(t.name)}
                      className={`rounded-xl border p-4 text-left transition-colors ${
                        checked
                          ? "border-[var(--sibling-primary)]/40 bg-[var(--sibling-primary)]/5"
                          : "border-[var(--glass-border)] bg-[var(--glass)]/30 hover:bg-[var(--glass-hover)]/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold truncate">{t.name}</span>
                            <span className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-hover)] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground/70">
                              {t.category}
                            </span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          readOnly
                          className="mt-0.5 h-4 w-4 accent-[var(--sibling-primary)]"
                        />
                      </div>
                      <div className="mt-3">
                        <ReadOnlyQuestions questions={t.questions} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setTemplatesOpen(false);
                  setTemplateErr(null);
                }}
                className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass)] px-3 py-2 text-[12px] font-semibold hover:bg-[var(--glass-hover)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyTemplates}
                disabled={templateBusy || selectedTemplateNames.size === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--sibling-primary)] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-50 hover:brightness-110 transition-all"
              >
                {templateBusy ? "Adding…" : "Add selected"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReadOnlyQuestions({ questions }: { questions: readonly string[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {questions.map((q, idx) => (
        <div
          key={`${idx}-${q}`}
          className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/40 px-3 py-2 text-[12px] text-muted-foreground"
        >
          {q}
        </div>
      ))}
    </div>
  );
}

// ── QuestionTagInput ─────────────────────────────────────────────────────────

function QuestionTagInput({
  questions,
  onChange,
  max,
}: {
  questions: string[];
  onChange: (qs: string[]) => void;
  max: number;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filled = questions.filter(Boolean);
  const atCap = filled.length >= max;

  function commit() {
    const val = draft.trim();
    if (!val || atCap) return;
    onChange([...questions, val]);
    setDraft("");
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    if (e.key === "Backspace" && draft === "" && questions.length > 0) {
      onChange(questions.slice(0, -1));
    }
  }

  function remove(idx: number) {
    onChange(questions.filter((_, i) => i !== idx));
    inputRef.current?.focus();
  }

  return (
    <div
      className={`flex min-h-[44px] flex-wrap gap-1.5 rounded-lg border bg-[var(--glass)]/60 px-2.5 py-2 cursor-text transition-shadow focus-within:ring-1 focus-within:ring-[var(--sibling-primary)]/40 ${
        atCap ? "border-[var(--glass-border)] opacity-90" : "border-[var(--glass-border)]"
      }`}
      onClick={() => inputRef.current?.focus()}
    >
      {questions.map((q, i) => (
        <QuestionTag key={i} text={q} onRemove={() => remove(i)} />
      ))}

      {!atCap && (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          onBlur={commit}
          placeholder={filled.length === 0 ? "Type a question and press Enter…" : "Add another…"}
          className="min-w-[140px] flex-1 bg-transparent text-[13px] placeholder:text-muted-foreground/40 focus:outline-none"
        />
      )}

      {atCap && (
        <span className="text-[11px] text-muted-foreground/50 self-center ml-1">
          4/4 max reached
        </span>
      )}
    </div>
  );
}

function QuestionTag({ text, onRemove }: { text: string; onRemove: () => void }) {
  return (
    <span className="group inline-flex items-center gap-1 rounded-md border border-[var(--glass-border)] bg-[var(--glass-hover)] pl-2 pr-1 py-0.5 text-[12px] font-medium max-w-[240px]">
      <span className="truncate">{text}</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded opacity-40 hover:opacity-100 hover:bg-rose-500/15 transition-all"
        aria-label={`Remove question: ${text}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

// ── PresetCard ───────────────────────────────────────────────────────────────

function PresetCard({
  preset,
  onSetDefault,
  onSave,
  onDelete,
}: {
  preset: { id: string; name: string; isDefault: boolean; questions: string[] };
  onSetDefault: () => void;
  onSave: (name: string, questions: string[]) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(preset.name);
  const [questions, setQuestions] = useState<string[]>(preset.questions ?? []);

  const filled = questions.filter(Boolean);
  const count = filled.length;

  return (
    <div
      className={`group/card rounded-xl border bg-[var(--glass)]/40 p-4 flex flex-col gap-3 transition-all ${
        preset.isDefault
          ? "border-emerald-500/40 shadow-[0_0_0_1px_theme(colors.emerald.500/0.15)]"
          : "border-[var(--glass-border)]"
      }`}
    >
      {/* Header row: name + delete */}
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${inputCls} flex-1 min-w-0`}
          placeholder="Preset name"
        />
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--glass-border)] bg-[var(--glass)] hover:bg-rose-500/10 hover:border-rose-500/30 transition-colors"
          aria-label="Delete preset"
        >
          <Trash2 className="h-3.5 w-3.5 text-rose-500" />
        </button>
      </div>

      {/* Question tag input */}
      <QuestionTagInput questions={questions} onChange={setQuestions} max={MAX_QUESTIONS} />

      {/* Footer: counter + default badge + save */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        {/* Left: counter + default toggle */}
        <div className="flex items-center gap-2">
          {/* Live counter pill */}
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums transition-colors ${
              count >= MAX_QUESTIONS
                ? "border border-amber-500/30 bg-amber-500/10 text-amber-500"
                : "border border-[var(--glass-border)] bg-[var(--glass)] text-muted-foreground/60"
            }`}
          >
            {count}/{MAX_QUESTIONS}
          </span>

          {/* Default badge / button */}
          {preset.isDefault ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
              <Star className="h-2.5 w-2.5 fill-emerald-500" /> Default
            </span>
          ) : (
            <button
              type="button"
              onClick={onSetDefault}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass)] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-500 transition-all"
            >
              <Star className="h-2.5 w-2.5" /> Set default
            </button>
          )}
        </div>

        {/* Save button */}
        <button
          type="button"
          onClick={() => onSave(name, questions)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--sibling-primary)] px-3 py-1.5 text-[12px] font-semibold text-white hover:brightness-110 transition-all"
        >
          <Save className="h-3.5 w-3.5" /> Save
        </button>
      </div>
    </div>
  );
}

// ── Shared layout primitives ─────────────────────────────────────────────────

function Card({
  title,
  icon: Icon,
  description,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass)]/60 flex flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--glass-border)] px-5 py-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)]">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </span>
        <div>
          <h2 className="text-[13px] font-semibold">{title}</h2>
          {description && (
            <p className="text-[11px] text-muted-foreground/60">{description}</p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-4 p-5">{children}</div>
    </section>
  );
}

function Divider() {
  return <hr className="border-[var(--glass-border)]" />;
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
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
        {label}
      </span>
      {children}
      {hint && <span className="text-[11px] text-muted-foreground/50">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/60 px-3 py-2 text-[13px] placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-[var(--sibling-primary)]/40 transition-shadow";

const textareaCls =
  "w-full resize-none rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/60 px-3 py-2 text-[13px] leading-relaxed placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-[var(--sibling-primary)]/40 transition-shadow";