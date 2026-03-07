"use client";

import { useState } from "react";
import type { BountyFilterTab } from "./bounty-filter-tabs";
import { DifficultyBadge } from "./difficulty-badge";
import { BountyPromptsModal } from "./bounty-prompts-modal";

export type BountyNiche = {
  id: string;
  topic: string;
  description: string;
  difficulty: string;
  prompts: Array<{ id: string; query: string }>;
  prompt_count: number;
};

type BountyTableProps = {
  niches: BountyNiche[];
  filter: BountyFilterTab;
};

const ENGINES_COLORS = [
  "bg-[var(--chart-1)]",
  "bg-[var(--chart-2)]",
  "bg-[var(--chart-3)]",
  "bg-[var(--chart-4)]",
];

function filterNiches(niches: BountyNiche[], filter: BountyFilterTab): BountyNiche[] {
  if (filter === "all") return niches;
  return niches.filter((n) => n.difficulty.toLowerCase() === filter);
}

export function BountyTable({ niches, filter }: BountyTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalBounty, setModalBounty] = useState<BountyNiche | null>(null);
  const filtered = filterNiches(niches, filter);

  if (filtered.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)] p-8 text-center text-sm text-muted-foreground">
        No niches yet. Run a scan to discover topics and prompts.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]">
      <div className="overflow-x-auto glass-scrollbar">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--glass-border)] bg-[var(--glass)]/80">
              <th className="px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
                Topic
              </th>
              <th className="hidden px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground sm:table-cell">
                Description
              </th>
              <th className="px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
                Prompts
              </th>
              <th className="px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
                Gap
              </th>
              <th className="px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground w-[100px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--glass-border)]/60">
            {filtered.map((row) => {
              const isExpanded = expandedId === row.id;
              return (
                <tr
                  key={row.id}
                  className="transition-colors hover:bg-[var(--glass-hover)]/40"
                >
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : row.id)
                      }
                      className="text-left font-medium text-foreground hover:underline"
                    >
                      {row.topic}
                    </button>
                    {row.description && (
                      <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
                        {row.description.slice(0, 120)}
                        {row.description.length > 120 ? "…" : ""}
                      </p>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {row.description ? (
                      <span className="line-clamp-2 text-xs">
                        {row.description.slice(0, 100)}
                        {row.description.length > 100 ? "…" : ""}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {ENGINES_COLORS.map((c, i) => (
                          <span
                            key={i}
                            className={`h-2 w-2 rounded-full ${c}`}
                            aria-hidden
                          />
                        ))}
                      </div>
                      <span className="tabular-nums text-foreground">
                        {row.prompt_count}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <DifficultyBadge difficulty={row.difficulty} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setModalBounty(row)}
                      className="btn-primary inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
                    >
                      Hunt
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {expandedId && (() => {
        const row = filtered.find((r) => r.id === expandedId);
        if (!row) return null;
        return (
          <div
            className="border-t border-[var(--glass-border)] bg-[var(--glass)]/50 px-4 py-3"
            role="region"
            aria-label="Prompts list"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                Prompts for &quot;{row.topic}&quot;
              </p>
              <button
                type="button"
                onClick={() => setExpandedId(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
            <ul className="mt-2 max-h-60 space-y-1 overflow-y-auto glass-scrollbar pr-2">
              {row.prompts.map((p) => (
                <li
                  key={p.id}
                  className="text-xs text-foreground"
                >
                  {p.query}
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

      <BountyPromptsModal bounty={modalBounty} onClose={() => setModalBounty(null)} />
    </div>
  );
}
