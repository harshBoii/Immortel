/**
 * Match bounty microservice / radar prompt revenue records to citation bounties
 * and compute a single USD estimate when `estimatedRevenue` is missing.
 *
 * Funnel: monthlyPromptReach × visibilityWeight × ctr × cvr × aov
 */

export function normalizePromptQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

export type PromptRevenueFields = {
  estimatedRevenue?: number | null;
  monthlyPromptReach?: number | null;
  visibilityWeight?: number | null;
  ctr?: number | null;
  cvr?: number | null;
  aov?: number | null;
} | null;

export function computeRevenueFromFunnel(
  r: NonNullable<PromptRevenueFields>
): number | null {
  const reach = r.monthlyPromptReach;
  const vw = r.visibilityWeight;
  const ctr = r.ctr;
  const cvr = r.cvr;
  const aov = r.aov;
  if (
    reach == null ||
    !Number.isFinite(reach) ||
    vw == null ||
    !Number.isFinite(vw) ||
    ctr == null ||
    !Number.isFinite(ctr) ||
    cvr == null ||
    !Number.isFinite(cvr) ||
    aov == null ||
    !Number.isFinite(aov)
  ) {
    return null;
  }
  return reach * vw * ctr * cvr * aov;
}

/** Prefer stored `estimatedRevenue`; otherwise derive from funnel inputs. */
export function resolvePromptRevenueUsd(r: PromptRevenueFields): number | null {
  if (!r) return null;
  if (r.estimatedRevenue != null && Number.isFinite(r.estimatedRevenue)) {
    return r.estimatedRevenue;
  }
  return computeRevenueFromFunnel(r);
}

/** Per normalized query key, keep the max resolved revenue (multiple prompts can share text). */
export function maxPromptRevenueByQuery(
  rows: Array<{ query: string; revenue: PromptRevenueFields }>
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const usd = resolvePromptRevenueUsd(row.revenue);
    if (usd == null || !Number.isFinite(usd)) continue;
    const key = normalizePromptQuery(row.query);
    const prev = map.get(key);
    map.set(key, prev == null ? usd : Math.max(prev, usd));
  }
  return map;
}

export function resolveBountyRevenueUsd(input: {
  query: string;
  bountyEstimatedRevenue: number | null;
  promptRevenueByQuery: Map<string, number>;
}): number {
  const fromPrompt = input.promptRevenueByQuery.get(normalizePromptQuery(input.query));
  if (fromPrompt != null && Number.isFinite(fromPrompt)) {
    return fromPrompt;
  }
  if (
    input.bountyEstimatedRevenue != null &&
    Number.isFinite(input.bountyEstimatedRevenue)
  ) {
    return input.bountyEstimatedRevenue;
  }
  return 0;
}
