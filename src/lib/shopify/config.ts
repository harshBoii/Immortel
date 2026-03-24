import { z } from "zod";
import { IntegrationProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const ShopifyEnvSchema = z.object({
  SHOPIFY_API_KEY: z.string().min(1),
  SHOPIFY_API_SECRET: z.string().min(1),
  SHOPIFY_SCOPES: z.string().min(1), // comma-separated scopes
  SHOPIFY_APP_URL: z.string().url(), // e.g. https://app.example.com
});

export type ShopifyConfig = z.infer<typeof ShopifyEnvSchema> & {
  scopes: string[];
  redirectUri: string;
};

function buildConfigFromCmsRow(row: {
  apiKey: string | null;
  apiSecret: string | null;
  scopes: string | null;
  appUrl: string | null;
}): ShopifyConfig | null {
  const apiKey = row.apiKey?.trim() ?? "";
  const apiSecret = row.apiSecret?.trim() ?? "";
  const scopesStr = row.scopes?.trim() ?? "";
  const appUrlRaw = row.appUrl?.trim() ?? "";
  if (!apiKey || !apiSecret || !scopesStr || !appUrlRaw) return null;

  const scopes = scopesStr.split(",").map((s) => s.trim()).filter(Boolean);
  const appUrl = appUrlRaw.replace(/\/$/, "");
  const redirectUri = `${appUrl}/shopify/callback`;

  return {
    SHOPIFY_API_KEY: apiKey,
    SHOPIFY_API_SECRET: apiSecret,
    SHOPIFY_SCOPES: scopesStr,
    SHOPIFY_APP_URL: appUrl,
    scopes,
    redirectUri,
  };
}

function getShopifyConfigFromEnv(): ShopifyConfig {
  const parsed = ShopifyEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(", ");
    throw new Error(`Invalid Shopify environment configuration: ${issues}`);
  }

  const { SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_SCOPES, SHOPIFY_APP_URL } =
    parsed.data;

  const scopes = SHOPIFY_SCOPES.split(",").map((s) => s.trim()).filter(Boolean);
  const appUrl = SHOPIFY_APP_URL.replace(/\/$/, "");
  const redirectUri = `${appUrl}/shopify/callback`;

  return {
    SHOPIFY_API_KEY,
    SHOPIFY_API_SECRET,
    SHOPIFY_SCOPES,
    SHOPIFY_APP_URL: appUrl,
    scopes,
    redirectUri,
  };
}

/**
 * Resolves Shopify OAuth/app config: company CMS row (IntegrationProvider.Shopify)
 * when all four fields are set, otherwise falls back to SHOPIFY_* env vars.
 */
export async function getShopifyConfig(
  companyId?: string | null
): Promise<ShopifyConfig> {
  if (companyId) {
    const row = await prisma.companyIntegrationCms.findUnique({
      where: {
        companyId_provider: {
          companyId,
          provider: IntegrationProvider.Shopify,
        },
      },
    });
    if (row) {
      const fromDb = buildConfigFromCmsRow(row);
      if (fromDb) return fromDb;
    }
  }
  return getShopifyConfigFromEnv();
}
