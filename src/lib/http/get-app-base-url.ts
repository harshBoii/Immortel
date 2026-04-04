/**
 * Public HTTPS base for OAuth/callback URLs (mirrors WordPress connect behavior).
 */
export function getAppBaseUrl(req: Request): string {
  const origin = new URL(req.url).origin;

  const productionOverride = process.env.NEXT_PUBLIC_APP_PRODUCTION_URL?.trim();
  if (productionOverride) return productionOverride.replace(/\/+$/g, "");

  const envBase = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envBase) return envBase.replace(/\/+$/g, "");

  return origin;
}
