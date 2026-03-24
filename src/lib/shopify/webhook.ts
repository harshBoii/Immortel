import crypto from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getShopifyConfig } from "./config";
import { normalizeShopDomain } from "./client";

function safeEqualBase64(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "base64");
    const bufB = Buffer.from(b, "base64");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export async function verifyShopifyWebhook(req: NextRequest): Promise<{
  valid: boolean;
  body: Record<string, unknown> | null;
}> {
  const rawBody = await req.text();
  const hmac = req.headers.get("X-Shopify-Hmac-SHA256");

  if (!hmac) {
    return { valid: false, body: null };
  }

  let bodyJson: Record<string, unknown> | null = null;
  try {
    bodyJson = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return { valid: false, body: null };
  }

  const headerShop = req.headers.get("X-Shopify-Shop-Domain");
  const bodyShop =
    typeof bodyJson.shop_domain === "string"
      ? bodyJson.shop_domain
      : typeof bodyJson.shopDomain === "string"
        ? bodyJson.shopDomain
        : null;

  let companyId: string | null | undefined;
  const shopRaw = headerShop || bodyShop;
  if (shopRaw) {
    try {
      const shop = normalizeShopDomain(shopRaw);
      const shopRow = await prisma.shopifyShop.findUnique({
        where: { shopDomain: shop },
        select: { companyId: true },
      });
      companyId = shopRow?.companyId;
    } catch {
      companyId = undefined;
    }
  }

  let secret: string;
  try {
    const cfg = await getShopifyConfig(companyId ?? null);
    secret = cfg.SHOPIFY_API_SECRET;
  } catch {
    return { valid: false, body: bodyJson };
  }

  const hash = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  const valid = safeEqualBase64(hash, hmac);
  return { valid, body: bodyJson };
}
