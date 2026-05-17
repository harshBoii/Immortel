import { NextResponse } from "next/server";
import { SubscriptionStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { activateFreePlan } from "@/lib/subscription/activate-free";
import { createPlanCheckoutSession } from "@/lib/subscription/dodo-checkout";
import {
  getSubscriptionFieldsForPlan,
  isFreePlan,
  isPaidPlan,
  isPlanId,
} from "@/lib/subscription/plans";

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

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      email: true,
      subscription: { select: { plan: true, status: true } },
    },
  });

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  if (!company.email?.trim()) {
    return NextResponse.json(
      { error: "Company email is required for billing" },
      { status: 400 }
    );
  }

  if (
    company.subscription?.status === SubscriptionStatus.ACTIVE &&
    company.subscription.plan === plan
  ) {
    return NextResponse.json(
      { error: "You are already on this plan" },
      { status: 400 }
    );
  }

  if (isFreePlan(plan)) {
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

  if (!isPaidPlan(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  if (!appUrl) {
    return NextResponse.json(
      { error: "App URL is not configured" },
      { status: 500 }
    );
  }

  try {
    const subscriptionFields = getSubscriptionFieldsForPlan(plan);
    const isActive = company.subscription?.status === SubscriptionStatus.ACTIVE;

    // Keep ACTIVE companies on their current plan until Dodo confirms payment.
    if (!isActive) {
      await prisma.subscription.upsert({
        where: { companyId },
        create: {
          companyId,
          ...subscriptionFields,
          status: SubscriptionStatus.PENDING,
          provider: "dodopayments",
        },
        update: {
          ...subscriptionFields,
          status: SubscriptionStatus.PENDING,
          provider: "dodopayments",
        },
      });
    }

    const checkoutUrl = await createPlanCheckoutSession({
      companyId,
      plan,
      customerEmail: company.email.trim(),
      customerName: company.name.trim() || company.email.trim(),
      returnUrl: `${appUrl}/workspace/plan?checkout=success`,
    });

    return NextResponse.json({ checkoutUrl });
  } catch (err) {
    console.error("[subscription/checkout]", err);
    const message =
      err instanceof Error && err.message.includes("is not configured")
        ? "Payment configuration is incomplete. Please contact support."
        : "Could not start checkout. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
