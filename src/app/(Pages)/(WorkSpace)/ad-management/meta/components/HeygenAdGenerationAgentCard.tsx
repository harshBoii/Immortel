"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

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

type Phase = "idle" | "submitting" | "polling" | "completed" | "error";

const POLL_MS = 30_000;

function statusLabel(status?: string | null) {
  if (!status) return "Unknown";
  return status.replace(/_/g, " ");
}

export function HeygenAdGenerationAgentCard() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [prompt, setPrompt] = useState("");
  const [jobId, setJobId] = useState("");
  const [job, setJob] = useState<JobStatusResponse["job"] | null>(null);
  const [asset, setAsset] = useState<JobStatusResponse["asset"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastStatusRef = useRef("");

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
          throw new Error(typeof json?.error === "string" ? json.error : "Failed to check status");
        }
        if (cancelled) return;

        setJob(json.job);
        setAsset(json.asset ?? null);

        const msg = `${json.job.heygenStatus}:${json.job.progressMessage ?? ""}`;
        if (lastStatusRef.current !== msg) lastStatusRef.current = msg;

        const st = (json.job.heygenStatus || "").toLowerCase();
        if (st === "completed" && json.job.assetId) {
          setPhase("completed");
        } else if (["failed", "webhook_error", "storage_error"].includes(st)) {
          setPhase("error");
          setError(json.job.progressMessage || "Video generation failed.");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to check status");
        }
      }
    }

    void poll();
    const t = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [jobId, phase]);

  const start = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError("Prompt is required.");
      return;
    }

    setError(null);
    setPhase("submitting");
    try {
      const res = await fetch("/api/meta/heygen/agents/start", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok || typeof json?.jobId !== "string") {
        throw new Error(typeof json?.error === "string" ? json.error : "Failed to start agent");
      }
      setJobId(json.jobId);
      setPhase("polling");
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "Failed to start agent");
    }
  };

  return (
    <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/10 overflow-hidden">
      <div className="border-b border-[var(--glass-border)] bg-[var(--glass)]/20 px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Ads-generation-agent</h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Minimal mode: paste a prompt, we call HeyGen Video Agent. No avatar/voice selection.
        </p>
      </div>

      <div className="space-y-3 p-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          placeholder="A 60-second onboarding video for our SaaS product. Friendly tone."
          className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/10 px-3 py-2 text-sm outline-none transition focus:border-[var(--sibling-primary)]/40"
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void start()}
            disabled={phase === "submitting" || phase === "polling"}
            className="inline-flex items-center rounded-lg bg-[var(--sibling-primary)] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {phase === "submitting"
              ? "Submitting…"
              : phase === "polling"
                ? "Generating…"
                : "Generate via Video Agent"}
          </button>
          {job ? (
            <span className="text-[11px] text-muted-foreground">
              Status: <span className="font-semibold text-foreground">{statusLabel(job.heygenStatus)}</span>
            </span>
          ) : null}
        </div>

        {job?.progressMessage ? (
          <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/5 p-3 text-xs text-muted-foreground">
            {job.progressMessage}
          </div>
        ) : null}

        {asset ? (
          <div className="space-y-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/5 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{asset.title}</p>
                <p className="text-[11px] text-muted-foreground truncate">{asset.filename}</p>
              </div>
              <Link
                href={asset.assetPageUrl}
                target="_blank"
                className="rounded-lg bg-[var(--sibling-primary)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
              >
                Open asset ↗
              </Link>
            </div>
            {asset.playbackUrl ? (
              <video
                controls
                className="w-full rounded-xl border border-[var(--glass-border)] bg-black"
                poster={asset.thumbnailUrl ?? undefined}
                src={asset.playbackUrl}
              />
            ) : null}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}

