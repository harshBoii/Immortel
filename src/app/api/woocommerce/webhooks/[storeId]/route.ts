import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/wordpress/crypto";
import { verifyWooCommerceWebhookSignature } from "@/lib/woocommerce/webhook-verify";

export const runtime = "nodejs";

/**
 * WooCommerce delivers events to this URL. Signature uses the secret set when the webhook was created
 * (see POST /api/woocommerce/webhooks/register). Public route — auth is HMAC only.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await context.params;
  const rawBody = await request.text();
  const sig = request.headers.get("X-WC-Webhook-Signature");

  const store = await prisma.wooCommerceStore.findFirst({
    where: { id: storeId, status: "installed" },
    select: { id: true, webhookSecretEnc: true },
  });

  if (!store?.webhookSecretEnc) {
    return NextResponse.json(
      { error: "Webhook secret not configured for this store. Call POST /api/woocommerce/webhooks/register." },
      { status: 501 }
    );
  }

  let secret: string;
  try {
    secret = decrypt(store.webhookSecretEnc);
  } catch {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  if (!verifyWooCommerceWebhookSignature(rawBody, sig, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Acknowledge delivery; process async work elsewhere if needed.
  return NextResponse.json({ received: true });
}
