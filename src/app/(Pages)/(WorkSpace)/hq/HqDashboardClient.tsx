"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentProps } from "react";
import HomeDashboard from "@/app/components/home/HomeDashboard";
import HqOrgRadarCharts from "@/app/(Pages)/(WorkSpace)/hq/HqOrgRadarCharts";
import { useCurrentContext } from "@/app/components/common/useCurrentContext";
import LoadingAnimation from "@/app/components/animations/loading";

// ── Types ──────────────────────────────────────────────────────────────────────

type RadarPayload = ComponentProps<typeof HomeDashboard>["payload"];

type HqOverviewJson = {
  success?: boolean;
  payload: React.ComponentProps<typeof HomeDashboard>["payload"];
  geoKnight: React.ComponentProps<typeof HomeDashboard>["geoKnight"];
  rivalsForCharts: React.ComponentProps<typeof HomeDashboard>["rivalsForCharts"];
  sparkSeries: React.ComponentProps<typeof HomeDashboard>["sparkSeries"];
  contextRows: React.ComponentProps<typeof HomeDashboard>["contextRows"];
  highlightPrompts: React.ComponentProps<typeof HomeDashboard>["highlightPrompts"];
  recentCitations: React.ComponentProps<typeof HomeDashboard>["recentCitations"];
  perCompanyRadar?: Array<{
    companyId: string;
    companyName: string;
    sovSeries: RadarPayload["sovSeries"];
    modelBreakdown: RadarPayload["modelBreakdown"];
  }>;
  organizationName?: string;
  companies?: Array<{ id: string; name: string; isOrg: boolean }>;
  allowedCompanyIds?: string[];
  activeCompanyIds?: string[];
};

// ── Loading skeleton ───────────────────────────────────────────────────────────

function HqSkeleton() {
  return (
    <div className="flex flex-col animate-pulse">
      <div className="border-b border-[var(--glass-border)] px-6 py-5 md:px-8 space-y-3">
        <div className="h-3 w-28 rounded-md bg-[var(--glass-border)]/60" />
        <div className="h-6 w-44 rounded-md bg-[var(--glass-border)]/70" />
        <div className="h-3 w-96 rounded-md bg-[var(--glass-border)]/40" />
        <div className="mt-3 h-24 max-w-2xl rounded-xl bg-[var(--glass-border)]/40" />
      </div>
      <div className="p-6 md:p-8 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-[var(--glass-border)]/40" />
          ))}
        </div>
        <div className="h-72 rounded-xl bg-[var(--glass-border)]/30" />
      </div>
    </div>
  );
}

// ── Error state ────────────────────────────────────────────────────────────────

function HqErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" className="text-destructive">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-foreground">Failed to load headquarters</p>
      <p className="text-xs text-muted-foreground max-w-xs">{message}</p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function HqDashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companiesParam = searchParams?.get("companies") ?? null;
  const { company: contextCompany } = useCurrentContext();
  const canSwitchWorkspace = Boolean(contextCompany?.organizationId);

  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    data: HqOverviewJson | null;
  }>({ loading: true, error: null, data: null });

  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    const q = companiesParam ? `?companies=${encodeURIComponent(companiesParam)}` : "";
    fetch(`/api/hq/overview${q}`, { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        if (res.status === 403) { router.replace("/"); return null; }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error ?? "Failed to load HQ overview");
        }
        return res.json() as Promise<HqOverviewJson>;
      })
      .then((data) => {
        if (!cancelled && data) setState({ loading: false, error: null, data });
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setState({
            loading: false,
            error: e instanceof Error ? e.message : "Failed to load",
            data: null,
          });
      });
    return () => { cancelled = true; };
  }, [companiesParam, router]);

  const scopeSelectValue = useMemo(() => {
    const data = state.data;
    if (!data?.allowedCompanyIds?.length) return "all";
    const sortedActive = [...(data.activeCompanyIds ?? [])].sort().join(",");
    const sortedAllowed = [...data.allowedCompanyIds].sort().join(",");
    if (sortedActive === sortedAllowed) return "all";
    const ids = data.activeCompanyIds ?? [];
    if (ids.length === 1) return ids[0]!;
    return "custom";
  }, [state.data]);

  const onScopeChange = (value: string) => {
    if (value === "all") { router.push("/hq"); return; }
    if (value === "custom") return;
    router.push(`/hq?companies=${encodeURIComponent(value)}`);
  };

  const switchToCompanyWorkspace = async (companyId: string) => {
    if (!companyId) return;
    setSwitching(true);
    try {
      const res = await fetch("/api/auth/switch-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ companyId }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        window.location.href =
          typeof body.redirect === "string" ? body.redirect : "/";
      }
    } finally {
      setSwitching(false);
    }
  };

  if (state.loading) return <LoadingAnimation text="Let me get those HQ metrics for you..." />;
  if (state.error || !state.data?.payload) {
    return <HqErrorState message={state.error ?? "Could not load headquarters dashboard."} />;
  }

  const d = state.data;
  const orgLabel = d.organizationName ?? "Organization";
  const perCompanyRadar = d.perCompanyRadar ?? [];
  const showOrgCharts = perCompanyRadar.length > 0;
  const hasCompanies = (d.companies?.length ?? 0) > 0;

  return (
    <div className="flex flex-col min-h-0 gap-5 p-6 md:p-8">

      {/* ── Page header card ───────────────────────────────────────────────
           Matches the same rounded card treatment as every component below  */}
      <div className="glass-card rounded-2xl overflow-hidden">

        {/* Top accent line — same treatment as Data Mine header */}
        <div className="h-[2px] bg-gradient-to-r from-primary/50 via-primary/20 to-transparent" />

        <div className="px-6 py-5">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" className="opacity-40 flex-shrink-0">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="text-muted-foreground/70">Organization</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" className="opacity-25 flex-shrink-0">
              <path d="M9 18l6-6-6-6" />
            </svg>
            <span className="font-medium text-foreground">
              {d.organizationName ?? "HQ"}
            </span>
          </nav>

          {/* Title row + controls */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">

            {/* Title + description */}
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight text-foreground leading-snug">
                Headquarters
              </h1>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm leading-relaxed">
                Combined metrics across your organization. Filter by scope, compare
                radar series, or open a subsidiary workspace.
              </p>
            </div>

            {/* Controls — two compact cards side by side */}
            {hasCompanies && (
              <div className="flex flex-col sm:flex-row gap-3 lg:flex-shrink-0 lg:max-w-md xl:max-w-lg">

                {/* Dashboard Scope */}
                <div className="flex-1 flex flex-col gap-1 rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/50 px-4 py-3 ">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                    Dashboard scope
                  </span>
                  <div className="relative">
                    <select
                      className="w-full appearance-none bg-transparent py-0.5 pr-5 text-sm font-medium text-foreground focus:outline-none cursor-pointer"
                      value={scopeSelectValue}
                      onChange={(e) => onScopeChange(e.target.value)}
                    >
                      <option value="all">All companies — combined</option>
                      {d.companies!.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.isOrg ? " · HQ" : ""}
                        </option>
                      ))}
                      {scopeSelectValue === "custom" && (
                        <option value="custom" disabled>Multiple subsidiaries</option>
                      )}
                    </select>
                    <svg
                      className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground/60"
                      width="13" height="13" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 leading-tight">
                    Filters all cards to one brand or the full org
                  </p>
                </div>

                {/* Open Workspace */}
                <div className="flex-1 flex flex-col gap-1 rounded-xl border border-[var(--sibling-primary)]/20 bg-[var(--sibling-primary)]/5 px-4 py-3 min-w-[180px]">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--sibling-primary)]/60">
                    Open workspace
                  </span>
                  <div className="relative">
                    <select
                      className="w-full appearance-none bg-transparent py-0.5 pr-5 text-sm font-semibold text-[var(--sibling-primary)] focus:outline-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      disabled={switching || !canSwitchWorkspace}
                      value=""
                      onChange={(e) => {
                        const v = e.target.value;
                        e.currentTarget.value = "";
                        if (v) void switchToCompanyWorkspace(v);
                      }}
                    >
                      <option value="">
                        {switching
                          ? "Switching…"
                          : !canSwitchWorkspace
                          ? "Loading…"
                          : "Switch to company workspace…"}
                      </option>
                      {canSwitchWorkspace &&
                        d.companies!.map((c) => (
                          <option key={c.id} value={c.id}>
                            Open {c.name}{c.isOrg ? " (HQ)" : ""}
                          </option>
                        ))}
                    </select>
                    <svg
                      className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[var(--sibling-primary)]/50"
                      width="13" height="13" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 leading-tight">
                    {canSwitchWorkspace
                      ? "Loads that company as your active tenant"
                      : "Loading organization context…"}
                  </p>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col min-h-0 gap-5 p-6 md:p-8 max-w-6xl mx-auto w-full">
        {showOrgCharts && (
          <HqOrgRadarCharts
            organizationLabel={orgLabel}
            aggregate={{
              sovSeries: d.payload.sovSeries,
              modelBreakdown: d.payload.modelBreakdown,
            }}
            companies={perCompanyRadar}
          />
        )}
      </div>
      
      <HomeDashboard
        payload={d.payload}
        geoKnight={d.geoKnight}
        rivalsForCharts={d.rivalsForCharts}
        sparkSeries={d.sparkSeries}
        contextRows={d.contextRows}
        highlightPrompts={d.highlightPrompts}
        recentCitations={d.recentCitations}
        useOrgRadarCharts={showOrgCharts}
      />
    </div>
  );
}
