"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type ChatMessage = {
  id: string;
  from: "bot" | "user";
  text: string;
};

type HeygenAvatar = {
  id: string;
  name: string;
  gender: string | null;
  previewImageUrl: string | null;
  previewVideoUrl: string | null;
  defaultVoiceId: string | null;
  premium: boolean;
  type: string | null;
  tags: string[];
};

type HeygenVoice = {
  id: string;
  name: string;
  language: string | null;
  gender: string | null;
  previewAudioUrl: string | null;
  supportsLocale: boolean;
  supportsPause: boolean;
  supportsEmotion: boolean;
  supportsInteractiveAvatar: boolean;
};

type JobStatusResponse = {
  ok?: boolean;
  error?: string;
  job?: {
    id: string;
    heygenStatus: string;
    progressMessage: string | null;
    createdAt: string;
    updatedAt: string;
    assetId: string | null;
    heygenVideoId: string | null;
    streamUid: string | null;
    downloadUrl: string | null;
    playbackUrl: string | null;
    thumbnailUrl: string | null;
  };
  asset?: {
    id: string;
    title: string;
    filename: string;
    thumbnailUrl: string | null;
    playbackUrl: string | null;
    downloadUrl: string;
    assetPageUrl: string;
  } | null;
};

type Phase =
  | "awaitingScript"
  | "awaitingAvatarVoice"
  | "submitting"
  | "polling"
  | "completed"
  | "error";

const POLL_MS = 30_000;
const PREVIEW_VOICES_LIMIT = 12;
const PREVIEW_AVATARS_LIMIT = 8;

const STAGES = [
  { label: "Script prep", active: true },
  { label: "Avatar + voice", active: true },
  { label: "Generate", active: true },
  { label: "Track status", active: true },
  { label: "Lip sync override", active: false },
  { label: "Translation", active: false },
  { label: "Delivery + storage", active: true },
] as const;

function makeMessage(from: ChatMessage["from"], text: string): ChatMessage {
  return {
    id: `${from}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    from,
    text,
  };
}

function statusLabel(status?: string | null) {
  if (!status) return "Unknown";
  return status.replace(/_/g, " ");
}

function selectionSummary(avatar: string, voice: string) {
  if (!avatar && !voice) return "Selection pending";
  return [avatar ? `avatar ${avatar}` : "", voice ? `voice ${voice}` : ""]
    .filter(Boolean)
    .join(" + ");
}

export function HeygenAdGenerationCard() {
  const [phase, setPhase] = useState<Phase>("awaitingScript");
  const [messages, setMessages] = useState<ChatMessage[]>([
    makeMessage(
      "bot",
      "Hi, I'm Mr.F-Ad-tastic. Paste your script below and I'll help turn it into a HeyGen ad video.",
    ),
  ]);
  const [script, setScript] = useState("");
  const [submittedScript, setSubmittedScript] = useState("");
  const [avatars, setAvatars] = useState<HeygenAvatar[]>([]);
  const [voices, setVoices] = useState<HeygenVoice[]>([]);
  const [avatarsLoading, setAvatarsLoading] = useState(true);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [avatarsError, setAvatarsError] = useState<string | null>(null);
  const [voicesError, setVoicesError] = useState<string | null>(null);
  const [selectedAvatarId, setSelectedAvatarId] = useState("");
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [customAvatarId, setCustomAvatarId] = useState("");
  const [customVoiceId, setCustomVoiceId] = useState("");
  const [jobId, setJobId] = useState("");
  const [job, setJob] = useState<JobStatusResponse["job"] | null>(null);
  const [asset, setAsset] = useState<JobStatusResponse["asset"] | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const lastStatusMessageRef = useRef("");

  const effectiveAvatarId = customAvatarId.trim() || selectedAvatarId;
  const effectiveVoiceId = customVoiceId.trim() || selectedVoiceId;

  const visibleAvatars = useMemo(
    () => avatars.slice(0, PREVIEW_AVATARS_LIMIT),
    [avatars],
  );
  const visibleVoices = useMemo(
    () => voices.slice(0, PREVIEW_VOICES_LIMIT),
    [voices],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadAvatars() {
      setAvatarsLoading(true);
      setAvatarsError(null);
      try {
        const res = await fetch("/api/meta/heygen/avatars", { credentials: "include" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.ok) {
          throw new Error(typeof json?.error === "string" ? json.error : "Failed to load avatars");
        }
        if (!cancelled) {
          setAvatars(Array.isArray(json.avatars) ? json.avatars : []);
        }
      } catch (error) {
        if (!cancelled) {
          setAvatarsError(error instanceof Error ? error.message : "Failed to load avatars");
        }
      } finally {
        if (!cancelled) {
          setAvatarsLoading(false);
        }
      }
    }

    async function loadVoices() {
      setVoicesLoading(true);
      setVoicesError(null);
      try {
        const res = await fetch("/api/meta/heygen/voices", { credentials: "include" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.ok) {
          throw new Error(typeof json?.error === "string" ? json.error : "Failed to load voices");
        }
        if (!cancelled) {
          setVoices(Array.isArray(json.voices) ? json.voices : []);
        }
      } catch (error) {
        if (!cancelled) {
          setVoicesError(error instanceof Error ? error.message : "Failed to load voices");
        }
      } finally {
        if (!cancelled) {
          setVoicesLoading(false);
        }
      }
    }

    void loadAvatars();
    void loadVoices();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!jobId || phase !== "polling") return;

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/meta/heygen/videos/status/${jobId}`, {
          credentials: "include",
          cache: "no-store",
        });
        const json = (await res.json().catch(() => ({}))) as JobStatusResponse;
        if (!res.ok || !json?.ok || !json.job) {
          throw new Error(typeof json?.error === "string" ? json.error : "Failed to check video status");
        }

        if (cancelled) return;

        setJob(json.job);
        setAsset(json.asset ?? null);

        const statusMessage = `Status update: ${statusLabel(json.job.heygenStatus)}.${json.job.progressMessage ? ` ${json.job.progressMessage}` : ""}`;
        if (lastStatusMessageRef.current !== statusMessage) {
          lastStatusMessageRef.current = statusMessage;
          setMessages((prev) => [...prev, makeMessage("bot", statusMessage)]);
        }

        const normalizedStatus = (json.job.heygenStatus || "").toLowerCase();
        if (normalizedStatus === "completed" && json.job.assetId) {
          setPhase("completed");
          setMessages((prev) => [
            ...prev,
            makeMessage("bot", "Your video is ready. Preview it below, open the asset, or download it."),
          ]);
        } else if (["failed", "webhook_error", "storage_error"].includes(normalizedStatus)) {
          setPhase("error");
          setActionError(json.job.progressMessage || "Video generation failed.");
        }
      } catch (error) {
        if (!cancelled) {
          setActionError(error instanceof Error ? error.message : "Failed to check video status");
        }
      }
    }

    void poll();
    const interval = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [jobId, phase]);

  const submitScript = () => {
    const trimmed = script.trim();
    if (!trimmed) {
      setActionError("Please paste a script first.");
      return;
    }
    setActionError(null);
    setSubmittedScript(trimmed);
    setMessages((prev) => [
      ...prev,
      makeMessage("user", trimmed),
      makeMessage(
        "bot",
        "Nice script. Now choose an avatar and voice, or override either one with a custom HeyGen ID.",
      ),
    ]);
    setPhase("awaitingAvatarVoice");
  };

  const startGeneration = async () => {
    if (!submittedScript.trim()) {
      setActionError("Submit a script before generating.");
      return;
    }
    if (!effectiveAvatarId || !effectiveVoiceId) {
      setActionError("Choose an avatar and voice, or enter custom IDs.");
      return;
    }

    setActionError(null);
    setPhase("submitting");

    try {
      const res = await fetch("/api/meta/heygen/videos/start", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: submittedScript,
          avatarId: selectedAvatarId || undefined,
          voiceId: selectedVoiceId || undefined,
          customAvatarId: customAvatarId.trim() || undefined,
          customVoiceId: customVoiceId.trim() || undefined,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok || typeof json?.jobId !== "string") {
        throw new Error(typeof json?.error === "string" ? json.error : "Failed to start generation");
      }

      setJobId(json.jobId);
      setMessages((prev) => [
        ...prev,
        makeMessage("user", `Use ${selectionSummary(effectiveAvatarId, effectiveVoiceId)}.`),
        makeMessage(
          "bot",
          "Awesome choice. I'm sending this to HeyGen now and I'll keep reporting back every 30 seconds until it lands.",
        ),
      ]);
      setPhase("polling");
    } catch (error) {
      setPhase("error");
      setActionError(error instanceof Error ? error.message : "Failed to start generation");
    }
  };

  const handleDownload = async () => {
    if (!asset?.downloadUrl) return;
    setDownloading(true);
    try {
      const res = await fetch(asset.downloadUrl, { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success || typeof json?.download?.url !== "string") {
        throw new Error(typeof json?.error === "string" ? json.error : "Failed to prepare download");
      }
      window.open(json.download.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to download asset");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/10 overflow-hidden">
      <div className="border-b border-[var(--glass-border)] bg-[var(--glass)]/20 px-4 py-3">
        <div className="flex flex-col gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Ad generation (HeyGen)</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Script in, avatar ad out. Mr.F-Ad-tastic will guide the selection flow, track delivery,
              and hand back the final asset with storage already wired.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STAGES.map((stage) => (
              <span
                key={stage.label}
                className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold ${
                  stage.active
                    ? "border-[var(--sibling-primary)]/20 bg-[var(--sibling-primary)]/10 text-[var(--sibling-primary)]"
                    : "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}
              >
                {stage.label}
                {!stage.active ? " · Coming soon" : ""}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="max-h-72 space-y-2 overflow-auto rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/5 p-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                message.from === "bot"
                  ? "border border-[var(--glass-border)] bg-[var(--glass)]/30 text-foreground"
                  : "ml-auto bg-[var(--sibling-primary)] text-white"
              }`}
            >
              {message.text}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            rows={5}
            placeholder="Paste your ad script here..."
            className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/10 px-3 py-2 text-sm outline-none transition focus:border-[var(--sibling-primary)]/40"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={submitScript}
              disabled={!script.trim() || phase === "submitting" || phase === "polling"}
              className="inline-flex items-center rounded-lg bg-[var(--sibling-primary)] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Submit script
            </button>
            {submittedScript ? (
              <span className="text-[11px] text-muted-foreground">
                Current script locked in for generation.
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold text-foreground">Choose avatar</h4>
              {avatarsLoading ? <span className="text-[10px] text-muted-foreground">Loading…</span> : null}
            </div>
            {avatarsError ? (
              <p className="text-xs text-red-600 dark:text-red-400">{avatarsError}</p>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              {visibleAvatars.map((avatar) => {
                const active = selectedAvatarId === avatar.id;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setSelectedAvatarId(avatar.id)}
                    className={`overflow-hidden rounded-xl border text-left transition ${
                      active
                        ? "border-[var(--sibling-primary)] bg-[var(--sibling-primary)]/10"
                        : "border-[var(--glass-border)] bg-[var(--glass)]/10 hover:bg-[var(--glass)]/20"
                    }`}
                  >
                    <div className="relative aspect-video bg-muted/40">
                      {avatar.previewVideoUrl ? (
                        <video
                          src={avatar.previewVideoUrl}
                          muted
                          loop
                          playsInline
                          autoPlay
                          className="h-full w-full object-cover"
                        />
                      ) : avatar.previewImageUrl ? (
                        <Image
                          src={avatar.previewImageUrl}
                          alt={avatar.name}
                          fill
                          sizes="(min-width: 1024px) 20vw, 40vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
                          No preview
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 p-2">
                      <p className="text-xs font-semibold text-foreground">{avatar.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {avatar.gender || "Unknown"}{avatar.premium ? " · Premium" : ""}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            <input
              value={customAvatarId}
              onChange={(e) => setCustomAvatarId(e.target.value)}
              placeholder="Or paste custom avatar ID"
              className="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/10 px-3 py-2 text-xs outline-none focus:border-[var(--sibling-primary)]/40"
            />
          </div>

          <div className="space-y-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold text-foreground">Choose voice</h4>
              {voicesLoading ? <span className="text-[10px] text-muted-foreground">Loading…</span> : null}
            </div>
            {voicesError ? (
              <p className="text-xs text-red-600 dark:text-red-400">{voicesError}</p>
            ) : null}
            <div className="space-y-2">
              {visibleVoices.map((voice) => {
                const active = selectedVoiceId === voice.id;
                return (
                  <button
                    key={voice.id}
                    type="button"
                    onClick={() => setSelectedVoiceId(voice.id)}
                    className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                      active
                        ? "border-[var(--sibling-primary)] bg-[var(--sibling-primary)]/10"
                        : "border-[var(--glass-border)] bg-[var(--glass)]/10 hover:bg-[var(--glass)]/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-foreground">{voice.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {[voice.language, voice.gender].filter(Boolean).join(" · ") || "Voice"}
                        </p>
                      </div>
                      {voice.previewAudioUrl ? (
                        <audio controls preload="none" className="max-w-[160px]">
                          <source src={voice.previewAudioUrl} />
                        </audio>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
            <input
              value={customVoiceId}
              onChange={(e) => setCustomVoiceId(e.target.value)}
              placeholder="Or paste custom voice ID"
              className="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/10 px-3 py-2 text-xs outline-none focus:border-[var(--sibling-primary)]/40"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void startGeneration()}
            disabled={phase === "submitting" || phase === "polling"}
            className="inline-flex items-center rounded-lg bg-[var(--sibling-primary)] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {phase === "submitting" ? "Submitting…" : phase === "polling" ? "Generating…" : "Generate HeyGen ad"}
          </button>
          <span className="text-[11px] text-muted-foreground">
            Selection: {selectionSummary(effectiveAvatarId, effectiveVoiceId)}
          </span>
        </div>

        {job ? (
          <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/5 p-3 text-xs text-muted-foreground">
            <p>
              Status: <span className="font-semibold text-foreground">{statusLabel(job.heygenStatus)}</span>
            </p>
            {job.progressMessage ? <p className="mt-1">{job.progressMessage}</p> : null}
          </div>
        ) : null}

        {asset ? (
          <div className="space-y-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/5 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-foreground">{asset.title}</h4>
                <p className="text-[11px] text-muted-foreground">{asset.filename}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleDownload()}
                  disabled={downloading}
                  className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/20 px-3 py-2 text-xs font-semibold hover:bg-[var(--glass)]/30 disabled:opacity-50"
                >
                  {downloading ? "Preparing…" : "Download"}
                </button>
                <Link
                  href={asset.assetPageUrl}
                  target="_blank"
                  className="rounded-lg bg-[var(--sibling-primary)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
                >
                  Open asset ↗
                </Link>
              </div>
            </div>

            {asset.playbackUrl ? (
              <video
                controls
                className="w-full rounded-xl border border-[var(--glass-border)] bg-black"
                poster={asset.thumbnailUrl ?? undefined}
                src={asset.playbackUrl}
              />
            ) : asset.thumbnailUrl ? (
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-[var(--glass-border)]">
                <Image
                  src={asset.thumbnailUrl}
                  alt={asset.title}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {actionError ? (
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
            {actionError}
          </div>
        ) : null}
      </div>
    </div>
  );
}

