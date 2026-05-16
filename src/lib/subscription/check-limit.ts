import { AddOnType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type Feature =
  | "radarScans"
  | "bountyGenerator"
  | "seoPageGeneration"
  | "rivalsAnalysis";

const USAGE_FIELD = {
  radarScans: "radarScansUsed",
  bountyGenerator: "bountyGeneratorUsed",
  seoPageGeneration: "seoPageGenerationUsed",
  rivalsAnalysis: "rivalsAnalysisUsed",
} as const;

const QUOTA_FIELD = {
  radarScans: "radarScansQuota",
  bountyGenerator: "bountyGeneratorQuota",
  seoPageGeneration: "seoPageGenerationQuota",
  rivalsAnalysis: "rivalsAnalysisQuota",
} as const;

export class SubscriptionLimitError extends Error {
  constructor(
    message: string,
    public readonly usage?: { used: number; quota: number; remaining: number }
  ) {
    super(message);
    this.name = "SubscriptionLimitError";
  }
}

export async function requireLimit(companyId: string, feature: Feature) {
  const limit = await checkLimit(companyId, feature);
  if (!limit.allowed) {
    const usage =
      "used" in limit &&
      typeof limit.used === "number" &&
      typeof limit.quota === "number" &&
      typeof limit.remaining === "number"
        ? { used: limit.used, quota: limit.quota, remaining: limit.remaining }
        : undefined;
    throw new SubscriptionLimitError(
      "reason" in limit && limit.reason ? limit.reason : "Quota exceeded",
      usage
    );
  }
  return limit;
}

export async function checkLimit(companyId: string, feature: Feature) {
  const sub = await prisma.subscription.findUnique({
    where: { companyId },
    include: {
      usage: true,
      addOns: { where: { isActive: true } },
    },
  });

  if (!sub || sub.status !== "ACTIVE") {
    return { allowed: false, reason: "No active subscription" };
  }

  const usageRecord = sub.usage[0];
  const used = usageRecord?.[USAGE_FIELD[feature]] ?? 0;
  const quota = sub[QUOTA_FIELD[feature]];

  const extraRivalsPacks = sub.addOns.filter(
    (a) => a.addOnType === AddOnType.EXTRA_RIVALS_PACK
  ).length;
  const hasAeoContentBoost = sub.addOns.some(
    (a) => a.addOnType === AddOnType.AEO_CONTENT_BOOST
  );

  const effectiveQuota =
    feature === "rivalsAnalysis"
      ? quota + extraRivalsPacks * 10
      : feature === "seoPageGeneration" && hasAeoContentBoost
        ? quota * 2
        : quota;

  const remaining = effectiveQuota - used;

  return {
    allowed: remaining > 0,
    used,
    quota: effectiveQuota,
    remaining: Math.max(0, remaining),
    percentUsed:
      effectiveQuota > 0 ? Math.round((used / effectiveQuota) * 100) : 0,
  };
}
