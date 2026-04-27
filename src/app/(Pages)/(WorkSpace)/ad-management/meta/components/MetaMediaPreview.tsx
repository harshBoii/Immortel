'use client';

import type { ReactNode } from 'react';

type Props = {
  videoUrl?: string | null;
  /** Shown when there is no playable video (e.g. static image creative). */
  imageUrl?: string | null;
  /** Poster / preview frame for video (e.g. Meta thumbnail or R2 image). */
  posterUrl?: string | null;
  alt?: string;
  emptyLabel?: string;
  className?: string;
};

/**
 * Plays in-browser video when `videoUrl` is set; otherwise shows an image.
 * Pairs a Meta thumbnail (`posterUrl`) with Cloudflare / MP4 playback when both exist.
 */
export function MetaMediaPreview({
  videoUrl,
  imageUrl,
  posterUrl,
  alt = '',
  emptyLabel = 'No preview',
  className = '',
}: Props) {
  const v = videoUrl?.trim() || null;
  const img = imageUrl?.trim() || null;
  const poster = posterUrl?.trim() || null;

  const shell = (inner: ReactNode) => (
    <div className={`relative h-full w-full ${className}`.trim()}>{inner}</div>
  );

  if (v) {
    return shell(
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={v}
        poster={poster ?? undefined}
        controls
        playsInline
        preload="metadata"
      />,
    );
  }

  if (img) {
    return shell(
      // eslint-disable-next-line @next/next/no-img-element -- remote R2 / Meta URLs; unoptimized
      <img src={img} alt={alt} className="absolute inset-0 h-full w-full object-cover" />,
    );
  }

  if (poster) {
    return shell(
      // eslint-disable-next-line @next/next/no-img-element
      <img src={poster} alt={alt} className="absolute inset-0 h-full w-full object-cover" />,
    );
  }

  return shell(
    <div className="absolute inset-0 flex items-center justify-center p-2 text-center text-[10px] text-muted-foreground">
      {emptyLabel}
    </div>,
  );
}
