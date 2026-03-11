import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { buildInstallUrl, normalizeShopDomain } from "@/lib/shopify/client";

const STATE_COOKIE_NAME = "shopify_oauth_state";
const STATE_COOKIE_MAX_AGE = 60 * 10; // 10 minutes

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawShop = searchParams.get("shop");

  if (!rawShop) {
    return NextResponse.json(
      { success: false, error: "Missing shop parameter" },
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

  if (!/^[a-z0-9-]+\.myshopify\.com$/.test(shop)) {
    return NextResponse.json(
      { success: false, error: "Invalid Shopify shop domain" },
      { status: 400 }
    );
  }

  // Require an authenticated company session to initiate install
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const state = randomBytes(16).toString("hex");

  const cookieStore = await cookies();
  const payload = JSON.stringify({
    state,
    shop,
    companyId: session.companyId,
    createdAt: Date.now(),
  });

  cookieStore.set(STATE_COOKIE_NAME, payload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STATE_COOKIE_MAX_AGE,
  });

  const installUrl = buildInstallUrl(shop, state);

  return NextResponse.redirect(installUrl);
}

