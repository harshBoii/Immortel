/** MP4 playback URL for a Stream uid (uses customer subdomain when configured). */
export function streamMp4Url(uid: string): string {
  const sub =
    process.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN?.replace(/^https?:\/\//, "").replace(/\/$/, "") ??
    "videodelivery.net";
  return `https://${sub}/${uid}/manifest/video.mpd`;
}

/** HLS manifest URL (Cloudflare default host). */
export function streamHlsUrl(uid: string): string {
  const sub =
    process.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN?.replace(/^https?:\/\//, "").replace(/\/$/, "") ??
    "videodelivery.net";
  return `https://${sub}/${uid}/manifest/video.m3u8`;
}

/** Thumbnail; optional time (sec) and width. */
export function streamThumbnailUrl(
  uid: string,
  opts?: { time?: number; width?: number },
): string {
  const sub =
    process.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN?.replace(/^https?:\/\//, "").replace(/\/$/, "") ??
    "videodelivery.net";
  const q = new URLSearchParams();
  if (opts?.time != null) q.set("time", String(opts.time));
  if (opts?.width != null) q.set("width", String(opts.width));
  const qs = q.toString();
  return `https://${sub}/${uid}/thumbnails/thumbnail.jpg${qs ? `?${qs}` : ""}`;
}

/** Direct MP4 URL often returned by Stream `playback` object; fallback builder. */
export function streamMp4PlaybackUrl(uid: string): string {
  return `https://videodelivery.net/${uid}/downloads/default.mp4`;
}
