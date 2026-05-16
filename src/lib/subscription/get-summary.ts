import { AddOnType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PLAN_OPTIONS, type PlanId } from "@/lib/subscription/plans";
import type { Feature } from "@/lib/subscription/check-limit";

const FEATURE_META: Record<
  Feature,
  { label: string; quotaKey: keyof typeof QUOTA_KEYS; usedKey: keyof typeof USED_KEYS }
> = {
  radarScans: {
    label: "Radar scans",
    quotaKey: "radarScansQuota",
    usedKey: "radarScansUsed",
  },
  bountyGenerator: {
    label: "Bounty generator",
    quotaKey: "bountyGeneratorQuota",
    usedKey: "bountyGeneratorUsed",
  },
  seoPageGeneration: {
    label: "SEO page generation",
    quotaKey: "seoPageGenerationQuota",
    usedKey: "seoPageGenerationUsed",
  },
  rivalsAnalysis: {
    label: "Rivals analysis",
    quotaKey: "rivalsAnalysisQuota",
    usedKey: "rivalsAnalysisUsed",
  },
};

const QUOTA_KEYS = {
  radarScansQuota: "radarScansQuota",
  bountyGeneratorQuota: "bountyGeneratorQuota",
  seoPageGenerationQuota: "seoPageGenerationQuota",
  rivalsAnalysisQuota: "rivalsAnalysisQuota",
} as const;

const USED_KEYS = {
  radarScansUsed: "radarScansUsed",
  bountyGeneratorUsed: "bountyGeneratorUsed",
  seoPageGenerationUsed: "seoPageGenerationUsed",
  rivalsAnalysisUsed: "rivalsAnalysisUsed",
} as const;

const FEATURES: Feature[] = [
  "radarScans",
  "bountyGenerator",
  "seoPageGeneration",
  "rivalsAnalysis",
];

const ADD_ON_LABELS: Record<AddOnType, string> = {
  AEO_CONTENT_BOOST: "AEO Content Boost (2× SEO quota)",
  ALTERNATE_DAY_AUTOMATION: "Alternate-day automation",
  EXTRA_RIVALS_PACK: "Extra rivals pack (+10 analyses)",
};

export async function getSubscriptionSummary(companyId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { companyId },
    include: {
      usage: { orderBy: { periodStart: "desc" }, take: 1 },
      addOns: { where: { isActive: true } },
    },
  });

  if (!sub) {
    return {
      subscription: null,
      usage: null,
      features: [],
      addOns: [],
      plans: PLAN_OPTIONS,
    };
  }

  const usageRecord = sub.usage[0] ?? null;
  const extraRivalsPacks = sub.addOns.filter(
    (a) => a.addOnType === AddOnType.EXTRA_RIVALS_PACK
  ).length;
  const hasAeoContentBoost = sub.addOns.some(
    (a) => a.addOnType === AddOnType.AEO_CONTENT_BOOST
  );

  const features = FEATURES.map((feature) => {
    const meta = FEATURE_META[feature];
    const used = usageRecord?.[meta.usedKey] ?? 0;
    const baseQuota = sub[meta.quotaKey];
    const quota =
      feature === "rivalsAnalysis"
        ? baseQuota + extraRivalsPacks * 10
        : feature === "seoPageGeneration" && hasAeoContentBoost
          ? baseQuota * 2
          : baseQuota;
    const remaining = Math.max(0, quota - used);
    const percentUsed = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;

    return {
      key: feature,
      label: meta.label,
      used,
      quota,
      remaining,
      percentUsed,
    };
  });

  const planOption = PLAN_OPTIONS.find((p) => p.id === sub.plan);

  return {
    subscription: {
      plan: sub.plan as PlanId,
      planName: planOption?.name ?? sub.plan,
      priceLabel: planOption?.priceLabel ?? null,
      status: sub.status,
      currency: sub.currency,
      priceAmount: sub.priceAmount,
      currentPeriodStart: sub.currentPeriodStart?.toISOString() ?? null,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      provider: sub.provider,
    },
    usage: usageRecord
      ? {
          periodStart: usageRecord.periodStart.toISOString(),
          periodEnd: usageRecord.periodEnd.toISOString(),
        }
      : null,
    features,
    addOns: sub.addOns.map((a) => ({
      type: a.addOnType,
      label: ADD_ON_LABELS[a.addOnType],
    })),
    plans: PLAN_OPTIONS,
  };
}
