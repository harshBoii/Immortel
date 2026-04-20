const BASE = "https://api.cloudflare.com/client/v4";

export class CloudflareStreamError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors?: unknown,
  ) {
    super(message);
    this.name = "CloudflareStreamError";
  }
}

function getAccountId(): string {
  const id = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!id) throw new Error("CLOUDFLARE_ACCOUNT_ID must be set");
  return id;
}

function getToken(): string {
  const t = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  if (!t) throw new Error("CLOUDFLARE_STREAM_API_TOKEN must be set");
  return t;
}

export function streamAccountPath(suffix: string): string {
  const accountId = getAccountId();
  const s = suffix.startsWith("/") ? suffix : `/${suffix}`;
  return `/accounts/${accountId}${s}`;
}

type CfEnvelope<T> = {
  success?: boolean;
  errors?: Array<{ code?: number; message?: string }>;
  messages?: unknown;
  result?: T;
};

/** Authenticated JSON request to Cloudflare Stream REST API. */
export async function cfStreamJson<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<CfEnvelope<T>> {
  const url = path.startsWith("http")
    ? path
    : `${BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      ...init?.headers,
    },
  });

  const data = (await res.json()) as CfEnvelope<T>;

  if (!res.ok || data.success === false) {
    const msg =
      data.errors?.map((e) => e.message).filter(Boolean).join("; ") ||
      `Cloudflare Stream HTTP ${res.status}`;
    throw new CloudflareStreamError(msg, res.status, data.errors);
  }

  return data;
}
