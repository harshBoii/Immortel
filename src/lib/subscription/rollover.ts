import { SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Roll the usage window forward to cover `now`, zeroing counters for each month crossed.
 *
 * Quota is monthly, but the Dealify entitlement runs for a multi-year term, so the usage
 * period and the subscription period are deliberately different clocks: `periodEnd` on
 * the usage row advances monthly while `currentPeriodEnd` on the subscription marks when
 * the entitlement itself lapses.
 *
 * This runs lazily on read rather than on a schedule — the project has no job runner, and
 * quota only ever matters at check time.
 */
export async function ensureCurrentUsagePeriod(companyId: string) {
  const now = new Date();

  const sub = await prisma.subscription.findUnique({
    where: { companyId },
    select: {
      id: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      usage: {
        orderBy: { periodStart: "desc" },
        take: 1,
        select: { id: true, periodStart: true, periodEnd: true },
      },
    },
  });

  if (!sub || sub.status !== SubscriptionStatus.ACTIVE) return;

  // The entitlement itself has run out — expire rather than granting a fresh month.
  if (sub.currentPeriodEnd && sub.currentPeriodEnd <= now) {
    await prisma.subscription.updateMany({
      where: { id: sub.id, status: SubscriptionStatus.ACTIVE },
      data: { status: SubscriptionStatus.EXPIRED },
    });
    return;
  }

  const usage = sub.usage[0];
  if (!usage) {
    const periodStart = sub.currentPeriodStart ?? now;
    await prisma.subscriptionUsage.upsert({
      where: { companyId },
      create: {
        companyId,
        subscriptionId: sub.id,
        periodStart,
        periodEnd: clampToEntitlement(addMonths(periodStart, 1), sub.currentPeriodEnd),
      },
      update: {},
    });
    return;
  }

  if (usage.periodEnd > now) return;

  // Advance whole months from the existing boundary so windows stay aligned to the
  // original signup day rather than drifting to whenever the user happened to return.
  let periodStart = usage.periodEnd;
  let periodEnd = addMonths(periodStart, 1);
  let guard = 0;
  while (periodEnd <= now && guard < 600) {
    periodStart = periodEnd;
    periodEnd = addMonths(periodEnd, 1);
    guard += 1;
  }

  const clampedEnd = clampToEntitlement(periodEnd, sub.currentPeriodEnd);

  // Guarded on the old boundary so two concurrent requests can't both reset the counters.
  await prisma.subscriptionUsage.updateMany({
    where: { id: usage.id, periodEnd: usage.periodEnd },
    data: {
      subscriptionId: sub.id,
      periodStart,
      periodEnd: clampedEnd,
      radarScansUsed: 0,
      bountyGeneratorUsed: 0,
      seoPageGenerationUsed: 0,
      rivalsAnalysisUsed: 0,
    },
  });
}

function clampToEntitlement(periodEnd: Date, entitlementEnd: Date | null): Date {
  if (entitlementEnd && periodEnd > entitlementEnd) return entitlementEnd;
  return periodEnd;
}
