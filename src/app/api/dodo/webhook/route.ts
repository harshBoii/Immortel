import { NextResponse } from "next/server";
import DodoPayments from "dodopayments";
import { prisma } from "@/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";

// Initialise the Dodo client with your webhook key so .unwrap() can verify
// signatures for you automatically.
const dodo = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
  environment: (process.env.DODO_PAYMENTS_ENVIRONMENT ?? "test_mode") as
    | "test_mode"
    | "live_mode",
  webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_SECRET!,
});

// Map every Dodo subscription event type → your Prisma enum value.
const EVENT_STATUS_MAP: Record<string, SubscriptionStatus> = {
  "subscription.active":       SubscriptionStatus.ACTIVE,
  "subscription.renewed":      SubscriptionStatus.ACTIVE,
  "subscription.plan_changed": SubscriptionStatus.ACTIVE,
  "subscription.on_hold":      SubscriptionStatus.ON_HOLD,
  "subscription.cancelled":    SubscriptionStatus.CANCELLED,
  "subscription.failed":       SubscriptionStatus.FAILED,
  "subscription.expired":      SubscriptionStatus.EXPIRED,
};

export async function POST(req: Request) {
  // ─── 1. Read raw body ────────────────────────────────────────────────────
  // Must be a raw string for HMAC verification — do NOT call req.json() first.
  const rawBody = await req.text();

  // ─── 2. Verify signature + parse payload ─────────────────────────────────
  // .unwrap() throws if the signature is invalid. Catch → 401.
  let event: ReturnType<typeof dodo.webhooks.unwrap>;
  try {
    event = dodo.webhooks.unwrap(rawBody, {
      headers: {
        "webhook-id":        req.headers.get("webhook-id") ?? "",
        "webhook-signature": req.headers.get("webhook-signature") ?? "",
        "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
      },
    });
  } catch (err) {
    console.error("[dodo/webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // ─── 3. Acknowledge immediately (Dodo requires 2xx within 15 s) ──────────
  // We kick off processing asynchronously so we never time out.
  processEvent(event, req.headers.get("webhook-id") ?? "").catch((err) =>
    console.error("[dodo/webhook] async processing error:", err)
  );

  return NextResponse.json({ received: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// Async processor — runs after 200 is already sent to Dodo
// ─────────────────────────────────────────────────────────────────────────────
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

  // ── Idempotency guard ────────────────────────────────────────────────────
  // Only subscription events are relevant here — skip everything else early.
  if (!EVENT_STATUS_MAP[type]) {
    console.log(`[dodo/webhook] ignoring event type: ${type}`);
    return;
  }

  const newStatus = EVENT_STATUS_MAP[type];
  const subscriptionId = data.subscription_id;
  const companyId = data.metadata?.companyId;

  // ── Resolve the company ───────────────────────────────────────────────────
  // Primary:  metadata.companyId  (set at checkout session creation)
  // Fallback: customer.email       (in case metadata was lost)
  let company: { id: string; subscriptionStatus: SubscriptionStatus } | null = null;

  if (companyId) {
    company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, subscriptionStatus: true },
    });
  }

  if (!company && data.customer?.email) {
    company = await prisma.company.findUnique({
      where: { email: data.customer.email },
      select: { id: true, subscriptionStatus: true },
    });
  }

  if (!company) {
    // This can happen for external/rival companies — safe to ignore.
    console.warn(
      `[dodo/webhook] no company found for event ${type} | ` +
        `companyId=${companyId} | webhookId=${webhookId}`
    );
    return;
  }

  // ── Skip redundant writes ─────────────────────────────────────────────────
  // Dodo may retry the same event. If the status is already correct, skip.
  if (company.subscriptionStatus === newStatus && type !== "subscription.renewed") {
    console.log(
      `[dodo/webhook] status already ${newStatus} for company ${company.id} — skipping`
    );
    return;
  }

  // ── Update the database ───────────────────────────────────────────────────
  await prisma.company.update({
    where: { id: company.id },
    data: {
      subscriptionId:        subscriptionId ?? undefined,
      subscriptionStatus:    newStatus,
      subscriptionUpdatedAt: new Date(),
      // Only set subscriptionCreatedAt the first time (when going ACTIVE)
      ...(type === "subscription.active" && data.created_at
        ? { subscriptionCreatedAt: new Date(data.created_at) }
        : {}),
    },
  });

  console.log(
    `[dodo/webhook] ✓ company ${company.id} → ${newStatus} ` +
      `(event: ${type}, sub: ${subscriptionId})`
  );

  // ── Post-activation side effects ──────────────────────────────────────────
  // Trigger geo/auto-seed internally when a company activates for the first time.
  // This replaces the auto-seed call that was previously in the register route.
  if (type === "subscription.active") {
    await triggerGeoAutoSeed(company.id);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal geo auto-seed trigger
// Called server-side so it doesn't need an auth cookie.
// Replace the body with a direct service call if you have one; this approach
// calls the existing REST endpoint with a secret service key.
// ─────────────────────────────────────────────────────────────────────────────
async function triggerGeoAutoSeed(companyId: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/geo/auto-seed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Use a shared secret so the endpoint knows this is a trusted internal call.
        // Add `if (req.headers.get('x-internal-secret') !== process.env.INTERNAL_SECRET) return 401`
        // inside /api/geo/auto-seed to verify it.
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
    // Non-fatal — auto-seed can be retried from the dashboard
    console.error(`[dodo/webhook] geo/auto-seed error for ${companyId}:`, err);
  }
}