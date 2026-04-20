import { generatePresignedUrl } from "@/lib/r2";

export function getMetaBucket(): string {
  return process.env.R2_META_BUCKET ?? process.env.R2_BUCKET_NAME ?? "";
}

/** Presigned GET for an object key (Meta image fetch, previews). */
export async function getPresignedGetUrl(key: string, expiresInSec = 86400): Promise<string> {
  const bucket = getMetaBucket();
  if (!bucket) {
    throw new Error("R2_META_BUCKET or R2_BUCKET_NAME must be set");
  }
  return generatePresignedUrl(key, bucket, expiresInSec);
}

/** Public CDN base URL for images, or presigned URL when unset. */
export function getImageAccessUrl(key: string, presigned: string): string {
  const base = process.env.R2_PUBLIC_BASE_URL_META?.replace(/\/$/, "");
  if (base) return `${base}/${key}`;
  return presigned;
}
