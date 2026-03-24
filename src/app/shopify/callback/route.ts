import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  exchangeCodeForToken,
  normalizeShopDomain,
  verifyHmacFromSearchParams,
} from "@/lib/shopify/client";

const STATE_COOKIE_NAME = "shopify_oauth_state";

type StateCookiePayload = {
  state: string;
  shop: string;
  companyId: string;
  createdAt: number;
};

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const rawShop = searchParams.get("shop");
  const hmac = searchParams.get("hmac");

  if (!code || !state || !rawShop || !hmac) {
    return NextResponse.json(
      { success: false, error: "Missing required Shopify OAuth parameters" },
      { status: 400 }
    );
  }

  let shop: string;
  try {
    shop = normalizeShopDomain(rawShop);
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid shop domain" },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const rawStateCookie = cookieStore.get(STATE_COOKIE_NAME)?.value;

  if (!rawStateCookie) {
    return NextResponse.json(
      { success: false, error: "Missing OAuth state cookie" },
      { status: 400 }
    );
  }

  let parsed: StateCookiePayload | null = null;
  try {
    parsed = JSON.parse(rawStateCookie) as StateCookiePayload;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid OAuth state cookie" },
      { status: 400 }
    );
  }

  if (!parsed || parsed.state !== state || parsed.shop !== shop) {
    return NextResponse.json(
      { success: false, error: "State validation failed" },
      { status: 400 }
    );
  }

  const MAX_AGE_MS = 10 * 60 * 1000;
  if (Date.now() - parsed.createdAt > MAX_AGE_MS) {
    return NextResponse.json(
      { success: false, error: "OAuth state has expired" },
      { status: 400 }
    );
  }

  if (!(await verifyHmacFromSearchParams(searchParams, parsed.companyId))) {
    return NextResponse.json(
      { success: false, error: "Invalid HMAC signature" },
      { status: 400 }
    );
  }

  cookieStore.delete(STATE_COOKIE_NAME);

  let accessToken: string;
  let scopes: string[];

  try {
    const tokenData = await exchangeCodeForToken(shop, code, parsed.companyId);
    accessToken = tokenData.accessToken;
    scopes = tokenData.scopes;
  } catch (err) {
    console.error("Shopify token exchange failed:", err);
    return NextResponse.json(
      { success: false, error: "Failed to exchange OAuth code for access token" },
      { status: 502 }
    );
  }

  try {
    await prisma.shopifyShop.upsert({
      where: { shopDomain: shop },
      create: {
        companyId: parsed.companyId,
        shopDomain: shop,
        accessToken,
        scopes,
        status: "installed",
      },
      update: {
        companyId: parsed.companyId,
        accessToken,
        scopes,
        status: "installed",
        uninstalledAt: null,
      },
    });
  } catch (err) {
    console.error("Failed to persist Shopify shop record:", err);
    return NextResponse.json(
      { success: false, error: "Failed to persist Shopify shop connection" },
      { status: 500 }
    );
  }

  const redirectUrl = new URL("/", request.url);
  redirectUrl.searchParams.set("shop", shop);

  return NextResponse.redirect(redirectUrl.toString());
}
