function graphVersion(): string {
  const v = process.env.META_GRAPH_VERSION?.trim() || "v19.0";
  return v.startsWith("v") ? v : `v${v}`;
}

function graphBase(path: string): string {
  const p = path.replace(/^\//, "");
  return `https://graph.facebook.com/${graphVersion()}/${p}`;
}

export type GraphErrorShape = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
};

export class MetaGraphError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = "MetaGraphError";
  }
}

function normalizeGraphError(data: unknown, status: number): MetaGraphError {
  const err = data as { error?: GraphErrorShape };
  const msg =
    err?.error?.message ||
    (typeof data === "object" && data && "message" in data
      ? String((data as { message?: string }).message)
      : null) ||
    `Meta Graph HTTP ${status}`;
  return new MetaGraphError(msg, status, data);
}

export async function graphGet(
  path: string,
  params: Record<string, string | number | boolean | undefined>,
  opts: { accessToken: string },
): Promise<unknown> {
  const u = new URL(graphBase(path));
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    u.searchParams.set(k, String(v));
  }
  u.searchParams.set("access_token", opts.accessToken);
  const res = await fetch(u.toString(), { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data as { error?: unknown }).error) {
    throw normalizeGraphError(data, res.status);
  }
  return data;
}

/** Form-encoded POST (Marketing API default). Objects are JSON-stringified. */
export async function graphPost(
  path: string,
  params: Record<string, unknown>,
  opts: { accessToken: string },
): Promise<unknown> {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...params, access_token: opts.accessToken })) {
    if (v === undefined || v === null) continue;
    if (typeof v === "object") {
      body.set(k, JSON.stringify(v));
    } else {
      body.set(k, String(v));
    }
  }
  const res = await fetch(graphBase(path), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data as { error?: unknown }).error) {
    throw normalizeGraphError(data, res.status);
  }
  return data;
}
