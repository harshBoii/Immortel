import type { PromptView } from "@/app/(Pages)/(WorkSpace)/geo/geoknight/client";
import type { GeoKnightWorkspaceData } from "@/lib/geo/geoknight/loadGeoKnightTopicViews";
import {
  buildSelfFocusRegex,
  cleanCompanyNameForMatch,
  promptMatchesCompanyFocus,
} from "@/lib/geo/geoknight/companyNameMatch";

/** Reject NaN/Infinity and absurd magnitudes that break @react-pdf layout or display. */
export function sanitizeFiniteNumber(
  value: number | null | undefined,
  opts: { min?: number; max?: number } = {}
): number | null {
  if (value == null || typeof value !== "number") return null;
  if (!Number.isFinite(value)) return null;
  const { min = -1e6, max = 1e6 } = opts;
  if (value < min || value > max) return null;
  return value;
}

export function formatMetric(
  value: number | null | undefined,
  opts: { suffix?: string; prefix?: string; digits?: number } = {}
) {
  const { suffix = "", prefix = "", digits = 1 } = opts;
  const n = sanitizeFiniteNumber(value);
  if (n == null) return "—";
  return `${prefix}${n.toFixed(digits)}${suffix}`;
}

export function formatRankValue(rank: number | null | undefined): string {
  const n = sanitizeFiniteNumber(rank, { min: 0, max: 1000 });
  return n != null ? `#${n.toFixed(1)}` : "—";
}

export function formatCount(value: number | null | undefined): string {
  const n = sanitizeFiniteNumber(value, { min: 0, max: 1e9 });
  if (n == null) return "—";
  return String(Math.round(n));
}

/** Compile the search input as a case-insensitive regex; fall back to literal includes on invalid patterns. */
export function buildSearchRegex(q: string): RegExp | null {
  const t = q.trim();
  if (!t) return null;
  try {
    return new RegExp(t, "i");
  } catch {
    return new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }
}

export function matchesSearch(q: string, ...parts: (string | null | undefined)[]) {
  const re = buildSearchRegex(q);
  if (!re) return true;
  return parts.some((p) => re.test(p ?? ""));
}

export function collectOtherBrandsWithRanks(prompt: PromptView, ourRegex: RegExp) {
  const map = new Map<string, number | null>();
  const isOurs = (name: string) => ourRegex.test(cleanCompanyNameForMatch(name));
  const bump = (name: string, r: number | null) => {
    const key = name.trim();
    if (!key) return;
    const prev = map.get(key);
    if (r == null) {
      if (!map.has(key)) map.set(key, null);
      return;
    }
    const next = prev == null ? r : Math.min(prev, r);
    map.set(key, next);
  };
  for (const c of prompt.consensus ?? []) {
    if (isOurs(c.companyName)) continue;
    bump(c.companyName, c.avgRank);
  }
  for (const c of prompt.byModel ?? []) {
    if (isOurs(c.companyName)) continue;
    bump(c.companyName, c.rank);
  }
  return [...map.entries()]
    .map(([companyName, bestRank]) => ({ companyName, bestRank }))
    .sort((a, b) => {
      const ar = a.bestRank ?? 999;
      const br = b.bestRank ?? 999;
      if (ar !== br) return ar - br;
      return a.companyName.localeCompare(b.companyName);
    });
}

export function ourBestRanks(prompt: PromptView, ourRegex: RegExp) {
  let consensusBest: number | null = null;
  for (const c of prompt.consensus ?? []) {
    if (!ourRegex.test(cleanCompanyNameForMatch(c.companyName))) continue;
    if (c.avgRank != null && !Number.isNaN(c.avgRank)) {
      consensusBest =
        consensusBest == null ? c.avgRank : Math.min(consensusBest, c.avgRank);
    }
  }
  let modelBest: number | null = null;
  for (const c of prompt.byModel ?? []) {
    if (!ourRegex.test(cleanCompanyNameForMatch(c.companyName))) continue;
    if (c.rank != null && !Number.isNaN(c.rank)) {
      modelBest = modelBest == null ? c.rank : Math.min(modelBest, c.rank);
    }
  }
  return { consensusBest, modelBest };
}

export type BrandMentionRow = {
  promptId: string;
  query: string;
  topicName: string;
  topicDifficulty: "EASY" | "MEDIUM" | "HARD";
  consensusBest: number | null;
  modelBest: number | null;
  otherBrands: Array<{ companyName: string; bestRank: number | null }>;
};

export function buildBrandMentionRows(
  geoKnight: GeoKnightWorkspaceData,
  brandFocusRegex: RegExp | null
): BrandMentionRow[] {
  if (!brandFocusRegex) return [];
  const out: BrandMentionRow[] = [];
  for (const topic of geoKnight.topicViews) {
    for (const prompt of topic.prompts) {
      if (!promptMatchesCompanyFocus(prompt, brandFocusRegex)) continue;
      const { consensusBest, modelBest } = ourBestRanks(prompt, brandFocusRegex);
      out.push({
        promptId: prompt.id,
        query: prompt.query,
        topicName: topic.name,
        topicDifficulty: topic.difficulty,
        consensusBest,
        modelBest,
        otherBrands: collectOtherBrandsWithRanks(prompt, brandFocusRegex),
      });
    }
  }
  out.sort((a, b) => a.query.localeCompare(b.query));
  return out;
}

export function buildBrandFocusRegex(
  geoKnight: GeoKnightWorkspaceData,
  ourName: string
): RegExp | null {
  return buildSelfFocusRegex(geoKnight.companyName ?? ourName);
}
