import { NextResponse } from "next/server";
import { SubscriptionStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { activateFreePlan } from "@/lib/subscription/activate-free";
import { isDealifyPlan, isFreePlan, isPlanId } from "@/lib/subscription/plans";

/**
 * Plans are no longer sold here. Dealify tiers are activated by coupon, and extra usage
 * is bought through /api/subscription/addons/checkout. The only transition this route
 * still performs is a downgrade to the free fallback.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { plan?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.plan !== "string" || !isPlanId(body.plan)) {
    return NextResponse.json({ error: "A valid plan is required" }, { status: 400 });
  }

  const plan = body.plan;
  const companyId = session.companyId;

  if (isDealifyPlan(plan)) {
    return NextResponse.json(
      { error: "Dealify plans are activated with a coupon code." },
      { status: 400 }
    );
  }

  if (!isFreePlan(plan)) {
    return NextResponse.json(
      {
        error:
          "This plan is no longer available. Extra usage can be added from your plan page.",
      },
      { status: 400 }
    );
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, subscription: { select: { plan: true, status: true } } },
  });

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  if (
    company.subscription?.status === SubscriptionStatus.ACTIVE &&
    company.subscription.plan === plan
  ) {
    return NextResponse.json({ error: "You are already on this plan" }, { status: 400 });
  }

  try {
    await activateFreePlan(companyId);
    return NextResponse.json({ freePlan: true });
  } catch (err) {
    console.error("[subscription/checkout] free plan", err);
    return NextResponse.json(
      { error: "Could not switch to the free plan. Please try again." },
      { status: 500 }
    );
  }
}
