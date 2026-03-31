type ValidationResult =
  | { valid: true; authUrl: string; siteTitle: string | null }
  | { valid: false; error: string };

function normalizeSiteUrl(siteUrl: string): string {
  return siteUrl.trim().replace(/\/+$/g, "");
}

export async function validateWordPressSite(
  siteUrl: string
): Promise<ValidationResult> {
  const normalized = normalizeSiteUrl(siteUrl);

  try {
    const res = await fetch(`${normalized}/wp-json`, {
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      return { valid: false, error: "Site unreachable" };
    }

    const data = (await res.json().catch(() => null)) as any;
    const appPasswords = data?.authentication?.["application-passwords"];

    if (!appPasswords) {
      return {
        valid: false,
        error:
          "Application Passwords are disabled on this site. It must be on HTTPS and WordPress 5.6+.",
      };
    }

    const authUrl = appPasswords?.endpoints?.authorization;
    if (!authUrl || typeof authUrl !== "string") {
      return { valid: false, error: "Authorization endpoint not found" };
    }

    const siteTitle =
      typeof data?.name === "string" && data.name.trim() ? data.name.trim() : null;

    return { valid: true, authUrl, siteTitle };
  } catch {
    return { valid: false, error: "Could not connect to site. Check the URL." };
  }
}

