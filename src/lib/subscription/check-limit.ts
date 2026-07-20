import { prisma } from "@/lib/prisma";
import {
  resolveEffectiveQuotas,
  USAGE_FIELD,
  type Feature,
} from "@/lib/subscription/effective-quota";
import { ensureCurrentUsagePeriod } from "@/lib/subscription/rollover";

export type { Feature };

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
  await ensureCurrentUsagePeriod(companyId);

  const sub = await prisma.subscription.findUnique({
    where: { companyId },
    include: {
      usage: { orderBy: { periodStart: "desc" }, take: 1 },
      addOns: { where: { isActive: true } },
    },
  });

  if (!sub || sub.status !== "ACTIVE") {
    return { allowed: false, reason: "No active subscription" };
  }

  const usageRecord = sub.usage[0];
  const used = usageRecord?.[USAGE_FIELD[feature]] ?? 0;
  const effectiveQuota = resolveEffectiveQuotas(sub, sub.addOns)[feature];
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
