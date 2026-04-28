/** MP4 playback URL for a Stream uid (uses customer subdomain when configured). */
function streamHost(): string {
  const raw =
    process.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN ??
    process.env.NEXT_PUBLIC_STREAM_CUSTOMER_SUBDOMAIN ??
    process.env.NEXT_PUBLIC_STREAM_CUSTOMER ??
    "";

  const cleaned = raw.replace(/^https?:\/\//, "").replace(/\/$/, "").trim();
  if (!cleaned) return "videodelivery.net";

  // If you provided only the customer id (e.g. "customer-xxxx"),
  // the public hostname is usually "<customer>.cloudflarestream.com".
  if (!cleaned.includes(".")) return `${cleaned}.cloudflarestream.com`;

  return cleaned;
}

export function streamMp4Url(uid: string): string {
  const host = streamHost();
  return `https://${host}/${uid}/manifest/video.mpd`;
}

/** HLS manifest URL (Cloudflare default host). */
export function streamHlsUrl(uid: string): string {
  const host = streamHost();
  return `https://${host}/${uid}/manifest/video.m3u8`;
}

/** Thumbnail; optional time (sec) and width. */
export function streamThumbnailUrl(
  uid: string,
  opts?: { time?: number; width?: number },
): string {
  const host = streamHost();
  const q = new URLSearchParams();
  if (opts?.time != null) q.set("time", String(opts.time));
  if (opts?.width != null) q.set("width", String(opts.width));
  const qs = q.toString();
  return `https://${host}/${uid}/thumbnails/thumbnail.jpg${qs ? `?${qs}` : ""}`;
}

/** Direct MP4 URL often returned by Stream `playback` object; fallback builder. */
export function streamMp4PlaybackUrl(uid: string): string {
  const host = streamHost();
  return `https://${host}/${uid}/downloads/default.mp4`;
}
