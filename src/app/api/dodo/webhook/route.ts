import { NextResponse } from "next/server";
import DodoPayments from "dodopayments";
import { prisma } from "@/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";
import {
  getSubscriptionFieldsForPlan,
  isPlanId,
} from "@/lib/subscription/plans";

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
      status?: string;
      metadata?: Record<string, string>;
      created_at?: string;
      customer?: { email?: string };
    };
  };

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

  const isActivation = type === "subscription.active";
  const periodStart =
    isActivation && data.created_at ? new Date(data.created_at) : undefined;

  const statusUnchanged =
    company.subscription?.status === newStatus && type !== "subscription.renewed";

  if (!statusUnchanged) {
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
        `(event: ${type}, sub: ${subscriptionId})`
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

  if (isActivation) {
    await triggerGeoAutoSeed(company.id);
  }
}

async function triggerGeoAutoSeed(companyId: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/geo/auto-seed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.INTERNAL_SECRET ?? "",
        "x-company-id": companyId,
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn(`[dodo/webhook] geo/auto-seed failed for ${companyId}:`, body);
    } else {
      console.log(`[dodo/webhook] geo/auto-seed triggered for ${companyId}`);
    }
  } catch (err) {
    console.error(`[dodo/webhook] geo/auto-seed error for ${companyId}:`, err);
  }
}
