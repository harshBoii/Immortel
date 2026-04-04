/** Normalize site URL for comparing WordPress vs WooCommerce store origins. */
export function normalizeSiteUrlForPublish(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const u = new URL(withScheme);
    const path = u.pathname.replace(/\/+$/g, "");
    return `${u.origin}${path}`.toLowerCase();
  } catch {
    return trimmed.replace(/\/+$/g, "").toLowerCase();
  }
}
