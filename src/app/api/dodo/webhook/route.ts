import { NextResponse } from "next/server";
import DodoPayments from "dodopayments";
import { prisma } from "@/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";
import { activateDealifyPlan } from "@/lib/subscription/activate-dealify";
import {
  ADD_ON_CONFIG,
  getSubscriptionFieldsForPlan,
  isAddOnId,
  isDealifyPlan,
  isPlanId,
  isStackableAddOn,
} from "@/lib/subscription/plans";
import { triggerGeoAutoSeed } from "@/lib/subscription/trigger-geo-auto-seed";

const dodo = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
  environment: (process.env.DODO_PAYMENTS_ENVIRONMENT ?? "test_mode") as
    | "test_mode"
    | "live_mode",
  webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_SECRET!,
});

const EVENT_STATUS_MAP: Record<string, SubscriptionStatus> = {
  "subscription.active": SubscriptionStatus.ACTIVE,
  "subscription.renewed": SubscriptionStatus.ACTIVE,
  "subscription.plan_changed": SubscriptionStatus.ACTIVE,
  "subscription.on_hold": SubscriptionStatus.ON_HOLD,
  "subscription.cancelled": SubscriptionStatus.CANCELLED,
  "subscription.failed": SubscriptionStatus.FAILED,
  "subscription.expired": SubscriptionStatus.EXPIRED,
};

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export async function POST(req: Request) {
  const rawBody = await req.text();

  let event: ReturnType<typeof dodo.webhooks.unwrap>;
  try {
    event = dodo.webhooks.unwrap(rawBody, {
      headers: {
        "webhook-id": req.headers.get("webhook-id") ?? "",
        "webhook-signature": req.headers.get("webhook-signature") ?? "",
        "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
      },
    });
  } catch (err) {
    console.error("[dodo/webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  processEvent(event, req.headers.get("webhook-id") ?? "").catch((err) =>
    console.error("[dodo/webhook] async processing error:", err)
  );

  return NextResponse.json({ received: true });
}

async function processEvent(
  event: ReturnType<typeof dodo.webhooks.unwrap>,
  webhookId: string
) {
  const { type, data } = event as {
    type: string;
    data: {
      subscription_id?: string;
      payment_id?: string;
      status?: string;
      metadata?: Record<string, string>;
      created_at?: string;
      customer?: { email?: string };
    };
  };

  // Dealify plans are sold as a one-time charge, so their activation arrives as
  // payment.succeeded rather than any subscription.* event.
  if (data.metadata?.intent === "plan_purchase") {
    await processPlanPurchaseEvent({
      type,
      companyId: data.metadata?.companyId,
      customerEmail: data.customer?.email,
      planRaw: data.metadata?.plan,
      paymentId: data.payment_id,
      createdAt: data.created_at,
      webhookId,
    });
    return;
  }

  if (!EVENT_STATUS_MAP[type]) {
    console.log(`[dodo/webhook] ignoring event type: ${type}`);
    return;
  }

  const newStatus = EVENT_STATUS_MAP[type];
  const subscriptionId = data.subscription_id;
  const companyId = data.metadata?.companyId;
  const planRaw = data.metadata?.plan;
  const planFields =
    typeof planRaw === "string" && isPlanId(planRaw)
      ? getSubscriptionFieldsForPlan(planRaw)
      : {};

  let company: {
    id: string;
    subscription: { id: string; status: SubscriptionStatus } | null;
  } | null = null;

  if (companyId) {
    company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        subscription: { select: { id: true, status: true } },
      },
    });
  }

  if (!company && data.customer?.email) {
    company = await prisma.company.findUnique({
      where: { email: data.customer.email },
      select: {
        id: true,
        subscription: { select: { id: true, status: true } },
      },
    });
  }

  if (!company) {
    console.warn(
      `[dodo/webhook] no company found for event ${type} | ` +
        `companyId=${companyId} | webhookId=${webhookId}`
    );
    return;
  }

  // Add-on events layer usage onto an existing plan — they must never touch the
  // subscription's plan or quota fields, so they are handled entirely separately.
  if (data.metadata?.intent === "addon_purchase") {
    await processAddOnEvent({
      type,
      companyId: company.id,
      subscriptionRowId: company.subscription?.id ?? null,
      addOnRaw: data.metadata?.addOnType,
      quantityRaw: data.metadata?.quantity,
      externalId: subscriptionId,
      webhookId,
    });
    return;
  }

  const isActivation = type === "subscription.active";
  const isPlanChange = type === "subscription.plan_changed";
  const periodStart =
    isActivation && data.created_at ? new Date(data.created_at) : undefined;

  const statusUnchanged =
    company.subscription?.status === newStatus && type !== "subscription.renewed";

  const shouldSyncSubscription =
    !statusUnchanged ||
    isPlanChange ||
    Object.keys(planFields).length > 0;

  if (shouldSyncSubscription) {
    const subscription = await prisma.subscription.upsert({
      where: { companyId: company.id },
      create: {
        companyId: company.id,
        status: newStatus,
        provider: "dodopayments",
        externalId: subscriptionId ?? null,
        ...planFields,
        ...(periodStart ? { currentPeriodStart: periodStart } : {}),
      },
      update: {
        status: newStatus,
        provider: "dodopayments",
        externalId: subscriptionId ?? undefined,
        ...(Object.keys(planFields).length > 0 ? planFields : {}),
        ...(periodStart ? { currentPeriodStart: periodStart } : {}),
      },
    });

    if (isActivation) {
      const start = periodStart ?? subscription.currentPeriodStart ?? new Date();
      const end = addMonths(start, 1);

      await prisma.subscriptionUsage.upsert({
        where: { companyId: company.id },
        create: {
          companyId: company.id,
          subscriptionId: subscription.id,
          periodStart: start,
          periodEnd: end,
        },
        update: {},
      });
    }

    console.log(
      `[dodo/webhook] ✓ company ${company.id} → ${newStatus} ` +
        `(event: ${type}, sub: ${subscriptionId}, plan: ${planRaw ?? "—"})`
    );
  } else if (isActivation) {
    const subscription = await prisma.subscription.findUnique({
      where: { companyId: company.id },
      select: { id: true, currentPeriodStart: true },
    });
    if (subscription) {
      const start = periodStart ?? subscription.currentPeriodStart ?? new Date();
      const end = addMonths(start, 1);
      await prisma.subscriptionUsage.upsert({
        where: { companyId: company.id },
        create: {
          companyId: company.id,
          subscriptionId: subscription.id,
          periodStart: start,
          periodEnd: end,
        },
        update: {},
      });
    }
    console.log(
      `[dodo/webhook] status already ${newStatus} for company ${company.id} — ensured usage row`
    );
  } else {
    console.log(
      `[dodo/webhook] status already ${newStatus} for company ${company.id} — skipping`
    );
  }

  const isNewSignup =
    isActivation && data.metadata?.intent !== "plan_change";

  if (isNewSignup) {
    await triggerGeoAutoSeed(company.id);
  }
}

const PLAN_PURCHASE_FAILURE_EVENTS = new Set([
  "payment.failed",
  "payment.cancelled",
]);

async function processPlanPurchaseEvent(opts: {
  type: string;
  companyId?: string;
  customerEmail?: string;
  planRaw?: string;
  paymentId?: string;
  createdAt?: string;
  webhookId: string;
}) {
  const { type, planRaw, paymentId, webhookId } = opts;

  if (type !== "payment.succeeded" && !PLAN_PURCHASE_FAILURE_EVENTS.has(type)) {
    console.log(`[dodo/webhook] ignoring plan-purchase event type: ${type}`);
    return;
  }

  let company: { id: string } | null = null;
  if (opts.companyId) {
    company = await prisma.company.findUnique({
      where: { id: opts.companyId },
      select: { id: true },
    });
  }
  if (!company && opts.customerEmail) {
    company = await prisma.company.findUnique({
      where: { email: opts.customerEmail },
      select: { id: true },
    });
  }

  if (!company) {
    console.warn(
      `[dodo/webhook] no company for plan-purchase ${type} | ` +
        `companyId=${opts.companyId} | webhookId=${webhookId}`
    );
    return;
  }

  if (PLAN_PURCHASE_FAILURE_EVENTS.has(type)) {
    // Leave the row PENDING rather than ACTIVE so no quota is ever granted.
    await prisma.subscription.updateMany({
      where: { companyId: company.id, status: SubscriptionStatus.PENDING },
      data: { status: SubscriptionStatus.FAILED },
    });
    console.log(`[dodo/webhook] ✓ plan purchase ${type} for company ${company.id}`);
    return;
  }

  if (!planRaw || !isPlanId(planRaw) || !isDealifyPlan(planRaw)) {
    console.warn(
      `[dodo/webhook] plan-purchase with unusable plan=${planRaw} | webhookId=${webhookId}`
    );
    return;
  }

  const startedAt = opts.createdAt ? new Date(opts.createdAt) : new Date();

  await activateDealifyPlan({
    companyId: company.id,
    plan: planRaw,
    provider: "dodopayments",
    externalId: paymentId ?? null,
    metadata: { purchasedPaymentId: paymentId ?? null },
    startedAt: Number.isNaN(startedAt.getTime()) ? new Date() : startedAt,
  });

  await triggerGeoAutoSeed(company.id);

  console.log(
    `[dodo/webhook] ✓ plan ${planRaw} purchased and activated for company ${company.id}`
  );
}

const ADD_ON_ACTIVE_EVENTS = new Set([
  "subscription.active",
  "subscription.renewed",
]);

const ADD_ON_INACTIVE_EVENTS = new Set([
  "subscription.cancelled",
  "subscription.expired",
  "subscription.failed",
]);

async function processAddOnEvent(opts: {
  type: string;
  companyId: string;
  subscriptionRowId: string | null;
  addOnRaw?: string;
  quantityRaw?: string;
  externalId?: string;
  webhookId: string;
}) {
  const { type, companyId, subscriptionRowId, addOnRaw, externalId, webhookId } = opts;

  if (!addOnRaw || !isAddOnId(addOnRaw)) {
    console.warn(
      `[dodo/webhook] add-on event with unknown addOnType=${addOnRaw} | webhookId=${webhookId}`
    );
    return;
  }

  if (!subscriptionRowId) {
    console.warn(
      `[dodo/webhook] add-on event for company ${companyId} with no subscription row`
    );
    return;
  }

  const addOn = addOnRaw;
  const parsedQty = Number.parseInt(opts.quantityRaw ?? "1", 10);
  const quantity =
    Number.isFinite(parsedQty) && parsedQty > 0 && isStackableAddOn(addOn)
      ? parsedQty
      : 1;

  if (ADD_ON_INACTIVE_EVENTS.has(type)) {
    await prisma.subscriptionAddOn.updateMany({
      where: { subscriptionId: subscriptionRowId, addOnType: addOn, isActive: true },
      data: { isActive: false, cancelledAt: new Date() },
    });
    console.log(`[dodo/webhook] ✓ deactivated add-on ${addOn} for company ${companyId}`);
    return;
  }

  if (!ADD_ON_ACTIVE_EVENTS.has(type)) {
    console.log(`[dodo/webhook] ignoring add-on event type: ${type}`);
    return;
  }

  const config = ADD_ON_CONFIG[addOn];

  // A renewal must not keep stacking quantity, so only a fresh activation increments.
  const existing = await prisma.subscriptionAddOn.findUnique({
    where: { subscriptionId_addOnType: { subscriptionId: subscriptionRowId, addOnType: addOn } },
    select: { id: true, isActive: true, quantity: true },
  });

  const nextQuantity =
    existing?.isActive && type === "subscription.active" && isStackableAddOn(addOn)
      ? existing.quantity + quantity
      : quantity;

  await prisma.subscriptionAddOn.upsert({
    where: {
      subscriptionId_addOnType: { subscriptionId: subscriptionRowId, addOnType: addOn },
    },
    create: {
      subscriptionId: subscriptionRowId,
      addOnType: addOn,
      priceAmount: config.priceAmount,
      quantity: nextQuantity,
      externalId: externalId ?? null,
      isActive: true,
    },
    update: {
      priceAmount: config.priceAmount,
      quantity: nextQuantity,
      externalId: externalId ?? undefined,
      isActive: true,
      cancelledAt: null,
    },
  });

  console.log(
    `[dodo/webhook] ✓ add-on ${addOn} ×${nextQuantity} active for company ${companyId}`
  );
}
