import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export type CreativeUploadTokenPayload = {
  v: 1;
  companyId: string;
  exp: number; // unix seconds
  nonce: string;
  allowedTypes?: Array<"IMAGE" | "VIDEO">;
};

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET must be set and at least 16 characters");
  }
  return secret;
}

function b64urlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function b64urlDecode(input: string): Buffer {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  return Buffer.from(`${b64}${pad}`, "base64");
}

function sign(data: string): string {
  const h = createHmac("sha256", getSecret());
  h.update(data);
  return h.digest("hex");
}

export function createCreativeUploadToken(opts: {
  companyId: string;
  ttlSeconds: number;
  allowedTypes?: Array<"IMAGE" | "VIDEO">;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: CreativeUploadTokenPayload = {
    v: 1,
    companyId: opts.companyId,
    exp: now + Math.max(60, Math.floor(opts.ttlSeconds)),
    nonce: randomBytes(12).toString("hex"),
    allowedTypes: opts.allowedTypes,
  };

  const body = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = sign(body);
  return `${body}.${sig}`;
}

export function verifyCreativeUploadToken(token: string): CreativeUploadTokenPayload | null {
  const t = token.trim();
  const [body, sig] = t.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  try {
    if (
      sig.length !== expected.length ||
      !timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))
    ) {
      return null;
    }
  } catch {
    return null;
  }

  let payload: CreativeUploadTokenPayload;
  try {
    payload = JSON.parse(b64urlDecode(body).toString("utf8")) as CreativeUploadTokenPayload;
  } catch {
    return null;
  }
  if (payload?.v !== 1) return null;
  if (!payload.companyId || typeof payload.companyId !== "string") return null;
  if (!payload.exp || typeof payload.exp !== "number") return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

