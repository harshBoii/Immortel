"use client";

import { useMemo, useState } from "react";

const REASONS = [
  "Too expensive",
  "Not interested",
  "Bought elsewhere",
  "Need more info",
  "Other",
] as const;

export default function FeedbackPage({
  params,
}: {
  params: { token: string };
}) {
  const token = params.token;
  const [rating, setRating] = useState<number>(0);
  const [reason, setReason] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => rating >= 1 && rating <= 5 && !submitting, [rating, submitting]);

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/feedback/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        rating,
        reason: reason || null,
        text: text.trim() || null,
      }),
    });
    setSubmitting(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(j.error ?? "Failed to submit feedback");
      return;
    }
    setDone("Thanks — your feedback has been submitted.");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-5 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Share feedback</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        This takes less than a minute. Rating is required.
      </p>

      <section className="mt-6 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass)]/60 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
          Rating
        </div>
        <div className="mt-2 flex items-center gap-2">
          {Array.from({ length: 5 }).map((_, i) => {
            const v = i + 1;
            const active = v <= rating;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setRating(v)}
                className={`h-10 w-10 rounded-xl border text-sm font-semibold transition-colors ${
                  active
                    ? "border-[var(--sibling-primary)]/40 bg-[var(--sibling-primary)]/10 text-[var(--sibling-primary)]"
                    : "border-[var(--glass-border)] bg-[var(--glass)] hover:bg-[var(--glass-hover)]"
                }`}
                aria-label={`Rate ${v} out of 5`}
              >
                {v}
              </button>
            );
          })}
        </div>

        <div className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
          Reason (optional)
        </div>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-2 w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/60 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--sibling-primary)]/40"
        >
          <option value="">Select a reason…</option>
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <div className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
          Feedback (optional)
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="Tell us what we could do better…"
          className="mt-2 w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/60 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--sibling-primary)]/40"
        />

        {error && (
          <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-sm text-rose-500">
            {error}
          </div>
        )}
        {done && (
          <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-600">
            {done}
          </div>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit || !!done}
          className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-[var(--sibling-primary)] px-3 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
        >
          {submitting ? "Submitting…" : done ? "Submitted" : "Submit feedback"}
        </button>
      </section>
    </main>
  );
}

