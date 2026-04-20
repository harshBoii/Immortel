'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useCurrentContext } from '@/app/components/common/useCurrentContext';

type MediaRow = {
  id: string;
  kind: string;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  status?: string;
};

function uploadWithProgress(
  file: File,
  url: string,
  onProgress: (ratio: number) => void,
): Promise<{ ok: boolean; status: number; json: unknown }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      let json: unknown;
      try {
        json = JSON.parse(xhr.responseText || '{}');
      } catch {
        json = {};
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, json });
    };
    xhr.onerror = () => reject(new Error('Network error'));
    const fd = new FormData();
    fd.append('file', file);
    xhr.send(fd);
  });
}

export function CreativesTab() {
  const { meta } = useCurrentContext();
  const [images, setImages] = useState<MediaRow[]>([]);
  const [videos, setVideos] = useState<MediaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadGallery = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ri, rv] = await Promise.all([
        fetch('/api/meta/adimages?limit=48', { credentials: 'include' }),
        fetch('/api/meta/advideos?limit=48', { credentials: 'include' }),
      ]);
      const ji = await ri.json().catch(() => ({}));
      const jv = await rv.json().catch(() => ({}));
      setImages(Array.isArray(ji.items) ? ji.items : []);
      setVideos(Array.isArray(jv.items) ? jv.items : []);
    } catch {
      setError('Failed to load gallery');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (meta) void loadGallery();
    else setLoading(false);
  }, [meta, loadGallery]);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const isVideo = file.type.startsWith('video/');
      const url = isVideo ? '/api/meta/advideos' : '/api/meta/adimages';
      setProgress(0);
      try {
        const { ok, json } = await uploadWithProgress(file, url, setProgress);
        if (!ok) {
          const msg =
            typeof (json as { error?: string })?.error === 'string'
              ? (json as { error: string }).error
              : 'Upload failed';
          setError(msg);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed');
      }
      setProgress(null);
    }
    await loadGallery();
  };

  if (!meta) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div
        className="rounded-xl border-2 border-dashed border-[var(--glass-border)] bg-[var(--glass)]/40 px-4 py-8 text-center text-sm text-muted-foreground"
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          void onFiles(e.dataTransfer.files);
        }}
      >
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          id="meta-creative-files"
          onChange={(e) => void onFiles(e.target.files)}
        />
        <label htmlFor="meta-creative-files" className="cursor-pointer text-[var(--sibling-primary)] font-medium">
          Choose files
        </label>
        <span className="mx-1">or drag and drop images and videos here.</span>
      </div>

      {progress != null && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--glass-border)]">
          <div
            className="h-full bg-[var(--sibling-primary)] transition-all"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading gallery…</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((m) => (
            <div
              key={m.id}
              className="relative aspect-square overflow-hidden rounded-lg border border-[var(--glass-border)] bg-black/5"
            >
              {m.imageUrl ? (
                <Image src={m.imageUrl} alt="" fill className="object-cover" unoptimized />
              ) : (
                <span className="p-2 text-xs text-muted-foreground">Image</span>
              )}
            </div>
          ))}
          {videos.map((m) => (
            <div
              key={m.id}
              className="relative aspect-video overflow-hidden rounded-lg border border-[var(--glass-border)] bg-black/20"
            >
              {m.thumbnailUrl ? (
                <Image src={m.thumbnailUrl} alt="" fill className="object-cover" unoptimized />
              ) : m.videoUrl ? (
                <video src={m.videoUrl} className="h-full w-full object-cover" controls muted playsInline />
              ) : (
                <span className="p-2 text-xs text-muted-foreground">Video</span>
              )}
              {m.status && m.status !== 'ready' && (
                <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[10px] text-white">
                  {m.status}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
