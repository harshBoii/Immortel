import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAppBaseUrl } from "@/lib/http/get-app-base-url";
import { encrypt } from "@/lib/wordpress/crypto";
import { prisma } from "@/lib/prisma";
import { getWooCommerceRestApiForCompany, parseWooCommerceAxiosError } from "@/lib/woocommerce/client";

export const runtime = "nodejs";

/**
 * Creates a WooCommerce webhook pointing at /api/woocommerce/webhooks/[storeId] and stores the shared
 * secret (encrypted) for X-WC-Webhook-Signature verification.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    topic?: string;
    name?: string;
  };
  const topic = typeof body.topic === "string" && body.topic.trim() ? body.topic.trim() : "order.created";
  const name =
    typeof body.name === "string" && body.name.trim() ? body.name.trim() : "Immortel webhook";

  const resolved = await getWooCommerceRestApiForCompany(session.companyId);
  if (!resolved.ok) {
    return NextResponse.json(
      { success: false, error: "No WooCommerce store connected" },
      { status: 404 }
    );
  }

  const { client, store } = resolved;
  const baseUrl = getAppBaseUrl(req);
  if (!baseUrl.startsWith("https://")) {
    return NextResponse.json(
      { success: false, error: "HTTPS app base URL required for webhook delivery" },
      { status: 400 }
    );
  }

  const secret = randomBytes(24).toString("hex");
  const deliveryUrl = `${baseUrl}/api/woocommerce/webhooks/${store.id}`;

  try {
    await client.post("webhooks", {
      name,
      topic,
      delivery_url: deliveryUrl,
      secret,
    });
  } catch (e) {
    const parsed = parseWooCommerceAxiosError(e);
    return NextResponse.json(
      {
        success: false,
        error: parsed.message,
        code: parsed.code,
        httpStatus: parsed.httpStatus,
      },
      { status: parsed.httpStatus && parsed.httpStatus < 500 ? parsed.httpStatus : 502 }
    );
  }

  let webhookSecretEnc: string;
  try {
    webhookSecretEnc = encrypt(secret);
  } catch {
    return NextResponse.json({ success: false, error: "Encryption failed" }, { status: 500 });
  }

  await prisma.wooCommerceStore.update({
    where: { id: store.id },
    data: { webhookSecretEnc },
  });

  return NextResponse.json({
    success: true,
    data: {
      storeId: store.id,
      deliveryUrl,
      topic,
    },
  });
}
