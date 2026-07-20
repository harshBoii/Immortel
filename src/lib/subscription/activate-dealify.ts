import { BillingCycle, SubscriptionStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  COUPON_TERM_YEARS,
  getSubscriptionFieldsForPlan,
  type DealifyPlanId,
} from "@/lib/subscription/plans";

type TxClient = Prisma.TransactionClient;

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Grant a Dealify entitlement, however it was obtained — redeemed with a code or bought
 * outright. Both routes must produce an identical subscription, so the two-clocks rule
 * lives here and nowhere else:
 *
 *   subscription.currentPeriodEnd -> when the entitlement lapses (multi-year)
 *   subscriptionUsage.periodEnd   -> the monthly quota window, rolled by ensureCurrentUsagePeriod
 *
 * Setting these to the same value is the bug that gave Dealify users one quota bucket
 * for the whole term.
 */
export async function activateDealifyPlan(opts: {
  companyId: string;
  plan: DealifyPlanId;
  provider: string;
  externalId?: string | null;
  metadata?: Prisma.InputJsonValue;
  startedAt?: Date;
  tx?: TxClient;
}) {
  const run = async (tx: TxClient) => {
    const now = opts.startedAt ?? new Date();
    const entitlementEnd = addMonths(now, COUPON_TERM_YEARS * 12);
    const usagePeriodEnd = addMonths(now, 1);
    const fields = getSubscriptionFieldsForPlan(opts.plan);

    const common = {
      ...fields,
      status: SubscriptionStatus.ACTIVE,
      provider: opts.provider,
      cycle: BillingCycle.TWO_YEAR,
      currentPeriodStart: now,
      currentPeriodEnd: entitlementEnd,
      ...(opts.externalId !== undefined ? { externalId: opts.externalId } : {}),
      ...(opts.metadata !== undefined ? { metadata: opts.metadata } : {}),
    };

    const subscription = await tx.subscription.upsert({
      where: { companyId: opts.companyId },
      create: { companyId: opts.companyId, ...common },
      update: common,
    });

    await tx.subscriptionUsage.upsert({
      where: { companyId: opts.companyId },
      create: {
        companyId: opts.companyId,
        subscriptionId: subscription.id,
        periodStart: now,
        periodEnd: usagePeriodEnd,
      },
      update: {
        subscriptionId: subscription.id,
        periodStart: now,
        periodEnd: usagePeriodEnd,
        radarScansUsed: 0,
        bountyGeneratorUsed: 0,
        seoPageGenerationUsed: 0,
        rivalsAnalysisUsed: 0,
      },
    });

    return subscription;
  };

  if (opts.tx) return run(opts.tx);
  return prisma.$transaction(run);
}
