"use client";

import { useMemo, useState } from "react";
import { minimalMarkdownToHtml } from "@/lib/markdown/minimalMarkdownToHtml";
import { RevenueChip } from "@/app/components/geo/revenue-chip";

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
  revenue: PromptRevenueView;
  consensus: RivalConsensus[];
  byModel: RivalByModel[];
};

export type TopicView = {
  id: string;
  name: string;
  reason: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  prompts: PromptView[];
};

function rankText(rank: number | null) {
  return rank == null ? "—" : `#${Math.round(rank * 10) / 10}`;
}

type SortMode = "mostPrompts" | "fewestPrompts" | "name";
type DifficultyFilter = "ALL" | "EASY" | "MEDIUM" | "HARD";

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

export default function GeoKnightClient({ topics }: { topics: TopicView[] }) {
  const [q, setQ] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("mostPrompts");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("ALL");
  const [simOpen, setSimOpen] = useState(false);
  const [simPrompt, setSimPrompt] = useState<{ id: string; query: string } | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  const [simExecs, setSimExecs] = useState<
    Array<{ id: string; model: string; executedAt: string; response: string }>
  >([]);

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

  const filteredTopics = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let rows = topics.filter((t) =>
      difficulty === "ALL" ? true : t.difficulty === difficulty
    );

    if (needle) {
      rows = rows.filter((t) => {
        if (t.name.toLowerCase().includes(needle)) return true;
        if ((t.reason ?? "").toLowerCase().includes(needle)) return true;
        return t.prompts.some(
          (p) =>
            p.query.toLowerCase().includes(needle) ||
            (p.reason ?? "").toLowerCase().includes(needle)
        );
      });
    }

    const clone = [...rows];
    if (sortMode === "name") {
      clone.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === "fewestPrompts") {
      clone.sort((a, b) => a.prompts.length - b.prompts.length);
    } else {
      clone.sort((a, b) => b.prompts.length - a.prompts.length);
    }
    return clone;
  }, [topics, q, sortMode, difficulty]);

  const promptCount = filteredTopics.reduce((s, t) => s + t.prompts.length, 0);

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
      </section>

      <section className="glass-card rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search topics, prompts, reasons..."
          className="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/70 px-3 py-2 text-sm outline-none focus:border-[var(--sibling-primary)]"
        />
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
          <option value="mostPrompts">Sort: Most prompts first</option>
          <option value="fewestPrompts">Sort: Fewest prompts first</option>
          <option value="name">Sort: Topic name A-Z</option>
        </select>
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
                    if (topicCompanies.length === 0) return null;
                    return (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {topicCompanies.slice(0, 18).map((name) => (
                          <span
                            key={name}
                            className="text-[11px] rounded-full border border-[color-mix(in_oklch,var(--glass-border)_80%,var(--destructive)_20%)] bg-[color-mix(in_oklch,var(--glass)_88%,var(--destructive)_12%)] px-2.5 py-0.5 text-foreground/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_10px_rgba(0,0,0,0.18)] backdrop-blur-md"
                            title={name}
                          >
                            {name}
                          </span>
                        ))}
                        {topicCompanies.length > 18 ? (
                          <span className="text-[11px] rounded-full border border-[color-mix(in_oklch,var(--destructive)_38%,transparent)] bg-[color-mix(in_oklch,var(--destructive)_16%,transparent)] px-2.5 py-0.5 text-[var(--sibling-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md">
                            +{topicCompanies.length - 18}
                          </span>
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
                  topic.prompts.map((prompt) => (
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
                              const companies = uniqueCompanyNamesForPrompt(prompt);
                              if (companies.length === 0) return null;
                              return (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {companies.slice(0, 14).map((name) => (
                                    <span
                                      key={name}
                                      className="text-[11px] rounded-full border border-[color-mix(in_oklch,var(--glass-border)_80%,var(--destructive)_20%)] bg-[color-mix(in_oklch,var(--glass)_88%,var(--destructive)_12%)] px-2.5 py-0.5 text-foreground/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_10px_rgba(0,0,0,0.18)] backdrop-blur-md"
                                      title={name}
                                    >
                                      {name}
                                    </span>
                                  ))}
                                  {companies.length > 14 ? (
                                    <span className="text-[11px] rounded-full border border-[color-mix(in_oklch,var(--destructive)_38%,transparent)] bg-[color-mix(in_oklch,var(--destructive)_16%,transparent)] px-2.5 py-0.5 text-[var(--sibling-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md">
                                      +{companies.length - 14}
                                    </span>
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
                          {prompt.consensus.length === 0 ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                              No consensus rivals available.
                            </p>
                          ) : (
                            <div className="mt-2 overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-[var(--glass-border)]/60">
                                    <th className="text-left py-1.5">Company</th>
                                    <th className="text-right py-1.5">Avg rank</th>
                                    <th className="text-right py-1.5">Mentions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {prompt.consensus.map((c, idx) => (
                                    <tr
                                      key={`${c.companyName}-${idx}`}
                                      className="border-b border-[var(--glass-border)]/30"
                                    >
                                      <td className="py-1.5">{c.companyName}</td>
                                      <td className="py-1.5 text-right tabular-nums">
                                        {rankText(c.avgRank)}
                                      </td>
                                      <td className="py-1.5 text-right tabular-nums">
                                        {c.mentions}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        <div className="rounded-md border border-[var(--glass-border)] bg-[var(--glass)]/45 p-3">
                          <p className="text-xs font-semibold text-foreground">
                            Model Duel Board
                          </p>
                          {prompt.byModel.length === 0 ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                              No model-specific rivals available.
                            </p>
                          ) : (
                            <div className="mt-2 overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-[var(--glass-border)]/60">
                                    <th className="text-left py-1.5">Model</th>
                                    <th className="text-left py-1.5">Company</th>
                                    <th className="text-right py-1.5">Rank</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {prompt.byModel.map((c, idx) => (
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
                          )}
                        </div>
                      </div>
                    </div>
                  ))
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
    </div>
  );
}

