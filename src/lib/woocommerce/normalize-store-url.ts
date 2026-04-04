/**
 * Canonical WooCommerce site base (supports subdirectory installs, e.g. /shop).
 */
export function normalizeWooCommerceStoreUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Store URL is required");
  }

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    throw new Error("Invalid store URL");
  }

  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Store URL must use http or https");
  }

  const path = u.pathname.replace(/\/+$/g, "");
  return `${u.origin}${path}`;
}
