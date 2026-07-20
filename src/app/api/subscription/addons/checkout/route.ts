import { NextResponse } from "next/server";
import { SubscriptionStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAddOnCheckoutSession } from "@/lib/subscription/dodo-checkout";
import {
  canPurchaseAddOns,
  getAddOnOption,
  isAddOnId,
  isStackableAddOn,
  type PlanId,
} from "@/lib/subscription/plans";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { addOn?: unknown; quantity?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.addOn !== "string" || !isAddOnId(body.addOn)) {
    return NextResponse.json({ error: "A valid add-on is required" }, { status: 400 });
  }

  const addOn = body.addOn;
  const quantity =
    typeof body.quantity === "number" && Number.isInteger(body.quantity)
      ? Math.min(Math.max(body.quantity, 1), 20)
      : 1;

  if (quantity > 1 && !isStackableAddOn(addOn)) {
    return NextResponse.json(
      { error: `${getAddOnOption(addOn).name} cannot be purchased more than once.` },
      { status: 400 }
    );
  }

  const companyId = session.companyId;
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      email: true,
      subscription: {
        select: {
          id: true,
          plan: true,
          status: true,
          addOns: { where: { isActive: true }, select: { addOnType: true } },
        },
      },
    },
  });

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const subscription = company.subscription;
  if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
    return NextResponse.json(
      { error: "An active subscription is required before adding extra usage." },
      { status: 400 }
    );
  }

  if (!canPurchaseAddOns(subscription.plan as PlanId)) {
    return NextResponse.json(
      { error: "Add-ons are available on Dealify plans only." },
      { status: 400 }
    );
  }

  const alreadyHeld = subscription.addOns.some((a) => a.addOnType === addOn);
  if (alreadyHeld && !isStackableAddOn(addOn)) {
    return NextResponse.json(
      { error: `${getAddOnOption(addOn).name} is already active.` },
      { status: 400 }
    );
  }

  if (!company.email?.trim()) {
    return NextResponse.json(
      { error: "Company email is required for billing" },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  if (!appUrl) {
    return NextResponse.json({ error: "App URL is not configured" }, { status: 500 });
  }

  try {
    const checkoutUrl = await createAddOnCheckoutSession({
      companyId,
      addOn,
      quantity,
      customerEmail: company.email.trim(),
      customerName: company.name.trim() || company.email.trim(),
      returnUrl: `${appUrl}/workspace/plan?addon=success`,
    });

    return NextResponse.json({ checkoutUrl });
  } catch (err) {
    console.error("[subscription/addons/checkout]", err);
    const message =
      err instanceof Error && err.message.includes("is not configured")
        ? "Payment configuration is incomplete. Please contact support."
        : "Could not start checkout. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
