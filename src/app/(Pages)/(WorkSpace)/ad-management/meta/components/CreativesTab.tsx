'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useCurrentContext } from '@/app/components/common/useCurrentContext';

import { MetaMediaPreview } from './MetaMediaPreview';

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
  const [syncing, setSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const syncFromMeta = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch('/api/meta/media/sync', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(typeof j.error === 'string' ? j.error : 'Sync failed');
      } else {
        await loadGallery();
      }
    } catch {
      setError('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const onFiles = useCallback(
    async (files: FileList | null) => {
      if (files == null || files.length === 0) return;
      // Copy to an array: clearing the input (or a live FileList) must not break uploads.
      const batch = Array.from(files);
      setError(null);
      for (let i = 0; i < batch.length; i++) {
        const file = batch[i]!;
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
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadGallery();
    },
    [loadGallery],
  );

  if (!meta) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Media library</h3>
            <button
              type="button"
              onClick={() => void syncFromMeta()}
              disabled={syncing}
              className="rounded-lg border border-[var(--glass-border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--glass-hover)] disabled:opacity-50"
            >
              {syncing ? 'Syncing…' : 'Sync from Meta'}
            </button>
          </div>

          <div
            role="button"
            tabIndex={0}
            aria-label="Upload images or videos"
            className="relative cursor-pointer rounded-xl border-2 border-dashed border-[var(--glass-border)] bg-[var(--glass)]/40 px-4 py-8 text-center text-sm text-muted-foreground"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void onFiles(e.dataTransfer.files);
            }}
            onClick={() => {
              fileInputRef.current?.click();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              tabIndex={-1}
              className="pointer-events-none absolute m-0 h-0 w-0 overflow-hidden border-0 p-0 opacity-0 [clip:rect(0,0,0,0)]"
              onChange={(e) => {
                const list = e.currentTarget.files;
                // Run uploads first (sync part copies files), then clear so the same file can be chosen again.
                void onFiles(list);
                e.currentTarget.value = '';
              }}
            />
            <p className="pointer-events-none">
              <span className="font-medium text-[var(--sibling-primary)]">Choose files</span>
              <span className="mx-1">or drag and drop images and videos here.</span>
            </p>
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
        </div>

        <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/20">
          <div className="border-b border-[var(--glass-border)] px-3 py-2">
            <h3 className="text-sm font-semibold">Gallery</h3>
          </div>
          {loading ? (
            <p className="p-3 text-sm text-muted-foreground">Loading gallery…</p>
          ) : (
            <div className="max-h-[calc(100vh-260px)] overflow-auto p-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {videos.map((m) => (
                  <div
                    key={m.id}
                    className="relative aspect-video overflow-hidden rounded-lg border border-[var(--glass-border)] bg-black/20"
                  >
                    <MetaMediaPreview
                      videoUrl={m.videoUrl}
                      posterUrl={m.thumbnailUrl}
                      imageUrl={!m.videoUrl ? m.thumbnailUrl ?? null : null}
                      emptyLabel="Video"
                    />
                    {m.status && m.status !== 'ready' && (
                      <span className="pointer-events-none absolute bottom-1 right-1 z-10 rounded bg-black/60 px-1 text-[10px] text-white">
                        {m.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
