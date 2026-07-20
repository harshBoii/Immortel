"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CreditCard, RefreshCw, Plus } from "lucide-react";
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

type ActiveAddOn = {
  type: string;
  label: string;
  description: string;
  priceLabel: string;
  quantity: number;
  stackable: boolean;
};

type AddOnOption = {
  id: string;
  name: string;
  description: string;
  priceLabel: string;
  priceAmount: number;
  stackable: boolean;
};

type SummaryResponse = {
  success?: boolean;
  subscription: SubscriptionPayload | null;
  usage: { periodStart: string; periodEnd: string } | null;
  features: FeatureUsage[];
  addOns: ActiveAddOn[];
  availableAddOns: AddOnOption[];
  canPurchaseAddOns: boolean;
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

function WorkspacePlanContent() {
  const searchParams = useSearchParams();
  const purchaseSuccess =
    searchParams?.get("checkout") === "success" ||
    searchParams?.get("addon") === "success";

  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingAddOn, setPendingAddOn] = useState<string | null>(null);
  const [addOnError, setAddOnError] = useState<string | null>(null);
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
    if (purchaseSuccess) {
      setSuccessBanner(true);
      void load();
      window.history.replaceState({}, "", "/workspace/plan");
    }
  }, [purchaseSuccess, load]);

  const sub = data?.subscription;
  const activeByType = new Map((data?.addOns ?? []).map((a) => [a.type, a]));

  async function handleBuyAddOn(addOn: string) {
    setPendingAddOn(addOn);
    setAddOnError(null);
    try {
      const res = await fetch("/api/subscription/addons/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ addOn }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.checkoutUrl) {
        setAddOnError(json.error ?? "Could not start checkout");
        return;
      }
      window.location.href = json.checkoutUrl as string;
    } catch {
      setAddOnError("Could not start checkout");
    } finally {
      setPendingAddOn(null);
    }
  }

  async function handleCancelAddOn(addOn: string) {
    setPendingAddOn(addOn);
    setAddOnError(null);
    try {
      const res = await fetch("/api/subscription/addons/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ addOn }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAddOnError(json.error ?? "Could not cancel add-on");
        return;
      }
      await load();
    } catch {
      setAddOnError("Could not cancel add-on");
    } finally {
      setPendingAddOn(null);
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
            Your subscription, feature quotas, and any extra usage you&apos;ve added.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)] px-4 py-2 text-sm font-medium text-foreground hover:bg-[var(--glass)] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {successBanner ? (
        <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
          Payment received. Your workspace has been updated.
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

      {!loading && data && !sub ? (
        <div className="rounded-xl border border-dashed border-[var(--glass-border)] bg-[var(--glass)] p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No subscription found for this workspace. Redeem your code to activate a plan.
          </p>
        </div>
      ) : null}

      {sub && data ? (
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
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusStyles(sub.status)}`}
              >
                {sub.status.replace(/_/g, " ")}
              </span>
            </div>

            {data.usage && sub.plan && !isDealifyPlan(sub.plan) ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Billing period:{" "}
                <span className="text-foreground font-medium">
                  {formatPeriodDate(data.usage.periodStart)} –{" "}
                  {formatPeriodDate(data.usage.periodEnd)}
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
            <h3 className="text-sm font-semibold text-foreground mb-1">Extra usage</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {data.canPurchaseAddOns
                ? "Add-ons stack on top of your plan and are billed monthly. Cancel any time."
                : "Add-ons are available once you activate a plan with your code."}
            </p>

            {addOnError ? (
              <p className="mb-4 text-sm text-destructive">{addOnError}</p>
            ) : null}

            {data.availableAddOns.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {data.availableAddOns.map((option) => {
                  const active = activeByType.get(option.id);
                  const busy = pendingAddOn === option.id;
                  const canBuyMore = !active || option.stackable;

                  return (
                    <div
                      key={option.id}
                      className={`rounded-xl border p-4 ${
                        active
                          ? "border-[var(--sibling-primary)] bg-[var(--sibling-primary)]/8 ring-1 ring-[var(--sibling-primary)]/30"
                          : "border-[var(--glass-border)] bg-[var(--glass-hover)]"
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold text-foreground">{option.name}</span>
                        <span className="text-sm font-medium text-[var(--sibling-primary)]">
                          {option.priceLabel}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {option.description}
                      </p>

                      {active ? (
                        <span className="mt-3 inline-block text-[10px] font-bold uppercase tracking-wider text-[var(--sibling-primary)]">
                          Active{active.quantity > 1 ? ` · ×${active.quantity}` : ""}
                        </span>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {canBuyMore ? (
                          <button
                            type="button"
                            onClick={() => void handleBuyAddOn(option.id)}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--sibling-primary)] px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {busy ? "Redirecting…" : active ? "Add another" : "Add"}
                          </button>
                        ) : null}
                        {active ? (
                          <button
                            type="button"
                            onClick={() => void handleCancelAddOn(option.id)}
                            disabled={busy}
                            className="rounded-lg border border-[var(--glass-border)] px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No add-ons are available on your current plan.
              </p>
            )}
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
