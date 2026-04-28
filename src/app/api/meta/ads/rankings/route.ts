import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";

export const runtime = "nodejs";
export const maxDuration = 300;

type MetricKey = "impressions" | "clicks";

type LatestMetric = {
  metaAdId: string;
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  cpc: number | null;
  roas: number | null;
  actions: unknown;
  datePreset: string;
  recordedAt: Date;
};

function toInt(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
}

function pickTop(sortedDesc: Array<{ metaAdId: string; value: number }>, k: number): string[] {
  return sortedDesc.slice(0, k).map((r) => r.metaAdId);
}

function percentileIndex(n: number, p: number): number {
  if (n <= 1) return 0;
  const idx = Math.floor(p * (n - 1));
  return Math.min(n - 1, Math.max(0, idx));
}

function middleThreeByBandAndTarget(opts: {
  sortedAsc: Array<{ metaAdId: string; value: number }>;
  topIds: Set<string>;
  bandLoP: number;
  bandHiP: number;
  targetP: number;
  k: number;
}): string[] {
  const { sortedAsc, topIds, bandLoP, bandHiP, targetP, k } = opts;
  const n = sortedAsc.length;
  if (n === 0) return [];
  if (n <= k) return sortedAsc.map((r) => r.metaAdId);

  const targetIdx = percentileIndex(n, targetP);
  const targetValue = sortedAsc[targetIdx]?.value ?? 0;

  const lo = percentileIndex(n, bandLoP);
  const hi = percentileIndex(n, bandHiP);

  const band = sortedAsc.slice(Math.min(lo, hi), Math.max(lo, hi) + 1);
  const bandNoTop = band.filter((r) => !topIds.has(r.metaAdId));
  const candidates = bandNoTop.length >= k ? bandNoTop : band;

  const ranked = candidates
    .slice()
    .sort((a, b) => {
      const da = Math.abs(a.value - targetValue);
      const db = Math.abs(b.value - targetValue);
      if (da !== db) return da - db;
      // stable-ish tie-breaker: closer to target index by position (approx)
      return a.metaAdId.localeCompare(b.metaAdId);
    })
    .slice(0, k);

  if (ranked.length === k) return ranked.map((r) => r.metaAdId);

  // Not enough in the band — expand outward from the target index until we have k.
  const picked = new Set(ranked.map((r) => r.metaAdId));
  const out: string[] = ranked.map((r) => r.metaAdId);
  const tryAdd = (id: string, allowTop: boolean) => {
    if (picked.has(id)) return false;
    if (!allowTop && topIds.has(id)) return false;
    picked.add(id);
    out.push(id);
    return true;
  };

  const expand = (allowTop: boolean) => {
    let left = targetIdx;
    let right = targetIdx + 1;
    while (out.length < k && (left >= 0 || right < n)) {
      if (left >= 0) {
        tryAdd(sortedAsc[left]!.metaAdId, allowTop);
        left--;
      }
      if (out.length >= k) break;
      if (right < n) {
        tryAdd(sortedAsc[right]!.metaAdId, allowTop);
        right++;
      }
    }
  };

  // Prefer excluding topIds; if still short, allow overlap.
  expand(false);
  if (out.length < k) expand(true);

  return out.slice(0, k);
}

function selectTopAndMiddle(opts: {
  rows: Array<{ metaAdId: string; value: number }>;
  metric: MetricKey;
  k?: number;
}): { top: string[]; middle: string[]; n: number } {
  const k = opts.k ?? 3;
  const n = opts.rows.length;
  if (n === 0) return { top: [], middle: [], n: 0 };

  const byDesc = opts.rows.slice().sort((a, b) => b.value - a.value);
  const byAsc = opts.rows.slice().sort((a, b) => a.value - b.value);

  const top = pickTop(byDesc, k);
  const topIds = new Set(top);

  // Middle = within 40–60 band, closest to p50 (median) for that metric.
  let middle = middleThreeByBandAndTarget({
    sortedAsc: byAsc,
    topIds,
    bandLoP: 0.4,
    bandHiP: 0.6,
    targetP: 0.5,
    k,
  });

  // Special rule: impressions fallback to p25 if the middle-3 all have 0 impressions.
  if (opts.metric === "impressions" && middle.length > 0) {
    const byId = new Map(opts.rows.map((r) => [r.metaAdId, r.value]));
    const allZero = middle.every((id) => (byId.get(id) ?? 0) === 0);
    if (allZero) {
      middle = middleThreeByBandAndTarget({
        sortedAsc: byAsc,
        topIds,
        bandLoP: 0.15,
        bandHiP: 0.35,
        targetP: 0.25,
        k,
      });
    }
  }

  return { top, middle, n };
}

async function hydrateMediaForAdIds(opts: {
  req: Request;
  adIds: string[];
}): Promise<Array<{ adId: string; ok: boolean; error?: string }>> {
  const { req, adIds } = opts;
  if (adIds.length === 0) return [];

  const origin = new URL(req.url).origin;
  const cookie = req.headers.get("cookie") ?? "";

  const results: Array<{ adId: string; ok: boolean; error?: string }> = [];
  for (const adId of adIds) {
    try {
      const res = await fetch(`${origin}/api/meta/ads/${encodeURIComponent(adId)}/fetch-media`, {
        method: "POST",
        headers: cookie ? { cookie } : undefined,
        cache: "no-store",
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        results.push({
          adId,
          ok: false,
          error: text || `HTTP ${res.status}`,
        });
      } else {
        results.push({ adId, ok: true });
      }
    } catch (e) {
      results.push({
        adId,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return results;
}

export async function GET(req: Request) {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  const u = new URL(req.url);
  const datePreset = (u.searchParams.get("date_preset") ?? "last_7d").trim() || "last_7d";
  const onlyActive = u.searchParams.get("only_active") === "1";

  const ads = await prisma.metaAd.findMany({
    where: {
      metaIntegrationId: loaded.integrationId,
      ...(onlyActive ? { status: "ACTIVE" } : {}),
    },
    include: {
      adSet: {
        select: {
          id: true,
          campaignId: true,
          metaAdSetId: true,
          name: true,
          status: true,
        },
      },
      creative: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const metaAdIds = ads.map((a) => a.metaAdId);
  const metricsRows =
    metaAdIds.length === 0
      ? []
      : await prisma.metaAdMetrics.findMany({
          where: {
            metaAdId: { in: metaAdIds },
            datePreset,
          },
          orderBy: { recordedAt: "desc" },
        });

  const latestByMetaAdId = new Map<string, LatestMetric>();
  for (const m of metricsRows) {
    if (!latestByMetaAdId.has(m.metaAdId)) {
      latestByMetaAdId.set(m.metaAdId, m as unknown as LatestMetric);
    }
  }

  const rowsFor = (metric: MetricKey) =>
    metaAdIds
      .map((id) => {
        const m = latestByMetaAdId.get(id);
        if (!m) return null;
        return { metaAdId: id, value: toInt(m[metric]) };
      })
      .filter((v): v is { metaAdId: string; value: number } => Boolean(v));

  const impressionsSel = selectTopAndMiddle({ rows: rowsFor("impressions"), metric: "impressions" });
  const clicksSel = selectTopAndMiddle({ rows: rowsFor("clicks"), metric: "clicks" });

  const uniqueSelected = Array.from(
    new Set([
      ...impressionsSel.top,
      ...impressionsSel.middle,
      ...clicksSel.top,
      ...clicksSel.middle,
    ]),
  );

  // Media hydration step (best-effort).
  const hydrateResults = await hydrateMediaForAdIds({ req, adIds: uniqueSelected });

  // Re-read ads to return the latest creative media fields after hydration.
  const refreshedAds =
    uniqueSelected.length === 0
      ? []
      : await prisma.metaAd.findMany({
          where: {
            metaIntegrationId: loaded.integrationId,
            metaAdId: { in: uniqueSelected },
          },
          include: {
            adSet: {
              select: {
                id: true,
                campaignId: true,
                metaAdSetId: true,
                name: true,
                status: true,
              },
            },
            creative: true,
          },
        });

  const adByMetaId = new Map(refreshedAds.map((a) => [a.metaAdId, a]));

  const pack = (metaAdId: string) => ({
    ad: adByMetaId.get(metaAdId) ?? null,
    metrics: latestByMetaAdId.get(metaAdId) ?? null,
  });

  return NextResponse.json({
    ok: true,
    datePreset,
    onlyActive,
    counts: {
      candidates: ads.length,
      withMetrics: latestByMetaAdId.size,
      selectedUnique: uniqueSelected.length,
    },
    rankings: {
      byImpressions: {
        n: impressionsSel.n,
        top: impressionsSel.top.map(pack),
        middle: impressionsSel.middle.map(pack),
      },
      byClicks: {
        n: clicksSel.n,
        top: clicksSel.top.map(pack),
        middle: clicksSel.middle.map(pack),
      },
    },
    hydration: {
      attempted: uniqueSelected.length,
      results: hydrateResults,
    },
  });
}

