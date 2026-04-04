import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { encrypt } from "@/lib/wordpress/crypto";
import { prisma } from "@/lib/prisma";
import { normalizeWooCommerceStoreUrl } from "@/lib/woocommerce/normalize-store-url";

export const runtime = "nodejs";

function manualKeysAllowed(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return process.env.ALLOW_WOOCOMMERCE_MANUAL_KEYS?.trim() === "true";
}

/**
 * Dev/testing only: paste keys from WooCommerce → Settings → Advanced → REST API (Read/Write).
 */
export async function PATCH(req: Request) {
  if (!manualKeysAllowed()) {
    return NextResponse.json({ error: "Manual key entry is disabled" }, { status: 403 });
  }

  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    storeUrl?: unknown;
    consumerKey?: unknown;
    consumerSecret?: unknown;
  } | null;

  const storeUrlRaw = body?.storeUrl;
  const ck = body?.consumerKey;
  const cs = body?.consumerSecret;

  if (typeof storeUrlRaw !== "string" || !storeUrlRaw.trim()) {
    return NextResponse.json({ error: "storeUrl is required" }, { status: 400 });
  }
  if (typeof ck !== "string" || !ck.startsWith("ck_")) {
    return NextResponse.json({ error: "consumerKey must start with ck_" }, { status: 400 });
  }
  if (typeof cs !== "string" || !cs.startsWith("cs_")) {
    return NextResponse.json({ error: "consumerSecret must start with cs_" }, { status: 400 });
  }

  let storeUrl: string;
  try {
    storeUrl = normalizeWooCommerceStoreUrl(storeUrlRaw);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid store URL";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let consumerKeyEnc: string;
  let consumerSecretEnc: string;
  try {
    consumerKeyEnc = encrypt(ck.trim());
    consumerSecretEnc = encrypt(cs.trim());
  } catch {
    return NextResponse.json({ error: "Encryption failed (check WP_CREDENTIALS_SECRET)" }, { status: 500 });
  }

  await prisma.wooCommerceStore.upsert({
    where: {
      companyId_storeUrl: {
        companyId: session.companyId,
        storeUrl,
      },
    },
    create: {
      companyId: session.companyId,
      storeUrl,
      consumerKeyEnc,
      consumerSecretEnc,
      status: "installed",
    },
    update: {
      consumerKeyEnc,
      consumerSecretEnc,
      status: "installed",
      installedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
