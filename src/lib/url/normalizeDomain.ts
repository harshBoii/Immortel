export function normalizeDomain(input: string): string {
  const raw = input.trim();
  if (!raw) throw new Error("Domain is required");

  // Accept:
  // - example.com
  // - https://example.com/path
  // - http://www.example.com
  let host: string;
  try {
    const url = raw.includes("://") ? new URL(raw) : new URL(`https://${raw}`);
    host = url.hostname;
  } catch {
    throw new Error("Invalid domain or URL");
  }

  host = host.trim().toLowerCase();
  if (!host) throw new Error("Invalid domain or URL");

  if (host.startsWith("www.")) host = host.slice(4);

  // Basic sanity: must contain at least one dot and only allow common hostname chars.
  if (!host.includes(".")) throw new Error("Invalid domain or URL");
  if (!/^[a-z0-9.-]+$/.test(host)) throw new Error("Invalid domain or URL");

  // Remove trailing dot if any.
  host = host.replace(/\.+$/, "");
  if (!host || !host.includes(".")) throw new Error("Invalid domain or URL");

  return host;
}

export function domainToWebsiteUrl(domain: string): string {
  const d = normalizeDomain(domain);
  return `https://${d}`;
}

