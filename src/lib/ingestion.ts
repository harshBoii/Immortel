/**
 * Build Cloudflare Stream thumbnail URL for a specific timestamp.
 * Used for shorts (MicroAssets): frame from parent video at startTime.
 */
export function buildStreamThumbnailUrl(
  streamId: string,
  startTimeSeconds: number,
  options?: { height?: number; width?: number }
): string {
  const customer = process.env.NEXT_PUBLIC_STREAM_CUSTOMER ?? "customer-5f6vfk6lgnhsk276";
  const base = `https://${customer}.cloudflarestream.com`;
  const timeParam = `${Math.floor(startTimeSeconds)}s`;
  const height = options?.height ?? 270;
  const width = options?.width;
  const url = new URL(`${base}/${streamId}/thumbnails/thumbnail.jpg`);
  url.searchParams.set("time", timeParam);
  url.searchParams.set("height", String(height));
  if (width) url.searchParams.set("width", String(width));
  return url.toString();
}
