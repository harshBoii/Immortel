import { graphGet } from "@/lib/meta/graph";

type InsightsRow = {
  impressions?: string | number;
  clicks?: string | number;
  ctr?: string | number;
  spend?: string | number;
  cpc?: string | number;
  actions?: Array<Record<string, unknown>>;
  action_values?: Array<{ action_type?: string; value?: string | number }>;
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

export type MetaAdInsightSnapshot = {
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  cpc: number | null;
  roas: number | null;
  actions: unknown[] | null;
};

export async function fetchMetaAdInsights(opts: {
  metaAdId: string;
  accessToken: string;
  datePreset?: string;
}): Promise<MetaAdInsightSnapshot | null> {
  const datePreset = opts.datePreset ?? "last_7d";
  const res = (await graphGet(
    `${opts.metaAdId}/insights`,
    {
      fields: "impressions,clicks,ctr,spend,cpc,actions,action_values",
      date_preset: datePreset,
      limit: 1,
    },
    { accessToken: opts.accessToken },
  )) as { data?: InsightsRow[] };

  const row = res.data?.[0];
  if (!row) return null;

  const spend = toNumber(row.spend);
  const actions = Array.isArray(row.actions) ? (row.actions as unknown[]) : null;
  return {
    impressions: toNumber(row.impressions),
    clicks: toNumber(row.clicks),
    ctr: toNumber(row.ctr),
    spend,
    cpc: toNumberOrNull(row.cpc),
    roas: computeRoas(row, spend),
    actions,
  };
}

