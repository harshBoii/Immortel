import type { SubscriptionPlan } from "@prisma/client";

/**
 * Plan quotas.
 *
 * Only the Dealify tiers are purchasable — they are activated by redeeming a coupon.
 * FREE is the silent fallback for accounts without a coupon. STARTER/GROWTH/SCALE are
 * deprecated: they are retained so existing subscription rows and in-flight Dodo
 * webhooks still resolve, but they can no longer be bought. Their quotas now live on
 * as the `*_BOOST` add-ons in ADD_ON_CONFIG.
 */
export const PLAN_CONFIG = {
  FREE: {
    priceAmount: 0,
    radarScansQuota: 10,
    bountyGeneratorQuota: 10,
    seoPageGenerationQuota: 5,
    rivalsAnalysisQuota: 2,
  },
  /** @deprecated not purchasable — superseded by the STARTER_BOOST add-on */
  STARTER: {
    priceAmount: 4900,
    radarScansQuota: 40,
    bountyGeneratorQuota: 30,
    seoPageGenerationQuota: 20,
    rivalsAnalysisQuota: 10,
  },
  /** @deprecated not purchasable — superseded by the GROWTH_BOOST add-on */
  GROWTH: {
    priceAmount: 14900,
    radarScansQuota: 150,
    bountyGeneratorQuota: 80,
    seoPageGenerationQuota: 60,
    rivalsAnalysisQuota: 20,
  },
  /** @deprecated not purchasable — superseded by the SCALE_BOOST add-on */
  SCALE: {
    priceAmount: 49900,
    radarScansQuota: 500,
    bountyGeneratorQuota: 300,
    seoPageGenerationQuota: 200,
    rivalsAnalysisQuota: 50,
  },
  DEALIFY_STARTER: {
    priceAmount: 9000,
    radarScansQuota: 5,
    bountyGeneratorQuota: 4,
    seoPageGenerationQuota: 16,
    rivalsAnalysisQuota: 0,
  },
  DEALIFY_PRO: {
    priceAmount: 14000,
    radarScansQuota: 9,
    bountyGeneratorQuota: 8,
    seoPageGenerationQuota: 24,
    rivalsAnalysisQuota: 2,
  },
} as const;

export type PlanId = keyof typeof PLAN_CONFIG;

export type DealifyPlanId = "DEALIFY_STARTER" | "DEALIFY_PRO";

/** Plans that can no longer be purchased but may still exist on old subscription rows. */
export type LegacyPlanId = "STARTER" | "GROWTH" | "SCALE";

const PLAN_IDS = Object.keys(PLAN_CONFIG) as PlanId[];

const DEALIFY_PLAN_IDS: DealifyPlanId[] = ["DEALIFY_STARTER", "DEALIFY_PRO"];

const LEGACY_PLAN_IDS: LegacyPlanId[] = ["STARTER", "GROWTH", "SCALE"];

/** The only plans a user can actually acquire. Dealify tiers are coupon-activated. */
export const PURCHASABLE_PLAN_IDS: DealifyPlanId[] = [
  "DEALIFY_STARTER",
  "DEALIFY_PRO",
];

export function isPlanId(value: string): value is PlanId {
  return (PLAN_IDS as string[]).includes(value);
}

export function isFreePlan(plan: PlanId): plan is "FREE" {
  return plan === "FREE";
}

export function isDealifyPlan(plan: PlanId): plan is DealifyPlanId {
  return (DEALIFY_PLAN_IDS as string[]).includes(plan);
}

export function isLegacyPlan(plan: PlanId): plan is LegacyPlanId {
  return (LEGACY_PLAN_IDS as string[]).includes(plan);
}

/** Add-ons may only be purchased on top of an active Dealify base plan. */
export function canPurchaseAddOns(plan: PlanId): boolean {
  return isDealifyPlan(plan);
}

function planQuotaFeatures(plan: PlanId): string[] {
  const c = PLAN_CONFIG[plan];
  const features = [
    `${c.radarScansQuota} radar scans / month`,
    `${c.bountyGeneratorQuota} bounty generations / month`,
    `${c.seoPageGenerationQuota} SEO pages / month`,
  ];
  if (c.rivalsAnalysisQuota > 0) {
    features.push(`${c.rivalsAnalysisQuota} rival analyses / month`);
  }
  return features;
}

/**
 * Price labels deliberately carry no billing period. The Dealify term is an internal
 * entitlement detail and must never surface in the UI.
 */
const PLAN_PRICE_LABEL: Record<PlanId, string> = {
  FREE: "Free",
  STARTER: "$49/mo",
  GROWTH: "$149/mo",
  SCALE: "$499/mo",
  DEALIFY_STARTER: "$90",
  DEALIFY_PRO: "$140",
};

const PLAN_NAME: Record<PlanId, string> = {
  FREE: "Free",
  STARTER: "Starter",
  GROWTH: "Growth",
  SCALE: "Scale",
  DEALIFY_STARTER: "Dealify Starter",
  DEALIFY_PRO: "Dealify Pro",
};

export const PLAN_OPTIONS: Array<{
  id: PlanId;
  name: string;
  priceLabel: string;
  highlights: string[];
}> = PLAN_IDS.map((id) => ({
  id,
  name: PLAN_NAME[id],
  priceLabel: PLAN_PRICE_LABEL[id],
  highlights: planQuotaFeatures(id),
}));

/** Plan cards offered for purchase — Dealify tiers only. */
export const PURCHASABLE_PLAN_OPTIONS = PLAN_OPTIONS.filter((p) =>
  (PURCHASABLE_PLAN_IDS as string[]).includes(p.id)
);

/** Display order for the marketing pricing section: the free entry point, then Dealify. */
export const LANDING_PLAN_ORDER: PlanId[] = [
  "FREE",
  "DEALIFY_STARTER",
  "DEALIFY_PRO",
];

export function getLandingPlanCards() {
  return LANDING_PLAN_ORDER.map((id) => {
    const option = getPlanOption(id);
    const config = PLAN_CONFIG[id];
    return {
      id,
      name: option.name,
      priceAmount: config.priceAmount,
      priceLabel: option.priceLabel,
      features: option.highlights,
      featured: id === "DEALIFY_PRO",
      /** Dealify tiers are unlocked with a code rather than bought directly. */
      requiresCoupon: isDealifyPlan(id),
    };
  });
}

export function getSubscriptionFieldsForPlan(plan: PlanId) {
  const config = PLAN_CONFIG[plan];
  return {
    plan: plan as SubscriptionPlan,
    priceAmount: config.priceAmount,
    currency: "USD" as const,
    radarScansQuota: config.radarScansQuota,
    bountyGeneratorQuota: config.bountyGeneratorQuota,
    seoPageGenerationQuota: config.seoPageGenerationQuota,
    rivalsAnalysisQuota: config.rivalsAnalysisQuota,
  };
}

export function getPlanOption(plan: PlanId) {
  return PLAN_OPTIONS.find((p) => p.id === plan)!;
}

/** Length of the Dealify entitlement. Server-side only — never expose to a client. */
export const COUPON_TERM_YEARS = 2;

/* ------------------------------------------------------------------ add-ons */

/**
 * Add-ons are billed monthly on top of a Dealify base plan.
 *
 * `add` deltas are multiplied by the purchased quantity and summed onto the base
 * quota; `multiply` factors are applied afterwards. Keys must match the Prisma
 * `AddOnType` enum exactly.
 */
export const ADD_ON_CONFIG = {
  STARTER_BOOST: {
    name: "Starter Boost",
    description: "Adds a Starter tier's worth of monthly usage.",
    priceAmount: 4900,
    mode: "add",
    stackable: true,
    delta: {
      radarScans: 40,
      bountyGenerator: 30,
      seoPageGeneration: 20,
      rivalsAnalysis: 10,
    },
  },
  GROWTH_BOOST: {
    name: "Growth Boost",
    description: "Adds a Growth tier's worth of monthly usage.",
    priceAmount: 14900,
    mode: "add",
    stackable: true,
    delta: {
      radarScans: 150,
      bountyGenerator: 80,
      seoPageGeneration: 60,
      rivalsAnalysis: 20,
    },
  },
  SCALE_BOOST: {
    name: "Scale Boost",
    description: "Adds a Scale tier's worth of monthly usage.",
    priceAmount: 49900,
    mode: "add",
    stackable: true,
    delta: {
      radarScans: 500,
      bountyGenerator: 300,
      seoPageGeneration: 200,
      rivalsAnalysis: 50,
    },
  },
  EXTRA_RIVALS_PACK: {
    name: "Extra Rivals Pack",
    description: "+10 rival analyses each month.",
    priceAmount: 2500,
    mode: "add",
    stackable: true,
    delta: { rivalsAnalysis: 10 },
  },
  AEO_CONTENT_BOOST: {
    name: "AEO Content Boost",
    description: "Doubles your monthly SEO page generation.",
    priceAmount: 2900,
    mode: "multiply",
    stackable: false,
    factor: { seoPageGeneration: 2 },
  },
  ALTERNATE_DAY_AUTOMATION: {
    name: "Alternate-day Automation",
    description: "Runs your automations every other day.",
    priceAmount: 1900,
    mode: "none",
    stackable: false,
  },
} as const;

export type AddOnId = keyof typeof ADD_ON_CONFIG;

const ADD_ON_IDS = Object.keys(ADD_ON_CONFIG) as AddOnId[];

export function isAddOnId(value: string): value is AddOnId {
  return (ADD_ON_IDS as string[]).includes(value);
}

export function isStackableAddOn(addOn: AddOnId): boolean {
  return ADD_ON_CONFIG[addOn].stackable;
}

function formatPriceLabel(priceAmount: number): string {
  if (priceAmount === 0) return "Free";
  return `$${(priceAmount / 100).toFixed(0)}/mo`;
}

export const ADD_ON_OPTIONS: Array<{
  id: AddOnId;
  name: string;
  description: string;
  priceLabel: string;
  priceAmount: number;
  stackable: boolean;
}> = ADD_ON_IDS.map((id) => {
  const c = ADD_ON_CONFIG[id];
  return {
    id,
    name: c.name,
    description: c.description,
    priceLabel: formatPriceLabel(c.priceAmount),
    priceAmount: c.priceAmount,
    stackable: c.stackable,
  };
});

export function getAddOnOption(addOn: AddOnId) {
  return ADD_ON_OPTIONS.find((a) => a.id === addOn)!;
}

const DODO_ADD_ON_PRODUCT_ENV: Record<AddOnId, string> = {
  STARTER_BOOST: "DODO_STARTER_BOOST_PRODUCT_ID",
  GROWTH_BOOST: "DODO_GROWTH_BOOST_PRODUCT_ID",
  SCALE_BOOST: "DODO_SCALE_BOOST_PRODUCT_ID",
  EXTRA_RIVALS_PACK: "DODO_EXTRA_RIVALS_PACK_PRODUCT_ID",
  AEO_CONTENT_BOOST: "DODO_AEO_CONTENT_BOOST_PRODUCT_ID",
  ALTERNATE_DAY_AUTOMATION: "DODO_ALTERNATE_DAY_AUTOMATION_PRODUCT_ID",
};

export function getDodoAddOnProductId(addOn: AddOnId): string {
  const envKey = DODO_ADD_ON_PRODUCT_ENV[addOn];
  const productId = process.env[envKey];
  if (!productId?.trim()) {
    throw new Error(`${envKey} is not configured`);
  }
  return productId.trim();
}
