import { prisma } from "@/lib/prisma";
import {
  ADD_ON_OPTIONS,
  PLAN_OPTIONS,
  PURCHASABLE_PLAN_OPTIONS,
  canPurchaseAddOns,
  getAddOnOption,
  isAddOnId,
  isDealifyPlan,
  type PlanId,
} from "@/lib/subscription/plans";
import {
  FEATURES,
  USAGE_FIELD,
  resolveEffectiveQuotas,
  type Feature,
} from "@/lib/subscription/effective-quota";
import { ensureCurrentUsagePeriod } from "@/lib/subscription/rollover";

const FEATURE_LABEL: Record<Feature, string> = {
  radarScans: "Radar scans",
  bountyGenerator: "Bounty generator",
  seoPageGeneration: "SEO page generation",
  rivalsAnalysis: "Rivals analysis",
};

export async function getSubscriptionSummary(companyId: string) {
  await ensureCurrentUsagePeriod(companyId);

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
      plans: PURCHASABLE_PLAN_OPTIONS,
      availableAddOns: [],
      canPurchaseAddOns: false,
    };
  }

  const usageRecord = sub.usage[0] ?? null;
  const quotas = resolveEffectiveQuotas(sub, sub.addOns);

  const features = FEATURES.map((feature) => {
    const used = usageRecord?.[USAGE_FIELD[feature]] ?? 0;
    const quota = quotas[feature];
    const remaining = Math.max(0, quota - used);
    const percentUsed =
      quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;

    return {
      key: feature,
      label: FEATURE_LABEL[feature],
      used,
      quota,
      remaining,
      percentUsed,
    };
  });

  const plan = sub.plan as PlanId;
  const planOption = PLAN_OPTIONS.find((p) => p.id === plan);
  const addOnsUnlocked = canPurchaseAddOns(plan);

  return {
    subscription: {
      plan,
      planName: planOption?.name ?? sub.plan,
      priceLabel: planOption?.priceLabel ?? null,
      status: sub.status,
      currency: sub.currency,
      priceAmount: sub.priceAmount,
      currentPeriodStart: sub.currentPeriodStart?.toISOString() ?? null,
      // The Dealify term is an internal entitlement detail — never send it to a client.
      currentPeriodEnd: isDealifyPlan(plan)
        ? null
        : (sub.currentPeriodEnd?.toISOString() ?? null),
      provider: sub.provider,
    },
    usage: usageRecord
      ? {
          periodStart: usageRecord.periodStart.toISOString(),
          periodEnd: usageRecord.periodEnd.toISOString(),
        }
      : null,
    features,
    addOns: sub.addOns.filter((a) => isAddOnId(a.addOnType)).map((a) => {
      const option = getAddOnOption(a.addOnType as never);
      return {
        type: a.addOnType,
        label: option.name,
        description: option.description,
        priceLabel: option.priceLabel,
        quantity: a.quantity,
        stackable: option.stackable,
      };
    }),
    plans: PURCHASABLE_PLAN_OPTIONS,
    availableAddOns: addOnsUnlocked ? ADD_ON_OPTIONS : [],
    canPurchaseAddOns: addOnsUnlocked,
  };
}
