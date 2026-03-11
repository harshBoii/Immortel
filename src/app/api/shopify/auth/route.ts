import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { setAuthCookie } from "@/lib/auth";
import {
  normalizeShopDomain,
  verifyHmacFromSearchParams,
} from "@/lib/shopify/client";

/**
 * Shopify app entry point.
 *
 * When a merchant clicks the app inside the Shopify admin, Shopify sends them
 * here with ?shop=...&hmac=...&timestamp=... (and possibly other params).
 *
 * This route:
 *  1. Validates the HMAC to confirm the request is genuinely from Shopify.
 *  2. Looks up the shop in the DB to see if OAuth has been completed.
 *  3. If yes → sets the auth cookie for the linked company and redirects to "/".
 *  4. If no  → redirects to the OAuth install flow.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  const rawShop = searchParams.get("shop");
  const hmac = searchParams.get("hmac");

  if (!rawShop || !hmac) {
    console.warn("[Shopify Auth] Missing shop or hmac param");
    return NextResponse.json(
      { success: false, error: "Missing required parameters (shop, hmac)" },
      { status: 400 }
    );
  }

  if (!verifyHmacFromSearchParams(searchParams)) {
    console.warn("[Shopify Auth] HMAC verification failed for shop:", rawShop);
    return NextResponse.json(
      { success: false, error: "Invalid HMAC signature" },
      { status: 403 }
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

  const shopRecord = await prisma.shopifyShop.findUnique({
    where: { shopDomain: shop },
    select: { companyId: true, status: true },
  });

  // Shop hasn't completed OAuth yet → kick off the install flow
  if (!shopRecord || shopRecord.status !== "installed") {
    console.log("[Shopify Auth] Shop not installed, redirecting to install:", shop);
    const installUrl = new URL("/api/shopify/install", request.url);
    installUrl.searchParams.set("shop", shop);
    return NextResponse.redirect(installUrl.toString());
  }

  // Shop exists and is installed → auto-authenticate as the linked company
  console.log("[Shopify Auth] Auto-authenticating shop:", shop, "companyId:", shopRecord.companyId);
  await setAuthCookie(shopRecord.companyId);

  const dashboardUrl = new URL("/", request.url);
  dashboardUrl.searchParams.set("shop", shop);
  return NextResponse.redirect(dashboardUrl.toString());
}
