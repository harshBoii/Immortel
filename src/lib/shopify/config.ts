import { z } from "zod";

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

let cachedConfig: ShopifyConfig | null = null;

export function getShopifyConfig(): ShopifyConfig {
  if (cachedConfig) return cachedConfig;

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

  cachedConfig = {
    SHOPIFY_API_KEY,
    SHOPIFY_API_SECRET,
    SHOPIFY_SCOPES,
    SHOPIFY_APP_URL: appUrl,
    scopes,
    redirectUri,
  };

  return cachedConfig;
}

