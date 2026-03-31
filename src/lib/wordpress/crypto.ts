import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

type Payload = {
  v: 1;
  alg: "aes-256-gcm";
  iv: string; // base64url
  tag: string; // base64url
  ct: string; // base64url
};

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

function getKey(): Buffer {
  const raw = process.env.WP_CREDENTIALS_SECRET;
  if (!raw) {
    throw new Error("WP_CREDENTIALS_SECRET must be set (base64 32-byte key)");
  }
  let key: Buffer;
  try {
    key = Buffer.from(raw, "base64");
  } catch {
    throw new Error("WP_CREDENTIALS_SECRET must be valid base64");
  }
  if (key.length !== 32) {
    throw new Error("WP_CREDENTIALS_SECRET must decode to 32 bytes");
  }
  return key;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const payload: Payload = {
    v: 1,
    alg: "aes-256-gcm",
    iv: b64urlEncode(iv),
    tag: b64urlEncode(tag),
    ct: b64urlEncode(ct),
  };

  return b64urlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
}

export function decrypt(ciphertext: string): string {
  const key = getKey();

  let payloadJson: string;
  try {
    payloadJson = b64urlDecode(ciphertext).toString("utf8");
  } catch {
    throw new Error("WP_CREDENTIALS_DECRYPT_FAILED");
  }

  let payload: Payload;
  try {
    payload = JSON.parse(payloadJson) as Payload;
  } catch {
    throw new Error("WP_CREDENTIALS_DECRYPT_FAILED");
  }

  if (payload?.v !== 1 || payload?.alg !== "aes-256-gcm") {
    throw new Error("WP_CREDENTIALS_DECRYPT_FAILED");
  }

  try {
    const iv = b64urlDecode(payload.iv);
    const tag = b64urlDecode(payload.tag);
    const ct = b64urlDecode(payload.ct);

    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return pt.toString("utf8");
  } catch {
    throw new Error("WP_CREDENTIALS_DECRYPT_FAILED");
  }
}

