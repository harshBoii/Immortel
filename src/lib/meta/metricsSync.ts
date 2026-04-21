import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { graphGet } from "@/lib/meta/graph";

const CONCURRENCY = 8;
const DEFAULT_CANDIDATE_POOL = 200;
const DEFAULT_LIMIT = 50;
const DEFAULT_DATE_PRESET = "last_7d";

type InsightsRow = {
  impressions?: string | number;
  clicks?: string | number;
  ctr?: string | number;
  spend?: string | number;
  cpc?: string | number;
  actions?: Array<Record<string, unknown>>;
  action_values?: Array<{ action_type?: string; value?: string | number }>;
};

export type AdMetric = {
  /** MetaAd.id (DB uuid) */
  adDbId: string;
  /** MetaAd.metaAdId (Meta numeric id) */
  metaAdId: string;
  /** MetaCampaign.id (DB uuid) via adSet → campaign */
  campaignDbId: string;
  updatedAt: Date;
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  cpc: number | null;
  roas: number | null;
  actions: Prisma.InputJsonValue | null;
};

export type MetricsSyncResult = {
  datePreset: string;
  candidatePoolSize: number;
  metrics: AdMetric[];
  selected: AdMetric[];
  selectedMetaAdIds: string[];
  syncedCount: number;
};

function toNumber(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? Number(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toNumberOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "string" ? Number(v) : Number(v);
  return Number.isFinite(n) ? n : null;
}

function computeRoas(row: InsightsRow, spend: number): number | null {
  if (!spend || spend <= 0) return null;
  const values = row.action_values ?? [];
  const purchaseKeys = new Set([
    "omni_purchase",
    "purchase",
    "offsite_conversion.fb_pixel_purchase",
    "web_in_store_purchase",
  ]);
  let revenue = 0;
  for (const v of values) {
    if (!v?.action_type) continue;
    if (!purchaseKeys.has(v.action_type)) continue;
    const n = toNumber(v.value);
    if (n > revenue) revenue = n;
  }
  if (revenue <= 0) return null;
  return Number((revenue / spend).toFixed(4));
}

async function fetchInsights(
  metaAdId: string,
  accessToken: string,
  datePreset: string,
): Promise<InsightsRow | null> {
  try {
    const res = (await graphGet(
      `${metaAdId}/insights`,
      {
        fields: "impressions,clicks,ctr,spend,cpc,actions,action_values",
        date_preset: datePreset,
        limit: 1,
      },
      { accessToken },
    )) as { data?: InsightsRow[] };
    return res.data?.[0] ?? null;
  } catch (e) {
    console.error("[meta/metricsSync] insights failed", {
      metaAdId,
      error: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      const item = items[idx]!;
      try {
        await worker(item, idx);
      } catch (e) {
        console.error("[meta/metricsSync] worker failed", {
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }
  });
  await Promise.all(runners);
}

/**
 * Polls Meta Graph insights for a pool of the integration's MetaAds and
 * persists a snapshot of up to `limit` rows into `meta_ad_metrics`. The
 * selection is the union of:
 *   - top (limit/2) by impressions
 *   - top (limit/2) by recency (MetaAd.updatedAt desc)
 * with remaining slots filled by impressions desc.
 */
export async function syncMetaAdMetrics(opts: {
  integrationId: string;
  accessToken: string;
  datePreset?: string;
  limit?: number;
  candidatePoolSize?: number;
  onlyActive?: boolean;
}): Promise<MetricsSyncResult> {
  const datePreset = opts.datePreset ?? DEFAULT_DATE_PRESET;
  const limit = Math.max(1, opts.limit ?? DEFAULT_LIMIT);
  const poolSize = Math.max(limit, opts.candidatePoolSize ?? DEFAULT_CANDIDATE_POOL);

  const candidates = await prisma.metaAd.findMany({
    where: {
      metaIntegrationId: opts.integrationId,
      ...(opts.onlyActive ? { status: "ACTIVE" } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: poolSize,
    select: {
      id: true,
      metaAdId: true,
      updatedAt: true,
      adSet: { select: { campaignId: true } },
    },
  });

  if (candidates.length === 0) {
    return {
      datePreset,
      candidatePoolSize: 0,
      metrics: [],
      selected: [],
      selectedMetaAdIds: [],
      syncedCount: 0,
    };
  }

  const metrics: AdMetric[] = new Array(candidates.length);

  await runWithConcurrency(candidates, CONCURRENCY, async (row, idx) => {
    const ins = await fetchInsights(row.metaAdId, opts.accessToken, datePreset);
    const impressions = toNumber(ins?.impressions);
    const clicks = toNumber(ins?.clicks);
    const ctr = toNumber(ins?.ctr);
    const spend = toNumber(ins?.spend);
    const cpc = toNumberOrNull(ins?.cpc);
    const roas = ins ? computeRoas(ins, spend) : null;
    const actions =
      (ins?.actions && Array.isArray(ins.actions) ? (ins.actions as unknown as Prisma.InputJsonValue) : null) ?? null;

    metrics[idx] = {
      adDbId: row.id,
      metaAdId: row.metaAdId,
      campaignDbId: row.adSet.campaignId,
      updatedAt: row.updatedAt,
      impressions,
      clicks,
      ctr,
      spend,
      cpc,
      roas,
      actions,
    };
  });

  const byImpressions = [...metrics].sort((a, b) => b.impressions - a.impressions);
  const byRecency = [...metrics].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  const half = Math.floor(limit / 2);
  const selected = new Map<string, AdMetric>();

  for (const m of byImpressions.slice(0, half)) selected.set(m.adDbId, m);

  let recencyAdded = 0;
  for (const m of byRecency) {
    if (selected.size >= limit || recencyAdded >= half) break;
    if (!selected.has(m.adDbId)) {
      selected.set(m.adDbId, m);
      recencyAdded++;
    }
  }

  for (const m of byImpressions) {
    if (selected.size >= limit) break;
    if (!selected.has(m.adDbId)) selected.set(m.adDbId, m);
  }

  const selectedList = Array.from(selected.values()).sort(
    (a, b) => b.impressions - a.impressions,
  );

  let syncedCount = 0;
  if (selectedList.length > 0) {
    const created = await prisma.metaAdMetrics.createMany({
      data: selectedList.map((m) => ({
        metaCampaignId: m.campaignDbId,
        metaAdId: m.metaAdId,
        impressions: m.impressions,
        clicks: m.clicks,
        ctr: m.ctr,
        spend: m.spend,
        cpc: m.cpc,
        roas: m.roas,
        actions: m.actions ?? Prisma.JsonNull,
        datePreset,
      })),
    });
    syncedCount = created.count;
  }

  return {
    datePreset,
    candidatePoolSize: candidates.length,
    metrics,
    selected: selectedList,
    selectedMetaAdIds: selectedList.map((m) => m.metaAdId),
    syncedCount,
  };
}
