"use client";

import { useState } from "react";

export function ArticleActions({ bountyId }: { bountyId: string }) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [approveLoading, setApproveLoading] = useState(false);

  const onApprove = async () => {
    setApproveLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/geo/bounty/${encodeURIComponent(bountyId)}/approve-shopify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const err =
          json?.error ||
          (res.status === 207
            ? "Published to Shopify with warnings (partial success)."
            : "Failed to publish to Shopify.");
        const details = json?.data?.articleId ? ` Article GID: ${json.data.articleId}` : "";
        setMessage(`${err}${details}`);
        return;
      }

      const articleId = json?.data?.article?.id ?? json?.data?.articleId ?? null;
      setMessage(
        articleId
          ? `Published to Shopify Blog. Article GID: ${articleId}`
          : "Published to Shopify Blog."
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to publish to Shopify.");
    } finally {
      setApproveLoading(false);
    }
  };

  const onRegenerate = () => {
    setShowFeedback(true);
    setMessage(null);
  };

  const onSubmitRegenerate = () => {
    if (!feedback.trim()) {
      setMessage("Please add feedback before regenerating.");
      return;
    }
    setMessage(
      `Regeneration queued for ${bountyId} with your feedback.`
    );
    setShowFeedback(false);
  };

  return (
    <section className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass)]/40 p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onApprove}
          disabled={approveLoading}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {approveLoading ? "Publishing…" : "Approve"}
        </button>
        <button
          type="button"
          onClick={onRegenerate}
          className="rounded-md border border-[var(--glass-border)] bg-[var(--glass-hover)] px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-[var(--glass-hover)]/80"
        >
          Regenerate
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        On approval, this page will be published at your domain and at our GEO optimized Immortel domain.
      </p>

      {showFeedback ? (
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground" htmlFor="regen-feedback">
            Regeneration feedback
          </label>
          <textarea
            id="regen-feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Tell us what to improve in this page..."
            className="w-full min-h-24 rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/30 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSubmitRegenerate}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Submit Regeneration
            </button>
            <button
              type="button"
              onClick={() => setShowFeedback(false)}
              className="rounded-md border border-[var(--glass-border)] px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {message ? <div className="text-xs text-foreground">{message}</div> : null}
    </section>
  );
}

