"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CreditCard, RefreshCw, ArrowLeft } from "lucide-react";
import { isDealifyPlan, type PlanId } from "@/lib/subscription/plans";

type FeatureUsage = {
  key: string;
  label: string;
  used: number;
  quota: number;
  remaining: number;
  percentUsed: number;
};

type SubscriptionPayload = {
  plan: PlanId;
  planName: string;
  priceLabel: string | null;
  status: string;
  currency: string;
  priceAmount: number;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  provider: string | null;
};

type PlanOption = {
  id: PlanId;
  name: string;
  priceLabel: string;
  highlights: string[];
};

type SummaryResponse = {
  success?: boolean;
  subscription: SubscriptionPayload | null;
  usage: { periodStart: string; periodEnd: string } | null;
  features: FeatureUsage[];
  addOns: { type: string; label: string }[];
  plans: PlanOption[];
  error?: string;
};

function statusStyles(status: string) {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "PENDING":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "ON_HOLD":
      return "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400";
    case "CANCELLED":
    case "EXPIRED":
    case "FAILED":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    default:
      return "border-[var(--glass-border)] bg-[var(--glass-hover)] text-muted-foreground";
  }
}

function formatPeriodDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function UsageBar({ feature }: { feature: FeatureUsage }) {
  const pct = feature.percentUsed;
  const tone =
    pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-amber-500" : "bg-[var(--sibling-primary)]";

  return (
    <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)] p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-sm font-medium text-foreground">{feature.label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {feature.used} / {feature.quota}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
        <div
          className={`h-full rounded-full transition-all duration-500 ${tone}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {feature.remaining} remaining · {pct}% used this period
      </p>
    </div>
  );
}

function PlanCard({
  plan,
  selected,
  isCurrent,
  onSelect,
}: {
  plan: PlanOption;
  selected: boolean;
  isCurrent: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border p-4 text-left transition-all ${
        selected
          ? "border-[var(--sibling-primary)] bg-[var(--sibling-primary)]/10 ring-2 ring-[var(--sibling-primary)]/40"
          : isCurrent
            ? "border-[var(--sibling-primary)]/50 bg-[var(--sibling-primary)]/5"
            : "border-[var(--glass-border)] bg-[var(--glass-hover)] hover:border-[var(--sibling-primary)]/30"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold text-foreground">{plan.name}</span>
        <span className="text-sm font-medium text-[var(--sibling-primary)]">{plan.priceLabel}</span>
      </div>
      {isCurrent ? (
        <span className="mt-2 inline-block text-[10px] font-bold uppercase tracking-wider text-[var(--sibling-primary)]">
          Current plan
        </span>
      ) : null}
      <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
        {plan.highlights.map((h) => (
          <li key={h} className="flex items-center gap-2">
            <span className="h-1 w-1 shrink-0 rounded-full bg-[var(--sibling-primary)]" />
            {h}
          </li>
        ))}
      </ul>
    </button>
  );
}

function WorkspacePlanContent() {
  const searchParams = useSearchParams();
  const checkoutSuccess = searchParams?.get("checkout") === "success";

  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [managingPlans, setManagingPlans] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("STARTER");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subscription", { credentials: "include" });
      const json = (await res.json().catch(() => ({}))) as SummaryResponse;
      if (!res.ok) {
        setError(json.error ?? "Failed to load subscription");
        setData(null);
        return;
      }
      setData(json);
      if (json.subscription?.plan) {
        setSelectedPlan(json.subscription.plan);
      }
    } catch {
      setError("Failed to load subscription");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (checkoutSuccess) {
      setSuccessBanner(true);
      setManagingPlans(false);
      void load();
      window.history.replaceState({}, "", "/workspace/plan");
    }
  }, [checkoutSuccess, load]);

  const sub = data?.subscription;
  const currentPlanId = sub?.plan;
  const selectedPlanOption = data?.plans.find((p) => p.id === selectedPlan);
  const isSamePlan = selectedPlan === currentPlanId && sub?.status === "ACTIVE";

  async function handleCheckout() {
    if (isSamePlan) return;
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCheckoutError(json.error ?? "Could not start checkout");
        return;
      }
      if (json.freePlan) {
        setManagingPlans(false);
        setSuccessBanner(true);
        await load();
        return;
      }
      if (!json.checkoutUrl) {
        setCheckoutError(json.error ?? "Could not start checkout");
        return;
      }
      window.location.href = json.checkoutUrl as string;
    } catch {
      setCheckoutError("Could not start checkout");
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto min-h-[60vh] px-6 pb-10 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-[var(--sibling-primary)] mb-2">
            <CreditCard className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Workspace</span>
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Plan & usage</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-lg">
            Your subscription tier, billing period, and feature quotas for this workspace.
          </p>
        </div>
        {!managingPlans ? (
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)] px-4 py-2 text-sm font-medium text-foreground hover:bg-[var(--glass)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        ) : null}
      </div>

      {successBanner ? (
        <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
          Payment received. Your plan has been updated.
        </div>
      ) : null}

      {loading && !data ? (
        <div className="rounded-xl border border-dashed border-[var(--glass-border)] bg-[var(--glass)] p-8 text-center text-sm text-muted-foreground">
          Loading subscription…
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-6">
          {error}
        </div>
      ) : null}

      {!loading && data && !sub && !managingPlans ? (
        <div className="rounded-xl border border-dashed border-[var(--glass-border)] bg-[var(--glass)] p-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">No subscription found for this workspace.</p>
          <button
            type="button"
            onClick={() => {
              setManagingPlans(true);
              setSelectedPlan("STARTER");
            }}
            className="inline-flex rounded-xl bg-[var(--sibling-primary)] px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Choose a plan
          </button>
        </div>
      ) : null}

      {managingPlans && data ? (
        <section className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass)]/60 p-6">
          <button
            type="button"
            onClick={() => {
              setManagingPlans(false);
              setCheckoutError(null);
              if (currentPlanId) setSelectedPlan(currentPlanId);
            }}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to usage
          </button>
          <h2 className="text-lg font-semibold text-foreground">Choose a plan</h2>
          <p className="mt-1 text-sm text-muted-foreground mb-6">
            Select a tier and continue to our secure checkout. Your workspace updates after payment
            is confirmed.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {data.plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                selected={selectedPlan === plan.id}
                isCurrent={plan.id === currentPlanId}
                onSelect={() => setSelectedPlan(plan.id)}
              />
            ))}
          </div>
          {checkoutError ? (
            <p className="mt-4 text-sm text-destructive">{checkoutError}</p>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleCheckout()}
              disabled={checkoutLoading || isSamePlan}
              className="rounded-xl bg-[var(--sibling-primary)] px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {checkoutLoading
                ? "Redirecting…"
                : isSamePlan
                  ? "Already on this plan"
                  : `Continue to checkout — ${selectedPlanOption?.name ?? selectedPlan}`}
            </button>
            {sub?.status === "PENDING" ? (
              <p className="text-xs text-muted-foreground">
                Complete checkout to activate your subscription.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {sub && !managingPlans ? (
        <div className="grid gap-8">
          <section className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass)]/60 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Current plan
                </p>
                <h2 className="mt-1 text-xl font-semibold text-foreground">
                  {sub.planName}
                  {sub.priceLabel ? (
                    <span className="ml-2 text-base font-normal text-[var(--sibling-primary)]">
                      {sub.priceLabel}
                    </span>
                  ) : null}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setManagingPlans(true);
                    setCheckoutError(null);
                    if (currentPlanId) setSelectedPlan(currentPlanId);
                  }}
                  className="rounded-xl border border-[var(--sibling-primary)]/40 bg-[var(--sibling-primary)]/10 px-4 py-2 text-sm font-semibold text-[var(--sibling-primary)] hover:bg-[var(--sibling-primary)]/15 transition-colors"
                >
                  Manage plans
                </button>
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusStyles(sub.status)}`}
                >
                  {sub.status.replace(/_/g, " ")}
                </span>
              </div>
            </div>

            {sub.status === "PENDING" ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Payment is not complete yet.{" "}
                <button
                  type="button"
                  onClick={() => setManagingPlans(true)}
                  className="font-medium text-[var(--sibling-primary)] hover:underline"
                >
                  Complete checkout
                </button>{" "}
                to activate your workspace quotas.
              </p>
            ) : null}

            {data.usage && sub.plan && !isDealifyPlan(sub.plan) ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Billing period:{" "}
                <span className="text-foreground font-medium">
                  {formatPeriodDate(data.usage.periodStart)} – {formatPeriodDate(data.usage.periodEnd)}
                </span>
              </p>
            ) : null}

            {sub.status === "ACTIVE" &&
            !data.usage &&
            (!sub.plan || !isDealifyPlan(sub.plan)) ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Usage counters will appear after your first billing period is recorded.
              </p>
            ) : null}

            {data.addOns.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {data.addOns.map((a) => (
                  <span
                    key={a.type}
                    className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-hover)] px-2.5 py-1 text-xs text-foreground"
                  >
                    {a.label}
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-foreground mb-4">Usage this period</h3>
            {data.features.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.features.map((f) => (
                  <UsageBar key={f.key} feature={f} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No usage data available.</p>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-foreground mb-1">Available plans</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Compare tiers or use Manage plans to switch your subscription.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              {data.plans.map((plan) => {
                const isCurrent = plan.id === currentPlanId;
                return (
                  <div
                    key={plan.id}
                    className={`rounded-xl border p-4 ${
                      isCurrent
                        ? "border-[var(--sibling-primary)] bg-[var(--sibling-primary)]/8 ring-1 ring-[var(--sibling-primary)]/30"
                        : "border-[var(--glass-border)] bg-[var(--glass-hover)]"
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold text-foreground">{plan.name}</span>
                      <span className="text-sm font-medium text-[var(--sibling-primary)]">
                        {plan.priceLabel}
                      </span>
                    </div>
                    {isCurrent ? (
                      <span className="mt-2 inline-block text-[10px] font-bold uppercase tracking-wider text-[var(--sibling-primary)]">
                        Current plan
                      </span>
                    ) : null}
                    <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                      {plan.highlights.map((h) => (
                        <li key={h} className="flex items-center gap-2">
                          <span className="h-1 w-1 shrink-0 rounded-full bg-[var(--sibling-primary)]" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export default function WorkspacePlanPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto px-6 py-10 text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <WorkspacePlanContent />
    </Suspense>
  );
}
