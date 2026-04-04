import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAppBaseUrl } from "@/lib/http/get-app-base-url";
import { normalizeWooCommerceStoreUrl } from "@/lib/woocommerce/normalize-store-url";
import { prisma } from "@/lib/prisma";

const PENDING_TTL_MS = 15 * 60 * 1000;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { storeUrl?: unknown } | null;
  const raw = body?.storeUrl;
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return NextResponse.json({ error: "storeUrl is required" }, { status: 400 });
  }

  let storeUrl: string;
  try {
    storeUrl = normalizeWooCommerceStoreUrl(raw);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid store URL";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const baseUrl = getAppBaseUrl(req);
  if (!baseUrl.startsWith("https://")) {
    return NextResponse.json(
      {
        error:
          "WooCommerce requires HTTPS callback URLs. Set NEXT_PUBLIC_APP_PRODUCTION_URL or NEXT_PUBLIC_APP_URL to an https:// URL (e.g. ngrok).",
      },
      { status: 400 }
    );
  }

  const appName =
    process.env.WOOCOMMERCE_APP_NAME?.trim() || process.env.NEXT_PUBLIC_APP_NAME?.trim() || "App";
  const scope = process.env.WOOCOMMERCE_SCOPE?.trim() || "read_write";

  const state = randomBytes(32).toString("hex");
  if (state.length > 128) {
    return NextResponse.json({ error: "State generation failed" }, { status: 500 });
  }

  const expiresAt = new Date(Date.now() + PENDING_TTL_MS);

  await prisma.$transaction([
    prisma.wooCommerceOAuthPending.deleteMany({
      where: {
        companyId: session.companyId,
        storeUrl,
      },
    }),
    prisma.wooCommerceOAuthPending.create({
      data: {
        state,
        companyId: session.companyId,
        storeUrl,
        expiresAt,
      },
    }),
  ]);

  const callbackUrl = `${baseUrl}/api/woocommerce/callback`;
  const returnUrl = `${baseUrl}/woocommerce/return`;

  const params = new URLSearchParams({
    app_name: appName,
    scope,
    user_id: state,
    return_url: returnUrl,
    callback_url: callbackUrl,
  });

  const authPath = `${storeUrl}/wc-auth/v1/authorize`;
  const redirectUrl = `${authPath}?${params.toString()}`;

  return NextResponse.json({ redirectUrl });
}
