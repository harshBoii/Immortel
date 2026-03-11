import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getShopifyConfig } from "./config";

type ShopifyOAuthTokenResponse = {
  access_token: string;
  scope: string;
};

export function normalizeShopDomain(raw: string): string {
  let shop = raw.trim().toLowerCase();
  shop = shop.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  if (!shop.endsWith(".myshopify.com")) {
    shop = `${shop}.myshopify.com`;
  }

  return shop;
}

export function buildInstallUrl(shopDomain: string, state: string): string {
  const { SHOPIFY_API_KEY, scopes, redirectUri } = getShopifyConfig();
  const shop = normalizeShopDomain(shopDomain);

  console.log("[Shopify buildInstallUrl] redirect_uri being used:", redirectUri);

  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", SHOPIFY_API_KEY);
  url.searchParams.set("scope", scopes.join(","));
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return url.toString();
}

export function verifyHmacFromSearchParams(searchParams: URLSearchParams): boolean {
  const { SHOPIFY_API_SECRET } = getShopifyConfig();

  const providedHmac = searchParams.get("hmac") || "";
  if (!providedHmac) return false;

  const sortedParams = [...searchParams.entries()]
    .filter(([key]) => key !== "hmac" && key !== "signature")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const digest = crypto
    .createHmac("sha256", SHOPIFY_API_SECRET)
    .update(sortedParams)
    .digest("hex");

  try {
    return (
      digest.length === providedHmac.length &&
      crypto.timingSafeEqual(Buffer.from(digest, "utf-8"), Buffer.from(providedHmac, "utf-8"))
    );
  } catch {
    return false;
  }
}

export async function exchangeCodeForToken(shopDomain: string, code: string) {
  const { SHOPIFY_API_KEY, SHOPIFY_API_SECRET } = getShopifyConfig();
  const shop = normalizeShopDomain(shopDomain);

  const url = `https://${shop}/admin/oauth/access_token`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET,
      code,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to exchange Shopify OAuth code. Status: ${res.status}. Body: ${text || "N/A"}`
    );
  }

  const data = (await res.json()) as ShopifyOAuthTokenResponse;

  if (!data.access_token) {
    throw new Error("Shopify OAuth response missing access_token");
  }

  return {
    accessToken: data.access_token,
    scopes: data.scope ? data.scope.split(",").map((s) => s.trim()).filter(Boolean) : [],
  };
}

export async function getShopifyClient(shopDomain: string, companyId: string) {
  const shop = normalizeShopDomain(shopDomain);

  const shopRecord = await prisma.shopifyShop.findFirst({
    where: {
      shopDomain: shop,
      companyId,
      status: "installed",
    },
  });

  if (!shopRecord) {
    throw new Error("No active Shopify shop connection found for this company.");
  }

  const baseUrl = `https://${shop}/admin/api/2024-10`;
  const defaultHeaders = {
    "X-Shopify-Access-Token": shopRecord.accessToken,
    "Content-Type": "application/json",
  };

  return {
    shop: shopRecord,
    async get(path: string, init?: RequestInit) {
      const res = await fetch(`${baseUrl}${path}`, {
        ...init,
        method: "GET",
        headers: {
          ...defaultHeaders,
          ...(init?.headers || {}),
        },
      });
      return res;
    },
    async post(path: string, body: unknown, init?: RequestInit) {
      const res = await fetch(`${baseUrl}${path}`, {
        ...init,
        method: "POST",
        headers: {
          ...defaultHeaders,
          ...(init?.headers || {}),
        },
        body: JSON.stringify(body),
      });
      return res;
    },
  };
}

