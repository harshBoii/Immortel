import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { validateWordPressSite } from "@/lib/wordpress/validator";

function normalizeSiteUrl(siteUrl: string): string {
  return siteUrl.trim().replace(/\/+$/g, "");
}

function b64urlEncodeUtf8Json(value: unknown): string {
  const json = JSON.stringify(value);
  return Buffer.from(json, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function getBaseUrl(req: Request): string {
  const origin = new URL(req.url).origin;

  const productionOverride = process.env.NEXT_PUBLIC_APP_PRODUCTION_URL?.trim();
  if (productionOverride) return productionOverride.replace(/\/+$/g, "");

  const envBase = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envBase) return envBase.replace(/\/+$/g, "");

  return origin;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { siteUrl?: unknown } | null;
  const raw = body?.siteUrl;
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return NextResponse.json({ error: "siteUrl is required" }, { status: 400 });
  }

  const normalized = normalizeSiteUrl(raw);
  const validation = await validateWordPressSite(normalized);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const { authUrl, siteTitle } = validation;

  const companyId = session.companyId;

  const state = b64urlEncodeUtf8Json({
    tenantId: companyId,
    siteUrl: normalized,
    siteTitle,
    authUrl,
  });

  const baseUrl = getBaseUrl(req);
  // WordPress requires these URLs to be HTTPS (even for local/dev).
  if (!baseUrl.startsWith("https://")) {
    return NextResponse.json(
      {
        error:
          "WordPress requires an HTTPS callback URL. Set NEXT_PUBLIC_APP_PRODUCTION_URL (recommended, e.g. an ngrok/Cloudflare Tunnel URL) to an https:// URL.",
      },
      { status: 400 }
    );
  }

  const successUrl = `${baseUrl}/api/wordpress/callback?state=${encodeURIComponent(
    state
  )}`;

  const rejectUrl = `${baseUrl}/connection/wordpress?error=wp_rejected`;

  const params = new URLSearchParams({
    success_url: successUrl,
    reject_url: rejectUrl,
  });

  const appName = process.env.WP_APP_NAME?.trim();
  if (appName) params.set("app_name", appName);
  const appId = process.env.WP_APP_ID?.trim();
  if (appId) params.set("app_id", appId);

  return NextResponse.json({ redirectUrl: `${authUrl}?${params.toString()}` });
}

