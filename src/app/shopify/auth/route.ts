import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { setAuthCookie } from "@/lib/auth";
import { getShopifyCredentialSourceMeta } from "@/lib/shopify/config";
import {
  describeShopifyQueryForHmac,
  normalizeShopDomain,
  verifyHmacFromSearchParams,
} from "@/lib/shopify/client";
import { resolveCompanyIdForShopifyLoad } from "@/lib/shopify/resolveCompany";

const LOG_PREFIX = "[Shopify Auth]";

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

  const hmacDebug = describeShopifyQueryForHmac(searchParams);

  console.info(`${LOG_PREFIX} GET`, {
    phase: "request",
    pathname: url.pathname,
    queryKeys: hmacDebug.paramKeys,
    signedKeyCount: hmacDebug.signedKeyCount,
    messageByteLength: hmacDebug.messageByteLength,
    hasTimestamp: hmacDebug.hasTimestamp,
    hasHost: hmacDebug.hasHost,
    hasSession: hmacDebug.hasSession,
    providedHmacLength: hmacDebug.providedHmacLength,
    shopRawPresent: Boolean(rawShop),
    hmacPresent: Boolean(hmac),
  });

  if (!rawShop || !hmac) {
    console.warn(`${LOG_PREFIX} Missing shop or hmac`, {
      shopRawPresent: Boolean(rawShop),
      hmacPresent: Boolean(hmac),
    });
    return NextResponse.json(
      { success: false, error: "Missing required parameters (shop, hmac)" },
      { status: 400 }
    );
  }

  let shop: string;
  try {
    shop = normalizeShopDomain(rawShop);
  } catch (e) {
    console.warn(`${LOG_PREFIX} Invalid shop domain`, {
      rawShopPreview: rawShop.slice(0, 80),
      error: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { success: false, error: "Invalid shop domain" },
      { status: 400 }
    );
  }

  const [shopRecord, companyIdForHmac] = await Promise.all([
    prisma.shopifyShop.findUnique({
      where: { shopDomain: shop },
      select: { companyId: true, status: true },
    }),
    resolveCompanyIdForShopifyLoad(rawShop),
  ]);

  const credentialMeta = await getShopifyCredentialSourceMeta(companyIdForHmac);

  console.info(`${LOG_PREFIX} Shop lookup`, {
    shop,
    shopInDb: Boolean(shopRecord),
    companyId: companyIdForHmac,
    shopStatus: shopRecord?.status ?? null,
    preInstallCompanyResolved: Boolean(!shopRecord && companyIdForHmac),
    credentialMeta,
  });

  const hmacOk = await verifyHmacFromSearchParams(
    searchParams,
    companyIdForHmac
  );
  if (!hmacOk) {
    console.warn(`${LOG_PREFIX} HMAC verification failed`, {
      shop,
      companyId: companyIdForHmac,
      credentialMeta,
      signedKeyCount: hmacDebug.signedKeyCount,
      messageByteLength: hmacDebug.messageByteLength,
      hint:
        credentialMeta.source === "cms"
          ? `Client secret must match Shopify for apiKey …${credentialMeta.apiKeyLast4} (company CMS).`
          : credentialMeta.source === "env"
            ? `Using env SHOPIFY_* (${credentialMeta.reason}, apiKey …${credentialMeta.apiKeyLast4}). Client secret must match that app in Partners/CLI.`
            : credentialMeta.source === "error"
              ? credentialMeta.message
              : "Unknown credential source",
    });
    return NextResponse.json(
      { success: false, error: "Invalid HMAC signature" },
      { status: 403 }
    );
  }

  console.info(`${LOG_PREFIX} HMAC OK`, { shop, companyId: companyIdForHmac });

  // Shop hasn't completed OAuth yet → kick off the install flow
  if (!shopRecord || shopRecord.status !== "installed") {
    console.info(`${LOG_PREFIX} Redirecting to install`, {
      shop,
      shopInDb: Boolean(shopRecord),
      shopStatus: shopRecord?.status ?? null,
    });
    const installUrl = new URL("/shopify/install", request.url);
    installUrl.searchParams.set("shop", shop);
    return NextResponse.redirect(installUrl.toString());
  }

  // Shop exists and is installed → auto-authenticate as the linked company
  console.info(`${LOG_PREFIX} Session cookie set, redirecting to app`, {
    shop,
    companyId: shopRecord.companyId,
  });
  await setAuthCookie(shopRecord.companyId);

  const dashboardUrl = new URL("/", request.url);
  dashboardUrl.searchParams.set("shop", shop);
  return NextResponse.redirect(dashboardUrl.toString());
}
