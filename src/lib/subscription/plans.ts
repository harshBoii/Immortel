import type { SubscriptionPlan } from "@prisma/client";

export const PLAN_CONFIG = {
  FREE: {
    priceAmount: 0,
    radarScansQuota: 10,
    bountyGeneratorQuota: 10,
    seoPageGenerationQuota: 5,
    rivalsAnalysisQuota: 2,
  },
  STARTER: {
    priceAmount: 4900, // $49.00
    radarScansQuota: 40,
    bountyGeneratorQuota: 30,
    seoPageGenerationQuota: 20,
    rivalsAnalysisQuota: 10,
  },
  GROWTH: {
    priceAmount: 14900, // $149.00
    radarScansQuota: 150,
    bountyGeneratorQuota: 80,
    seoPageGenerationQuota: 60,
    rivalsAnalysisQuota: 20,
  },
  SCALE: {
    priceAmount: 49900, // $499.00
    radarScansQuota: 500,
    bountyGeneratorQuota: 300,
    seoPageGenerationQuota: 200,
    rivalsAnalysisQuota: 50,
  },
  DEALIFY_STARTER: {
    priceAmount: 9000, // $90 / 2yr
    radarScansQuota: 5,
    bountyGeneratorQuota: 4,
    seoPageGenerationQuota: 16,
    rivalsAnalysisQuota: 0,
  },
  DEALIFY_PRO: {
    priceAmount: 14000, // $140 / 2yr
    radarScansQuota: 9,
    bountyGeneratorQuota: 8,
    seoPageGenerationQuota: 24,
    rivalsAnalysisQuota: 2,
  },
} as const;

export type PlanId = keyof typeof PLAN_CONFIG;

export type PaidPlanId = Exclude<PlanId, "FREE" | "DEALIFY_STARTER" | "DEALIFY_PRO">;

export type DealifyPlanId = "DEALIFY_STARTER" | "DEALIFY_PRO";

const PLAN_IDS = Object.keys(PLAN_CONFIG) as PlanId[];

const DEALIFY_PLAN_IDS: DealifyPlanId[] = ["DEALIFY_STARTER", "DEALIFY_PRO"];

const SIGNUP_PLAN_IDS: PlanId[] = ["FREE", "STARTER", "GROWTH", "SCALE"];

export function isPlanId(value: string): value is PlanId {
  return (PLAN_IDS as string[]).includes(value);
}

export function isFreePlan(plan: PlanId): plan is "FREE" {
  return plan === "FREE";
}

export function isDealifyPlan(plan: PlanId): plan is DealifyPlanId {
  return (DEALIFY_PLAN_IDS as string[]).includes(plan);
}

export function isPaidPlan(plan: PlanId): plan is PaidPlanId {
  return plan !== "FREE" && !isDealifyPlan(plan);
}

export function isDodoCheckoutPlan(plan: PlanId): plan is PaidPlanId {
  return isPaidPlan(plan);
}

function formatPriceLabel(priceAmount: number): string {
  if (priceAmount === 0) return "Free";
  return `$${(priceAmount / 100).toFixed(0)}/mo`;
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

export const PLAN_OPTIONS: Array<{
  id: PlanId;
  name: string;
  priceLabel: string;
  highlights: string[];
}> = [
  {
    id: "FREE",
    name: "Free",
    priceLabel: formatPriceLabel(PLAN_CONFIG.FREE.priceAmount),
    highlights: planQuotaFeatures("FREE"),
  },
  {
    id: "STARTER",
    name: "Starter",
    priceLabel: formatPriceLabel(PLAN_CONFIG.STARTER.priceAmount),
    highlights: planQuotaFeatures("STARTER"),
  },
  {
    id: "GROWTH",
    name: "Growth",
    priceLabel: formatPriceLabel(PLAN_CONFIG.GROWTH.priceAmount),
    highlights: planQuotaFeatures("GROWTH"),
  },
  {
    id: "SCALE",
    name: "Scale",
    priceLabel: formatPriceLabel(PLAN_CONFIG.SCALE.priceAmount),
    highlights: planQuotaFeatures("SCALE"),
  },
  {
    id: "DEALIFY_STARTER",
    name: "Dealify Starter",
    priceLabel: "$90 / 2yr",
    highlights: planQuotaFeatures("DEALIFY_STARTER"),
  },
  {
    id: "DEALIFY_PRO",
    name: "Dealify Pro",
    priceLabel: "$140 / 2yr",
    highlights: planQuotaFeatures("DEALIFY_PRO"),
  },
];

/** Plans shown on the public signup plan picker (excludes coupon-only Dealify tiers). */
export const SIGNUP_PLAN_OPTIONS = PLAN_OPTIONS.filter((p) =>
  (SIGNUP_PLAN_IDS as string[]).includes(p.id)
);

/** Display order for marketing / landing pricing section */
export const LANDING_PLAN_ORDER: PlanId[] = ["FREE", "STARTER", "GROWTH", "SCALE"];

export function getLandingPlanCards() {
  return LANDING_PLAN_ORDER.map((id) => {
    const option = PLAN_OPTIONS.find((p) => p.id === id)!;
    const config = PLAN_CONFIG[id];
    return {
      id,
      name: option.name,
      priceAmount: config.priceAmount,
      priceLabel: option.priceLabel,
      features: option.highlights,
      featured: id === "GROWTH",
    };
  });
}

const DODO_PRODUCT_ENV: Record<PaidPlanId, string> = {
  STARTER: "DODO_STARTER_PRODUCT_ID",
  GROWTH: "DODO_GROWTH_PRODUCT_ID",
  SCALE: "DODO_SCALE_PRODUCT_ID",
};

export function getDodoProductId(plan: PaidPlanId): string {
  const envKey = DODO_PRODUCT_ENV[plan];
  const productId = process.env[envKey];
  if (!productId?.trim()) {
    throw new Error(`${envKey} is not configured`);
  }
  return productId.trim();
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

export const COUPON_TERM_YEARS = 2;

export const ADD_ON_CONFIG = {
  AEO_CONTENT_BOOST: { priceAmount: 2900 }, // $29/mo
  ALTERNATE_DAY_AUTOMATION: { priceAmount: 1900 }, // $19/mo — Growth only
  EXTRA_RIVALS_PACK: { priceAmount: 2500 }, // $25/mo — +10 rivals runs
} as const;
