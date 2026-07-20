import { SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSubscriptionFieldsForPlan } from "@/lib/subscription/plans";

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Activate or switch a company to the free tier without Dodo checkout.
 *
 * Intentionally has no callers in the request path: the free tier is not obtainable at
 * signup and is reserved for legacy accounts and internal teams. This is the supported
 * way to provision it manually (script or console) — don't wire it back into signup.
 */
export async function activateFreePlan(companyId: string) {
  const now = new Date();
  const periodEnd = addMonths(now, 1);
  const fields = getSubscriptionFieldsForPlan("FREE");

  const subscription = await prisma.subscription.upsert({
    where: { companyId },
    create: {
      companyId,
      ...fields,
      status: SubscriptionStatus.ACTIVE,
      provider: "free",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
    update: {
      ...fields,
      status: SubscriptionStatus.ACTIVE,
      provider: "free",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  });

  await prisma.subscriptionUsage.upsert({
    where: { companyId },
    create: {
      companyId,
      subscriptionId: subscription.id,
      periodStart: now,
      periodEnd,
    },
    update: {
      subscriptionId: subscription.id,
      periodStart: now,
      periodEnd,
    },
  });

  return subscription;
}
