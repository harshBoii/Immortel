"use client";

import { useCallback, useMemo, useState } from "react";
import { minimalMarkdownToHtml } from "@/lib/markdown/minimalMarkdownToHtml";
import { RevenueChip } from "@/app/components/geo/revenue-chip";
import { ViewMoreDropdown } from "@/app/components/common/UI/ViewMoreDropdown";
import { focusRankingForPrompt } from "@/lib/geo/geoknight/buildRivalAnalyzeMicroPayload";

type RivalConsensus = {
  companyName: string;
  avgRank: number | null;
  mentions: number;
};

type RivalByModel = {
  model: string;
  companyName: string;
  rank: number | null;
};

export type PromptRevenueView = {
  estimatedRevenue: number | null;
  monthlyPromptReach: number | null;
  visibilityWeight: number | null;
  ctr: number | null;
  cvr: number | null;
  aov: number | null;
} | null;

export type PromptView = {
  id: string;
  query: string;
  reason: string | null;
  /** ISO timestamp for client-side sort (recent prompts first, etc.) */
  createdAt: string;
  /** True after a bounty AEO page was created via Get Cited for this prompt. */
  ishunted: boolean;
  revenue: PromptRevenueView;
  consensus: RivalConsensus[];
  byModel: RivalByModel[];
};

export type TopicView = {
  id: string;
  name: string;
  reason: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  /** ISO timestamp for client-side sort (recent topics first, etc.) */
  createdAt: string;
  prompts: PromptView[];
};

export type RivalCompanyView = {
  id: string;
  name: string;
  domain: string | null;
  website: string | null;
};

function rankText(rank: number | null) {
  return rank == null ? "—" : `#${Math.round(rank * 10) / 10}`;
}

type SortMode = "recentTopics" | "mostPrompts" | "fewestPrompts" | "name";
type DifficultyFilter = "ALL" | "EASY" | "MEDIUM" | "HARD";
type PromptSortMode = "recentFirst" | "oldestFirst" | "queryAz";

function sortPromptsForDisplay(prompts: PromptView[], mode: PromptSortMode): PromptView[] {
  const copy = [...prompts];
  if (mode === "recentFirst") {
    copy.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } else if (mode === "oldestFirst") {
    copy.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  } else {
    copy.sort((a, b) => a.query.localeCompare(b.query));
  }
  return copy;
}

function namesMatchNeedle(name: string, needle: string) {
  return name.trim().toLowerCase() === needle.trim().toLowerCase();
}

function cleanCompanyNameForMatch(input: string): string {
  const raw = (input ?? "").trim();
  if (!raw) return "";

  // If this looks like a URL, use hostname.
  let s = raw;
  try {
    const url = raw.includes("://") ? new URL(raw) : null;
    if (url?.hostname) s = url.hostname;
  } catch {
    // ignore
  }

  s = s.trim().toLowerCase();
  if (s.startsWith("www.")) s = s.slice(4);

  // If it's domain-like (no spaces) strip common TLDs (one pass).
  const looksLikeDomain = !/\s/.test(s) && s.includes(".");
  if (looksLikeDomain) {
    // remove trailing dot(s)
    s = s.replace(/\.+$/, "");
    const parts = s.split(".");
    if (parts.length >= 2) {
      const tld = parts[parts.length - 1]!;
      const commonTlds = new Set([
        "com",
        "io",
        "ai",
        "net",
        "org",
        "co",
        "app",
        "dev",
        "xyz",
      ]);
      if (commonTlds.has(tld)) {
        parts.pop();
        s = parts.join(".");
      }
    }
  }

  // Keep a friendly title-ish string for labels (but regex matching uses this exact output).
  return s.trim();
}

function cleanCompanyNameForLabel(input: string): string {
  const c = cleanCompanyNameForMatch(input);
  if (!c) return "";
  // For labels, show in a nicer way (capitalize first char only).
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function uniqueCompanyNamesForPrompt(prompt: PromptView): string[] {
  const names = new Set<string>();
  for (const c of prompt.consensus ?? []) {
    const n = c.companyName?.trim();
    if (n) names.add(n);
  }
  for (const c of prompt.byModel ?? []) {
    const n = c.companyName?.trim();
    if (n) names.add(n);
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b));
}

function uniqueCompanyNamesForTopic(topic: TopicView): string[] {
  const names = new Set<string>();
  for (const p of topic.prompts ?? []) {
    for (const n of uniqueCompanyNamesForPrompt(p)) names.add(n);
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b));
}

function isCompanyRankedSomewhereForPrompt(prompt: PromptView, companyNeedle: string) {
  const cNeedle = companyNeedle.trim().toLowerCase();
  if (!cNeedle) return false;

  const inConsensus = (prompt.consensus ?? []).some((c) => {
    const n = c.companyName?.trim().toLowerCase();
    return n === cNeedle && c.avgRank != null;
  });

  const inByModel = (prompt.byModel ?? []).some((c) => {
    const n = c.companyName?.trim().toLowerCase();
    return n === cNeedle && c.rank != null;
  });

  return inConsensus || inByModel;
}

/** Company appears in consensus/model rows (any rank). */
function isCompanyNamedInPrompt(prompt: PromptView, name: string) {
  const needle = name.trim().toLowerCase();
  if (!needle) return false;
  const inConsensus = (prompt.consensus ?? []).some(
    (c) => c.companyName?.trim().toLowerCase() === needle
  );
  const inByModel = (prompt.byModel ?? []).some(
    (c) => c.companyName?.trim().toLowerCase() === needle
  );
  return inConsensus || inByModel;
}

type ShowFocusValue = "all" | "self" | `rival:${string}`;

function parseShowFocus(raw: string): ShowFocusValue {
  if (raw === "all" || raw === "self") return raw;
  if (raw.startsWith("rival:")) return raw as ShowFocusValue;
  return "all";
}

function compileCompanyNameRegex(pattern: string): RegExp | null {
  const p = pattern.trim();
  if (!p) return null;
  try {
    return new RegExp(p, "i");
  } catch {
    return null;
  }
}

function escapeRegExpLiteral(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Topics + consensus for /api/geo/geoknight/rival-insight (server builds micro payload). */
function buildInsightTopics(topics: TopicView[]) {
  return topics.map((t) => ({
    name: t.name,
    prompts: t.prompts.map((p) => ({
      query: p.query,
      consensus: p.consensus ?? [],
      byModel: p.byModel ?? [],
    })),
  }));
}

/** One row per company: best (lowest) consensus rank, mentions summed. */
function mergeConsensusRowsBestRank(rows: RivalConsensus[]) {
  const map = new Map<string, { bestRank: number | null; mentions: number }>();
  for (const c of rows) {
    const cur = map.get(c.companyName) ?? { bestRank: null as number | null, mentions: 0 };
    cur.mentions += c.mentions;
    if (c.avgRank != null && !Number.isNaN(c.avgRank)) {
      cur.bestRank =
        cur.bestRank == null ? c.avgRank : Math.min(cur.bestRank, c.avgRank);
    }
    map.set(c.companyName, cur);
  }
  const out: Array<{ companyName: string; bestRank: number | null; mentions: number }> = [];
  for (const [companyName, { bestRank, mentions }] of map) {
    out.push({ companyName, bestRank, mentions });
  }
  out.sort((a, b) => a.companyName.localeCompare(b.companyName));
  return out;
}

/** Collapse duplicate model+company keys to a single best (lowest) rank. */
function mergeByModelRowsBestRank(rows: RivalByModel[]) {
  const map = new Map<
    string,
    { bestRank: number | null; model: string; companyName: string }
  >();
  for (const c of rows) {
    const key = `${c.model}\0${c.companyName}`;
    const cur =
      map.get(key) ?? {
        bestRank: null as number | null,
        model: c.model,
        companyName: c.companyName,
      };
    if (c.rank != null && !Number.isNaN(c.rank)) {
      cur.bestRank =
        cur.bestRank == null ? c.rank : Math.min(cur.bestRank, c.rank);
    }
    map.set(key, cur);
  }
  const out: RivalByModel[] = [];
  for (const { bestRank, model, companyName } of map.values()) {
    out.push({
      model,
      companyName,
      rank: bestRank,
    });
  }
  out.sort((a, b) => a.model.localeCompare(b.model) || a.companyName.localeCompare(b.companyName));
  return out;
}

export default function GeoKnightClient({
  topics,
  companyName,
  rivals,
}: {
  topics: TopicView[];
  companyName: string | null;
  rivals: RivalCompanyView[];
}) {
  const [sortMode, setSortMode] = useState<SortMode>("mostPrompts");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("ALL");
  const [showFocus, setShowFocus] = useState<string>("all");
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [selectedRivalId, setSelectedRivalId] = useState<string>("");
  const [analyzeMode, setAnalyzeMode] = useState<"rival" | "ours">("rival");
  const [analyzeStep, setAnalyzeStep] = useState<"idle" | "seeding" | "radar" | "done" | "error">("idle");
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [rivalRadarPayload, setRivalRadarPayload] = useState<any>(null);
  const [showAllTopicCompanies, setShowAllTopicCompanies] = useState<
    Record<string, boolean>
  >({});
  const [showAllPromptCompanies, setShowAllPromptCompanies] = useState<
    Record<string, boolean>
  >({});
  /** Per-topic prompt order (default: recent first). */
  const [promptSortByTopicId, setPromptSortByTopicId] = useState<
    Record<string, PromptSortMode>
  >({});
  const [simOpen, setSimOpen] = useState(false);
  const [simPrompt, setSimPrompt] = useState<{ id: string; query: string } | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  const [simExecs, setSimExecs] = useState<
    Array<{ id: string; model: string; executedAt: string; response: string }>
  >([]);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [insightMessage, setInsightMessage] = useState<string | null>(null);

  async function openSimulation(prompt: { id: string; query: string }) {
    setSimOpen(true);
    setSimPrompt(prompt);
    setSimError(null);
    setSimExecs([]);
    setSimLoading(true);
    try {
      const res = await fetch(`/api/geo/geoknight/simulate?promptId=${encodeURIComponent(prompt.id)}`, {
        method: "GET",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setSimError(data?.error ?? "Failed to load simulation response");
        return;
      }
      setSimExecs(Array.isArray(data.executions) ? data.executions : []);
    } catch (e) {
      setSimError("Network error while loading responses.");
    } finally {
      setSimLoading(false);
    }
  }

  const showFocusParsed = useMemo(() => parseShowFocus(showFocus), [showFocus]);

  const showFocusLabel = useMemo(() => {
    if (showFocus === "all") return "All prompts";
    if (showFocus === "self") return companyName?.trim() ?? "Your company";
    if (showFocus.startsWith("rival:")) {
      const id = showFocus.slice("rival:".length);
      const raw = rivals.find((r) => r.id === id)?.name?.trim() ?? "";
      return cleanCompanyNameForLabel(raw) || raw || "Rival";
    }
    return "All prompts";
  }, [showFocus, companyName, rivals]);

  const rivalNameForFocus = useMemo(() => {
    if (showFocusParsed.startsWith("rival:")) {
      const id = showFocusParsed.slice("rival:".length);
      const raw = rivals.find((r) => r.id === id)?.name?.trim() ?? "";
      return cleanCompanyNameForMatch(raw);
    }
    return "";
  }, [showFocusParsed, rivals]);

  const focusNameRegex = useMemo(() => {
    if (showFocusParsed === "self") {
      const name = cleanCompanyNameForMatch(companyName?.trim() ?? "");
      return name ? compileCompanyNameRegex(escapeRegExpLiteral(name)) : null;
    }
    if (showFocusParsed.startsWith("rival:")) {
      const name = rivalNameForFocus.trim();
      return name ? compileCompanyNameRegex(escapeRegExpLiteral(name)) : null;
    }
    return null;
  }, [showFocusParsed, companyName, rivalNameForFocus]);

  const filteredTopics = useMemo(() => {
    let rows = topics.filter((t) =>
      difficulty === "ALL" ? true : t.difficulty === difficulty
    );

    rows = rows
      .map((t) => {
        let prompts = t.prompts;

        if (focusNameRegex) {
          prompts = prompts.filter((p) => {
            const names = uniqueCompanyNamesForPrompt(p).map(cleanCompanyNameForMatch).filter(Boolean);
            return names.some((n) => focusNameRegex.test(n));
          });
        }

        if (prompts.length === 0) return null;
        return { ...t, prompts };
      })
      .filter((t): t is TopicView => t != null);

    const clone = [...rows];
    if (sortMode === "recentTopics") {
      clone.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (sortMode === "name") {
      clone.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === "fewestPrompts") {
      clone.sort((a, b) => a.prompts.length - b.prompts.length);
    } else {
      clone.sort((a, b) => b.prompts.length - a.prompts.length);
    }
    return clone;
  }, [
    topics,
    companyName,
    showFocusParsed,
    rivalNameForFocus,
    focusNameRegex,
    sortMode,
    difficulty,
  ]);

  const filterChipsForFocus = useMemo(() => {
    if (focusNameRegex) {
      return (names: string[]) => names.filter((n) => focusNameRegex.test(n));
    }
    return (names: string[]) => names;
  }, [focusNameRegex]);

  const filterTableRowsForFocus = useMemo(() => {
    if (focusNameRegex) {
      return (rowName: string) => focusNameRegex.test(rowName);
    }
    return () => true;
  }, [focusNameRegex]);

  let promptCount = 0;
  for (const t of filteredTopics) {
    promptCount += t.prompts.length;
  }

  const sendRivalInsight = useCallback(async () => {
    const parsed = parseShowFocus(showFocus);
    if (parsed === "all" || promptCount === 0) return;
    setInsightLoading(true);
    setInsightError(null);
    setInsightMessage(null);
    try {
      const topicsPayload = buildInsightTopics(filteredTopics);
      const focus =
        parsed === "self"
          ? {
              kind: "self" as const,
              displayName: companyName?.trim() ?? "",
            }
          : {
              kind: "rival" as const,
              rivalCompanyId: parsed.slice("rival:".length),
              displayName:
                cleanCompanyNameForLabel(
                  rivals.find((r) => r.id === parsed.slice("rival:".length))?.name ?? ""
                ) ||
                rivals.find((r) => r.id === parsed.slice("rival:".length))?.name ||
                "",
            };

      const res = await fetch("/api/geo/geoknight/rival-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ focus, topics: topicsPayload }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setInsightError(
          typeof data?.error === "string"
            ? data.error
            : data?.details
              ? `${data.error ?? "Get insight failed."}: ${data.details}`
              : data?.error ?? "Get insight failed."
        );
        return;
      }
      setInsightMessage("Insight request completed.");
    } catch {
      setInsightError("Network error while sending insight.");
    } finally {
      setInsightLoading(false);
    }
  }, [showFocus, promptCount, filteredTopics, companyName, rivals]);

  async function runAnalyzeRival() {
    if (!selectedRivalId) return;
    setAnalyzeError(null);
    setRivalRadarPayload(null);
    setAnalyzeStep("seeding");
    try {
      const res = await fetch("/api/geo/geoknight/analyze-rival", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rivalCompanyId: selectedRivalId, mode: analyzeMode }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setAnalyzeStep("error");
        setAnalyzeError(data?.error ?? "Analyze rival failed.");
        return;
      }
      setAnalyzeStep("radar");
      const r2 = await fetch(`/api/geo/geoknight/rival-radar?companyId=${encodeURIComponent(selectedRivalId)}`, {
        method: "GET",
        credentials: "include",
      });
      const d2 = await r2.json().catch(() => null);
      if (!r2.ok || !d2?.success) {
        setAnalyzeStep("error");
        setAnalyzeError(d2?.error ?? "Failed to load rival radar results.");
        return;
      }
      setRivalRadarPayload(d2.payload ?? null);
      setAnalyzeStep("done");
    } catch (e) {
      setAnalyzeStep("error");
      setAnalyzeError("Network error while analyzing rival.");
    }
  }

  return (
    <div className="max-w-6xl mx-auto min-h-[60vh] px-6 pb-6 pt-2 space-y-6">
      <section className="rounded-2xl border border-[var(--glass-border)] bg-gradient-to-br from-[var(--glass)] to-[var(--glass)]/60 p-6 shadow-sm">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--sibling-accent)] font-semibold">
          Command Deck
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground tracking-tight">
          GeoKnight
        </h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-3xl">
          Strategic watchtower for topic battles. Expand fronts, inspect prompt battle
          briefs, and track rival rank formations by consensus and by model.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-[var(--glass-border)] px-3 py-1 text-muted-foreground">
            {filteredTopics.length} fronts
          </span>
          <span className="rounded-full border border-[var(--glass-border)] px-3 py-1 text-muted-foreground">
            {promptCount} prompts tracked
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setAnalyzeOpen(true);
              if (!selectedRivalId && rivals.length > 0) setSelectedRivalId(rivals[0]!.id);
              setAnalyzeStep("idle");
              setAnalyzeError(null);
              setRivalRadarPayload(null);
            }}
            disabled={!rivals || rivals.length === 0}
            className="glass-card card-anime-float rounded-xl px-3 py-2 text-xs font-semibold text-foreground hover:border-[var(--sibling-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Analyze rival
          </button>
          <p className="text-[11px] text-muted-foreground self-center">
            Runs seed → radar and persists results for the selected rival.
          </p>
        </div>
      </section>

      <section className="glass-card rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as DifficultyFilter)}
          className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/70 px-3 py-2 text-sm outline-none focus:border-[var(--sibling-primary)]"
        >
          <option value="ALL">All difficulty levels</option>
          <option value="EASY">Easy only</option>
          <option value="MEDIUM">Medium only</option>
          <option value="HARD">Hard only</option>
        </select>
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/70 px-3 py-2 text-sm outline-none focus:border-[var(--sibling-primary)]"
        >
          <option value="recentTopics">Sort: Recent topics first</option>
          <option value="mostPrompts">Sort: Most prompts first</option>
          <option value="fewestPrompts">Sort: Fewest prompts first</option>
          <option value="name">Sort: Topic name A-Z</option>
        </select>

        <div className="flex flex-col gap-1 text-xs text-muted-foreground min-w-0 md:col-span-1">
          <span className="font-medium text-foreground">Show</span>
          <div className="flex flex-wrap items-stretch gap-2">
            <div className="flex max-w-[11rem] min-w-0 items-stretch gap-1.5 shrink-0">
              <ViewMoreDropdown tooltipContent="Filter by company or rival" align="right">
                {(close) => (
                  <div className="py-1 max-h-[280px] overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setShowFocus("all");
                        setInsightError(null);
                        setInsightMessage(null);
                        close();
                      }}
                      className={`w-full px-3 py-2 text-left text-xs ${
                        showFocus === "all"
                          ? "text-primary font-medium bg-primary/10"
                          : "text-foreground hover:bg-[var(--glass-hover)]"
                      }`}
                    >
                      All prompts
                    </button>
                    {companyName?.trim() ? (
                      <button
                        type="button"
                        onClick={() => {
                          setShowFocus("self");
                          setInsightError(null);
                          setInsightMessage(null);
                          close();
                        }}
                        className={`w-full px-3 py-2 text-left text-xs ${
                          showFocus === "self"
                            ? "text-primary font-medium bg-primary/10"
                            : "text-foreground hover:bg-[var(--glass-hover)]"
                        }`}
                      >
                        {companyName.trim()}
                      </button>
                    ) : null}
                    {rivals.map((r) => {
                      const val = `rival:${r.id}`;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            setShowFocus(val);
                            setInsightError(null);
                            setInsightMessage(null);
                            close();
                          }}
                          className={`w-full px-3 py-2 text-left text-xs ${
                            showFocus === val
                              ? "text-primary font-medium bg-primary/10"
                              : "text-foreground hover:bg-[var(--glass-hover)]"
                          }`}
                        >
                          {cleanCompanyNameForLabel(r.name) || r.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </ViewMoreDropdown>
              <div
                className="min-w-0 flex-1 truncate rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/70 px-2.5 py-2 text-xs text-foreground"
                title={showFocusLabel}
              >
                {showFocusLabel}
              </div>
            </div>
            {showFocus !== "all" ? (
              <button
                type="button"
                onClick={() => void sendRivalInsight()}
                disabled={insightLoading || promptCount === 0}
                className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/90 px-3 py-2 text-sm font-semibold text-foreground outline-none hover:border-[var(--sibling-primary)] hover:bg-[var(--glass-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {insightLoading ? "Sending…" : "Get insight"}
              </button>
            ) : null}
          </div>
          <span className="text-[11px] text-muted-foreground">
            Filters by matching the selected name against detected company names.
          </span>
          {insightError ? (
            <p className="text-[11px] text-destructive">{insightError}</p>
          ) : null}
          {insightMessage ? (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">{insightMessage}</p>
          ) : null}
        </div>
      </section>

      {filteredTopics.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--glass-border)] bg-[var(--glass)] p-6 text-sm text-muted-foreground">
          No fronts match your filters.
        </div>
      ) : (
        <section className="space-y-3">
          {filteredTopics.map((topic) => (
            <details
              key={topic.id}
              className="glass-card card-anime-float rounded-xl border border-[var(--glass-border)]"
            >
              <summary className="cursor-pointer list-none px-5 py-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {topic.name}
                  </p>
                  <div className="mt-1 inline-flex items-center gap-2">
                    <span className="text-[11px] rounded-full border border-[var(--glass-border)] px-2 py-0.5 text-muted-foreground">
                      {topic.difficulty}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {topic.prompts.length} prompts
                    </span>
                  </div>
                  {(() => {
                    const topicCompanies = uniqueCompanyNamesForTopic(topic);
                    const finalTopicCompanies = filterChipsForFocus(topicCompanies);
                    if (finalTopicCompanies.length === 0) return null;
                    const showAll = showAllTopicCompanies[topic.id] ?? false;
                    const visibleCompanies = showAll
                      ? finalTopicCompanies
                      : finalTopicCompanies.slice(0, 18);
                    return (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {visibleCompanies.map((name) => (
                          <span
                            key={name}
                            className="text-[11px] rounded-full border border-[color-mix(in_oklch,var(--glass-border)_80%,var(--destructive)_20%)] bg-[color-mix(in_oklch,var(--glass)_88%,var(--destructive)_12%)] px-2.5 py-0.5 text-foreground/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_10px_rgba(0,0,0,0.18)] backdrop-blur-md"
                            title={name}
                          >
                            {name}
                          </span>
                        ))}
                        {finalTopicCompanies.length > 18 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setShowAllTopicCompanies((prev) => ({
                                ...prev,
                                [topic.id]: !showAll,
                              }))
                            }
                            className="text-[11px] rounded-full border border-[color-mix(in_oklch,var(--destructive)_38%,transparent)] bg-[color-mix(in_oklch,var(--destructive)_16%,transparent)] px-2.5 py-0.5 text-[var(--sibling-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md hover:opacity-90 transition-opacity"
                          >
                            {showAll ? "Less" : `+.. more`}
                          </button>
                        ) : null}
                      </div>
                    );
                  })()}
                </div>
                <span className="text-xs rounded-full bg-[var(--sibling-primary)]/15 text-[var(--sibling-primary)] px-2 py-1 shrink-0">
                  Open Front
                </span>
              </summary>

              <div className="px-5 pb-5 space-y-3">
                <div className="rounded-md border-l-2 border-[var(--sibling-primary)] bg-[var(--glass)]/45 px-3 py-2">
                  <p className="text-[11px] font-semibold text-[var(--sibling-accent)] uppercase tracking-wide">
                    Topic Brief
                  </p>
                  <p className="mt-1 text-xs text-foreground/90">
                    {topic.reason || "No topic reason available."}
                  </p>
                </div>

                {topic.prompts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No prompts linked to this topic.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/40 px-3 py-2">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        Prompts in this topic
                      </span>
                      <select
                        value={promptSortByTopicId[topic.id] ?? "recentFirst"}
                        onChange={(e) =>
                          setPromptSortByTopicId((prev) => ({
                            ...prev,
                            [topic.id]: e.target.value as PromptSortMode,
                          }))
                        }
                        className="rounded-md border border-[var(--glass-border)] bg-[var(--glass)]/70 px-2 py-1.5 text-[11px] outline-none focus:border-[var(--sibling-primary)]"
                        aria-label={`Sort prompts for ${topic.name}`}
                      >
                        <option value="recentFirst">Recent prompts first</option>
                        <option value="oldestFirst">Oldest prompts first</option>
                        <option value="queryAz">Prompt text A–Z</option>
                      </select>
                    </div>
                    {sortPromptsForDisplay(
                      topic.prompts,
                      promptSortByTopicId[topic.id] ?? "recentFirst"
                    ).map((prompt) => (
                    <div
                      key={prompt.id}
                      className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/55 p-4 space-y-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium text-foreground">
                                {prompt.query}
                              </p>
                              {prompt.revenue?.estimatedRevenue != null &&
                              Number.isFinite(prompt.revenue.estimatedRevenue) ? (
                                <RevenueChip
                                  amount={prompt.revenue.estimatedRevenue}
                                  tooltipTitle="Prompt revenue estimate"
                                  tooltipLines={[
                                    "From radar / bounty microservice revenue model.",
                                  ]}
                                  breakdown={{
                                    monthlyPromptReach: prompt.revenue.monthlyPromptReach,
                                    visibilityWeight: prompt.revenue.visibilityWeight,
                                    ctr: prompt.revenue.ctr,
                                    cvr: prompt.revenue.cvr,
                                    aov: prompt.revenue.aov,
                                  }}
                                  size="sm"
                                />
                              ) : null}
                            </div>
                            {(() => {
                              const companies = filterChipsForFocus(uniqueCompanyNamesForPrompt(prompt));
                              if (companies.length === 0) return null;
                              const showAllCompanies = showAllPromptCompanies[prompt.id] ?? false;
                              const visibleCompanies = showAllCompanies
                                ? companies
                                : companies.slice(0, 14);
                              return (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {visibleCompanies.map((name) => (
                                    <span
                                      key={name}
                                      className="text-[11px] rounded-full border border-[color-mix(in_oklch,var(--glass-border)_80%,var(--destructive)_20%)] bg-[color-mix(in_oklch,var(--glass)_88%,var(--destructive)_12%)] px-2.5 py-0.5 text-foreground/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_10px_rgba(0,0,0,0.18)] backdrop-blur-md"
                                      title={name}
                                    >
                                      {name}
                                    </span>
                                  ))}
                                  {companies.length > 14 ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setShowAllPromptCompanies((prev) => ({
                                          ...prev,
                                          [prompt.id]: !showAllCompanies,
                                        }))
                                      }
                                      className="text-[11px] rounded-full border border-[color-mix(in_oklch,var(--destructive)_38%,transparent)] bg-[color-mix(in_oklch,var(--destructive)_16%,transparent)] px-2.5 py-0.5 text-[var(--sibling-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md hover:opacity-90 transition-opacity"
                                    >
                                      {showAllCompanies ? "Less" : `+.. more`}
                                    </button>
                                  ) : null}
                                </div>
                              );
                            })()}
                          </div>
                          <button
                            type="button"
                            onClick={() => openSimulation({ id: prompt.id, query: prompt.query })}
                            className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700 shadow-[0_0_0_1px_rgba(120,120,120,0.13)] hover:bg-gray-200 hover:shadow-[0_0_0_2px_rgba(140,140,140,0.18)] active:scale-[0.98] transition-all duration-150"
                          >
                            Simulate response
                          </button>
                        </div>
                        <div className="mt-1 rounded-md border-l-2 border-[var(--sibling-accent)] bg-[var(--glass)]/40 px-2 py-1.5">
                          <p className="text-[11px] font-semibold text-[var(--sibling-accent)] uppercase tracking-wide">
                            Prompt Reason
                          </p>
                          <p className="mt-0.5 text-xs text-foreground/90">
                            {prompt.reason || "No prompt reason available."}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div className="rounded-md border border-[var(--glass-border)] bg-[var(--glass)]/45 p-3">
                          <p className="text-xs font-semibold text-foreground">
                            Rival Consensus Board
                          </p>
                            {(() => {
                              const rows = mergeConsensusRowsBestRank(
                                (prompt.consensus ?? []).filter((c) =>
                                  filterTableRowsForFocus(c.companyName)
                                )
                              );
                              if (rows.length === 0) {
                                return (
                                  <p className="mt-2 text-xs text-muted-foreground">
                                    No consensus rivals available.
                                  </p>
                                );
                              }
                              return (
                                <div className="mt-2 overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-[var(--glass-border)]/60">
                                        <th className="text-left py-1.5">Company</th>
                                        <th className="text-right py-1.5">Best rank</th>
                                        <th className="text-right py-1.5">Mentions</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {rows.map((c, idx) => (
                                        <tr
                                          key={`${c.companyName}-${idx}`}
                                          className="border-b border-[var(--glass-border)]/30"
                                        >
                                          <td className="py-1.5">{c.companyName}</td>
                                          <td className="py-1.5 text-right tabular-nums">
                                            {rankText(c.bestRank)}
                                          </td>
                                          <td className="py-1.5 text-right tabular-nums">
                                            {c.mentions}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              );
                            })()}
                        </div>

                        <div className="rounded-md border border-[var(--glass-border)] bg-[var(--glass)]/45 p-3">
                          <p className="text-xs font-semibold text-foreground">
                            Model Duel Board
                          </p>
                          {(() => {
                            const rows = mergeByModelRowsBestRank(
                              (prompt.byModel ?? []).filter((c) =>
                                filterTableRowsForFocus(c.companyName)
                              )
                            );
                            if (rows.length === 0) {
                              return (
                                <p className="mt-2 text-xs text-muted-foreground">
                                  No model-specific rivals available.
                                </p>
                              );
                            }
                            return (
                              <div className="mt-2 overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-[var(--glass-border)]/60">
                                      <th className="text-left py-1.5">Model</th>
                                      <th className="text-left py-1.5">Company</th>
                                      <th className="text-right py-1.5">Best rank</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {rows.map((c, idx) => (
                                      <tr
                                        key={`${c.model}-${c.companyName}-${idx}`}
                                        className="border-b border-[var(--glass-border)]/30"
                                      >
                                        <td className="py-1.5">{c.model}</td>
                                        <td className="py-1.5">{c.companyName}</td>
                                        <td className="py-1.5 text-right tabular-nums">
                                          {rankText(c.rank)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    ))}
                  </>
                )}
              </div>
            </details>
          ))}
        </section>
      )}

      {simOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/75"
            onClick={() => setSimOpen(false)}
            aria-hidden
          />
          <div className="relative w-full max-w-3xl rounded-2xl border border-[var(--glass-border)] bg-white/49 backdrop-blur-lg p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--sibling-accent)] font-semibold">
                  Simulation Chamber
                </p>
                <h2 className="mt-2 text-lg font-semibold text-foreground truncate">
                  {simPrompt?.query ?? "Prompt response"}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Latest stored model outputs for this prompt.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSimOpen(false)}
                className="rounded-md border border-[var(--glass-border)] bg-[var(--glass)]/70 px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-[var(--glass-hover)]"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {simLoading ? (
                <p className="text-xs text-muted-foreground">Loading responses…</p>
              ) : simError ? (
                <p className="text-xs text-destructive">{simError}</p>
              ) : simExecs.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No stored responses yet for this prompt. Run a radar refresh to populate raw responses.
                </p>
              ) : (
                <div className="space-y-2 max-h-[55vh] overflow-y-auto glass-scrollbar pr-1">
                  {simExecs.map((e) => (
                    <div
                      key={e.id}
                      className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/55 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-foreground">{e.model}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(e.executedAt).toLocaleString()}
                        </p>
                      </div>
                      <div
                        className="mt-2 text-xs text-foreground/90 leading-relaxed space-y-2 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:border [&_code]:border-[var(--glass-border)] [&_code]:bg-[var(--glass)]/70"
                        dangerouslySetInnerHTML={{
                          __html: minimalMarkdownToHtml(e.response || "—"),
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {analyzeOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/75"
            onClick={() => setAnalyzeOpen(false)}
            aria-hidden
          />
          <div className="relative w-full max-w-3xl rounded-2xl border border-[var(--glass-border)] bg-white/49 backdrop-blur-lg p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--sibling-accent)] font-semibold">
                  Rival Analysis
                </p>
                <h2 className="mt-2 text-lg font-semibold text-foreground truncate">
                  Analyze a rival (seed → radar)
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Step 1 enriches the rival profile. Step 2 runs radar and saves results under the rival company.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAnalyzeOpen(false)}
                className="rounded-md border border-[var(--glass-border)] bg-[var(--glass)]/70 px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-[var(--glass-hover)]"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-muted-foreground">Rival</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Which competitor to seed + run radar for.
                    </p>
                  </div>
                  <ViewMoreDropdown tooltipContent="Pick rival" align="right">
                    {(close) => (
                      <div className="py-1">
                        {rivals.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              setSelectedRivalId(r.id);
                              close();
                            }}
                            className="w-full px-3 py-2 text-left text-xs text-foreground hover:bg-[var(--glass-hover)]"
                          >
                            {r.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </ViewMoreDropdown>
                </div>
                <div className="mt-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/70 px-3 py-2 text-sm">
                  {rivals.find((r) => r.id === selectedRivalId)?.name ?? "Select a rival"}
                </div>
              </div>
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-muted-foreground">Mode</p>
                  </div>
                  <ViewMoreDropdown tooltipContent="Pick mode" align="right">
                    {(close) => (
                      <div className="py-1">
                        {[
                          { id: "rival" as const, label: "Rival’s own space", desc: "Use their BrandEntity inputs" },
                          { id: "ours" as const, label: "Our battlefield", desc: "Use our BrandEntity inputs" },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setAnalyzeMode(opt.id);
                              close();
                            }}
                            className="w-full px-3 py-2 text-left"
                          >
                            <p className="text-xs font-semibold text-foreground">{opt.label}</p>
                            <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </ViewMoreDropdown>
                </div>
                <div className="mt-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/70 px-3 py-2 text-sm">
                  {analyzeMode === "rival" ? "Rival’s own space" : "Our battlefield"}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                Status:{" "}
                <span className="font-semibold text-foreground">
                  {analyzeStep === "idle"
                    ? "Ready"
                    : analyzeStep === "seeding"
                    ? "Seeding rival…"
                    : analyzeStep === "radar"
                    ? "Running radar…"
                    : analyzeStep === "done"
                    ? "Done"
                    : "Error"}
                </span>
              </div>
              <button
                type="button"
                onClick={runAnalyzeRival}
                disabled={!selectedRivalId || analyzeStep === "seeding" || analyzeStep === "radar"}
                className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/70 px-4 py-2 text-xs font-semibold text-foreground hover:bg-[var(--glass-hover)] hover:border-[var(--sibling-primary)] disabled:opacity-50"
              >
                Run analysis
              </button>
            </div>

            {analyzeError ? (
              <p className="mt-3 text-xs text-destructive">{analyzeError}</p>
            ) : null}

            {analyzeStep === "done" && rivalRadarPayload ? (
              <div className="mt-4 rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/55 p-4">
                <p className="text-xs font-semibold text-foreground">Latest rival radar snapshot</p>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="rounded-md border border-[var(--glass-border)] bg-[var(--glass)]/60 p-2">
                    <p className="text-[11px] text-muted-foreground">Share of voice</p>
                    <p className="font-semibold text-foreground">
                      {rivalRadarPayload?.latest?.shareOfVoice != null
                        ? `${Number(rivalRadarPayload.latest.shareOfVoice).toFixed(1)}%`
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-md border border-[var(--glass-border)] bg-[var(--glass)]/60 p-2">
                    <p className="text-[11px] text-muted-foreground">Top-3 rate</p>
                    <p className="font-semibold text-foreground">
                      {rivalRadarPayload?.latest?.top3Rate != null
                        ? `${Number(rivalRadarPayload.latest.top3Rate).toFixed(0)}%`
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-md border border-[var(--glass-border)] bg-[var(--glass)]/60 p-2">
                    <p className="text-[11px] text-muted-foreground">Query coverage</p>
                    <p className="font-semibold text-foreground">
                      {rivalRadarPayload?.latest?.queryCoverage != null
                        ? `${Number(rivalRadarPayload.latest.queryCoverage).toFixed(1)}%`
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-md border border-[var(--glass-border)] bg-[var(--glass)]/60 p-2">
                    <p className="text-[11px] text-muted-foreground">Competitor rank</p>
                    <p className="font-semibold text-foreground">
                      {rivalRadarPayload?.latest?.competitorRank != null
                        ? `#${Number(rivalRadarPayload.latest.competitorRank).toFixed(1)}`
                        : "—"}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Data comes from persisted radar metrics for the rival companyId.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

