import { BillingCycle, SubscriptionStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  COUPON_TERM_YEARS,
  getPlanOption,
  getSubscriptionFieldsForPlan,
  isDealifyPlan,
  type DealifyPlanId,
  type PlanId,
} from "@/lib/subscription/plans";

export type CouponErrorCode =
  | "NOT_FOUND"
  | "ALREADY_REDEEMED"
  | "EXPIRED"
  | "INVALID_PLAN"
  | "SUBSCRIPTION_ACTIVE";

export class CouponError extends Error {
  constructor(
    public readonly code: CouponErrorCode,
    message: string
  ) {
    super(message);
    this.name = "CouponError";
  }
}

const COUPON_ERROR_MESSAGES: Record<CouponErrorCode, string> = {
  NOT_FOUND: "Invalid coupon code.",
  ALREADY_REDEEMED: "This coupon has already been used.",
  EXPIRED: "This coupon has expired.",
  INVALID_PLAN: "This coupon is not valid for signup.",
  SUBSCRIPTION_ACTIVE: "This account already has an active subscription.",
};

export function couponErrorMessage(code: CouponErrorCode): string {
  return COUPON_ERROR_MESSAGES[code];
}

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

type TxClient = Prisma.TransactionClient;

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function assertCouponUsable(
  coupon: {
    plan: string;
    redeemedAt: Date | null;
    expiresAt: Date | null;
  } | null
): asserts coupon is { plan: DealifyPlanId; redeemedAt: null; expiresAt: Date | null } {
  if (!coupon) {
    throw new CouponError("NOT_FOUND", couponErrorMessage("NOT_FOUND"));
  }
  if (!isDealifyPlan(coupon.plan as PlanId)) {
    throw new CouponError("INVALID_PLAN", couponErrorMessage("INVALID_PLAN"));
  }
  if (coupon.redeemedAt) {
    throw new CouponError("ALREADY_REDEEMED", couponErrorMessage("ALREADY_REDEEMED"));
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new CouponError("EXPIRED", couponErrorMessage("EXPIRED"));
  }
}

/** Deliberately omits the term — the entitlement length is not disclosed to clients. */
export type CouponValidationSuccess = {
  valid: true;
  plan: DealifyPlanId;
  planName: string;
  amountDue: 0;
};

export type CouponValidationFailure = {
  valid: false;
  code: CouponErrorCode;
  error: string;
};

export async function validateCouponCode(
  code: string
): Promise<CouponValidationSuccess | CouponValidationFailure> {
  const normalized = normalizeCouponCode(code);
  if (!normalized) {
    return {
      valid: false,
      code: "NOT_FOUND",
      error: couponErrorMessage("NOT_FOUND"),
    };
  }

  try {
    const coupon = await prisma.subscriptionCoupon.findUnique({
      where: { code: normalized },
      select: { plan: true, redeemedAt: true, expiresAt: true },
    });
    assertCouponUsable(coupon);
    const plan = coupon.plan as DealifyPlanId;
    return {
      valid: true,
      plan,
      planName: getPlanOption(plan).name,
      amountDue: 0,
    };
  } catch (err) {
    if (err instanceof CouponError) {
      return { valid: false, code: err.code, error: err.message };
    }
    throw err;
  }
}

export async function redeemCouponForCompany(opts: {
  companyId: string;
  code: string;
  tx?: TxClient;
}) {
  const normalized = normalizeCouponCode(opts.code);
  if (!normalized) {
    throw new CouponError("NOT_FOUND", couponErrorMessage("NOT_FOUND"));
  }

  const run = async (tx: TxClient) => {
    const existingSub = await tx.subscription.findUnique({
      where: { companyId: opts.companyId },
      select: { status: true },
    });
    if (existingSub?.status === SubscriptionStatus.ACTIVE) {
      throw new CouponError(
        "SUBSCRIPTION_ACTIVE",
        couponErrorMessage("SUBSCRIPTION_ACTIVE")
      );
    }

    const coupon = await tx.subscriptionCoupon.findUnique({
      where: { code: normalized },
      select: { id: true, plan: true, redeemedAt: true, expiresAt: true },
    });
    assertCouponUsable(coupon);

    const now = new Date();
    const redeemed = await tx.subscriptionCoupon.updateMany({
      where: { id: coupon.id, redeemedAt: null },
      data: {
        redeemedAt: now,
        redeemedByCompanyId: opts.companyId,
      },
    });
    if (redeemed.count !== 1) {
      throw new CouponError("ALREADY_REDEEMED", couponErrorMessage("ALREADY_REDEEMED"));
    }

    const plan = coupon.plan as DealifyPlanId;
    // Two different clocks: the entitlement runs for the full coupon term, but quota is
    // granted monthly and rolled forward by ensureCurrentUsagePeriod.
    const entitlementEnd = addMonths(now, COUPON_TERM_YEARS * 12);
    const usagePeriodEnd = addMonths(now, 1);
    const fields = getSubscriptionFieldsForPlan(plan);

    const subscription = await tx.subscription.upsert({
      where: { companyId: opts.companyId },
      create: {
        companyId: opts.companyId,
        ...fields,
        status: SubscriptionStatus.ACTIVE,
        provider: "coupon",
        cycle: BillingCycle.TWO_YEAR,
        currentPeriodStart: now,
        currentPeriodEnd: entitlementEnd,
        metadata: { couponCode: normalized, couponTermYears: COUPON_TERM_YEARS },
      },
      update: {
        ...fields,
        status: SubscriptionStatus.ACTIVE,
        provider: "coupon",
        cycle: BillingCycle.TWO_YEAR,
        currentPeriodStart: now,
        currentPeriodEnd: entitlementEnd,
        metadata: { couponCode: normalized, couponTermYears: COUPON_TERM_YEARS },
      },
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

    return {
      subscription,
      plan,
      planName: getPlanOption(plan).name,
      couponCode: normalized,
      redeemedAt: now,
    };
  };

  if (opts.tx) {
    return run(opts.tx);
  }
  return prisma.$transaction(run);
}
