import { ADD_ON_CONFIG, isAddOnId, type AddOnId } from "@/lib/subscription/plans";

export type Feature =
  | "radarScans"
  | "bountyGenerator"
  | "seoPageGeneration"
  | "rivalsAnalysis";

export const FEATURES: Feature[] = [
  "radarScans",
  "bountyGenerator",
  "seoPageGeneration",
  "rivalsAnalysis",
];

export const USAGE_FIELD = {
  radarScans: "radarScansUsed",
  bountyGenerator: "bountyGeneratorUsed",
  seoPageGeneration: "seoPageGenerationUsed",
  rivalsAnalysis: "rivalsAnalysisUsed",
} as const;

export const QUOTA_FIELD = {
  radarScans: "radarScansQuota",
  bountyGenerator: "bountyGeneratorQuota",
  seoPageGeneration: "seoPageGenerationQuota",
  rivalsAnalysis: "rivalsAnalysisQuota",
} as const;

export type BaseQuotas = {
  radarScansQuota: number;
  bountyGeneratorQuota: number;
  seoPageGenerationQuota: number;
  rivalsAnalysisQuota: number;
};

export type ActiveAddOn = {
  addOnType: string;
  quantity: number;
};

/**
 * Resolve the quota a subscription actually has this period, folding in every active
 * add-on. Additive boosts are applied first (scaled by purchased quantity), then
 * multiplicative ones — so a 2x multiplier doubles the boosted total, not just the base.
 *
 * This is the single source of truth for effective quota; both checkLimit and
 * getSubscriptionSummary go through it so they can never disagree.
 */
export function resolveEffectiveQuotas(
  base: BaseQuotas,
  addOns: ActiveAddOn[]
): Record<Feature, number> {
  const quotas: Record<Feature, number> = {
    radarScans: base.radarScansQuota,
    bountyGenerator: base.bountyGeneratorQuota,
    seoPageGeneration: base.seoPageGenerationQuota,
    rivalsAnalysis: base.rivalsAnalysisQuota,
  };

  const known = addOns.filter((a): a is ActiveAddOn & { addOnType: AddOnId } =>
    isAddOnId(a.addOnType)
  );

  for (const addOn of known) {
    const config = ADD_ON_CONFIG[addOn.addOnType];
    if (config.mode !== "add") continue;
    // Non-stackable add-ons count once no matter what quantity was recorded.
    const qty = config.stackable ? Math.max(1, addOn.quantity) : 1;
    for (const [feature, amount] of Object.entries(config.delta) as [
      Feature,
      number,
    ][]) {
      quotas[feature] += amount * qty;
    }
  }

  for (const addOn of known) {
    const config = ADD_ON_CONFIG[addOn.addOnType];
    if (config.mode !== "multiply") continue;
    for (const [feature, factor] of Object.entries(config.factor) as [
      Feature,
      number,
    ][]) {
      quotas[feature] *= factor;
    }
  }

  return quotas;
}
