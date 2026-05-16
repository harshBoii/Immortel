import type { SubscriptionPlan } from "@prisma/client";

export const PLAN_CONFIG = {
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
} as const;

export type PlanId = keyof typeof PLAN_CONFIG;

const PLAN_IDS = Object.keys(PLAN_CONFIG) as PlanId[];

export function isPlanId(value: string): value is PlanId {
  return (PLAN_IDS as string[]).includes(value);
}

function formatPrice(priceAmount: number): string {
  return `$${(priceAmount / 100).toFixed(0)}/mo`;
}

export const PLAN_OPTIONS: Array<{
  id: PlanId;
  name: string;
  priceLabel: string;
  highlights: string[];
}> = [
  {
    id: "STARTER",
    name: "Starter",
    priceLabel: formatPrice(PLAN_CONFIG.STARTER.priceAmount),
    highlights: [
      `${PLAN_CONFIG.STARTER.radarScansQuota} radar scans`,
      `${PLAN_CONFIG.STARTER.bountyGeneratorQuota} bounty generations`,
      `${PLAN_CONFIG.STARTER.seoPageGenerationQuota} SEO pages`,
      `${PLAN_CONFIG.STARTER.rivalsAnalysisQuota} rival analyses`,
    ],
  },
  {
    id: "GROWTH",
    name: "Growth",
    priceLabel: formatPrice(PLAN_CONFIG.GROWTH.priceAmount),
    highlights: [
      `${PLAN_CONFIG.GROWTH.radarScansQuota} radar scans`,
      `${PLAN_CONFIG.GROWTH.bountyGeneratorQuota} bounty generations`,
      `${PLAN_CONFIG.GROWTH.seoPageGenerationQuota} SEO pages`,
      `${PLAN_CONFIG.GROWTH.rivalsAnalysisQuota} rival analyses`,
    ],
  },
  {
    id: "SCALE",
    name: "Scale",
    priceLabel: formatPrice(PLAN_CONFIG.SCALE.priceAmount),
    highlights: [
      `${PLAN_CONFIG.SCALE.radarScansQuota} radar scans`,
      `${PLAN_CONFIG.SCALE.bountyGeneratorQuota} bounty generations`,
      `${PLAN_CONFIG.SCALE.seoPageGenerationQuota} SEO pages`,
      `${PLAN_CONFIG.SCALE.rivalsAnalysisQuota} rival analyses`,
    ],
  },
];

const DODO_PRODUCT_ENV: Record<PlanId, string> = {
  STARTER: "DODO_STARTER_PRODUCT_ID",
  GROWTH: "DODO_GROWTH_PRODUCT_ID",
  SCALE: "DODO_SCALE_PRODUCT_ID",
};

export function getDodoProductId(plan: PlanId): string {
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

export const ADD_ON_CONFIG = {
  AEO_CONTENT_BOOST: { priceAmount: 2900 }, // $29/mo
  ALTERNATE_DAY_AUTOMATION: { priceAmount: 1900 }, // $19/mo — Growth only
  EXTRA_RIVALS_PACK: { priceAmount: 2500 }, // $25/mo — +10 rivals runs
} as const;
