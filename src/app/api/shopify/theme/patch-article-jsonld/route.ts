import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopifyApiVersion, normalizeShopDomain } from "@/lib/shopify/client";

const CANDIDATE_KEYS = [
  "sections/main-article.liquid",
  "templates/article.liquid",
  "sections/article.liquid",
] as const;

const SNIPPET = `{% if article.metafields.custom.json_ld %}
  <script type="application/ld+json">
    {{ article.metafields.custom.json_ld.value }}
  </script>
{% endif %}`;

function hasThemeScopes(scopes: string[]): boolean {
  const set = new Set(scopes);
  return set.has("read_themes") && set.has("write_themes");
}

function getAdminBase(shopDomain: string): string {
  const shop = normalizeShopDomain(shopDomain);
  return `https://${shop}/admin/api/${getShopifyApiVersion()}`;
}

async function shopifyJson(
  shopDomain: string,
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; json: any }> {
  const res = await fetch(`${getAdminBase(shopDomain)}${path}`, {
    ...init,
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json };
}

function alreadyPatched(value: string): boolean {
  return (
    value.includes("article.metafields.custom.json_ld") &&
    value.includes('type="application/ld+json"')
  );
}

function applyPatch(value: string): { patched: boolean; next: string } {
  if (alreadyPatched(value)) return { patched: false, next: value };
  const sep = value.endsWith("\n") ? "" : "\n";
  return { patched: true, next: `${value}${sep}\n${SNIPPET}\n` };
}

export async function POST() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const shop = await prisma.shopifyShop.findFirst({
    where: { companyId: session.companyId, status: "installed" },
    select: {
      id: true,
      shopDomain: true,
      accessToken: true,
      scopes: true,
      mainThemeId: true,
      articleJsonLdThemePatchedAt: true,
    },
  });

  if (!shop) {
    return NextResponse.json(
      { success: false, error: "No connected Shopify store found" },
      { status: 404 }
    );
  }

  if (!hasThemeScopes(shop.scopes)) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Missing required Shopify scopes (read_themes, write_themes). Reinstall/reauthorize the app to grant theme permissions.",
        data: { scopes: shop.scopes },
      },
      { status: 403 }
    );
  }

  const themesRes = await shopifyJson(shop.shopDomain, shop.accessToken, "/themes.json");
  if (!themesRes.ok) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch themes", details: themesRes.json },
      { status: 502 }
    );
  }

  const themes: Array<{ id: number; role: string }> = themesRes.json?.themes ?? [];
  const mainTheme = themes.find((t) => t.role === "main");
  if (!mainTheme?.id) {
    return NextResponse.json(
      { success: false, error: "Main theme not found" },
      { status: 400 }
    );
  }

  const currentMainThemeId = String(mainTheme.id);
  const themeChanged = shop.mainThemeId && shop.mainThemeId !== currentMainThemeId;
  const shouldPatch = !shop.articleJsonLdThemePatchedAt || themeChanged || shop.mainThemeId !== currentMainThemeId;

  // Even if we don't patch, we still want to keep the cached mainThemeId fresh.
  if (!shouldPatch) {
    await prisma.shopifyShop.update({
      where: { id: shop.id },
      data: { mainThemeId: currentMainThemeId },
    });
    return NextResponse.json({
      success: true,
      data: {
        mainThemeId: currentMainThemeId,
        patchedAt: shop.articleJsonLdThemePatchedAt,
        patched: false,
        reason: "already_patched",
      },
    });
  }

  let chosenKey: string | null = null;
  let currentValue: string | null = null;

  for (const key of CANDIDATE_KEYS) {
    const assetRes = await shopifyJson(
      shop.shopDomain,
      shop.accessToken,
      `/themes/${mainTheme.id}/assets.json?asset[key]=${encodeURIComponent(key)}`
    );
    const value = assetRes.json?.asset?.value;
    if (assetRes.ok && typeof value === "string") {
      chosenKey = key;
      currentValue = value;
      break;
    }
  }

  if (!chosenKey || currentValue == null) {
    return NextResponse.json(
      {
        success: false,
        error: "No patchable article template asset found",
        data: { triedKeys: CANDIDATE_KEYS },
      },
      { status: 404 }
    );
  }

  const { patched, next } = applyPatch(currentValue);
  if (!patched) {
    await prisma.shopifyShop.update({
      where: { id: shop.id },
      data: {
        mainThemeId: currentMainThemeId,
        articleJsonLdThemePatchedAt: shop.articleJsonLdThemePatchedAt ?? new Date(),
      },
    });
    return NextResponse.json({
      success: true,
      data: {
        mainThemeId: currentMainThemeId,
        assetKey: chosenKey,
        patched: false,
        reason: "snippet_already_present",
      },
    });
  }

  const putRes = await shopifyJson(
    shop.shopDomain,
    shop.accessToken,
    `/themes/${mainTheme.id}/assets.json`,
    {
      method: "PUT",
      body: JSON.stringify({ asset: { key: chosenKey, value: next } }),
    }
  );

  if (!putRes.ok) {
    return NextResponse.json(
      { success: false, error: "Failed to update theme asset", details: putRes.json },
      { status: 502 }
    );
  }

  const now = new Date();
  await prisma.shopifyShop.update({
    where: { id: shop.id },
    data: { mainThemeId: currentMainThemeId, articleJsonLdThemePatchedAt: now },
  });

  return NextResponse.json({
    success: true,
    data: {
      mainThemeId: currentMainThemeId,
      assetKey: chosenKey,
      patched: true,
      patchedAt: now.toISOString(),
    },
  });
}

