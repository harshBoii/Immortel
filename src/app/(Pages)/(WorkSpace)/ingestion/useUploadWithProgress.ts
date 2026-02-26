'use client';

import { useCallback, useState } from 'react';

const PART_SIZE = 10 * 1024 * 1024; // 10 MB

function getAssetType(file: File): 'VIDEO' | 'IMAGE' | 'DOCUMENT' {
  if (file.type.startsWith('video/')) return 'VIDEO';
  if (file.type.startsWith('image/')) return 'IMAGE';
  return 'DOCUMENT';
}

export interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  assetId?: string;
  error?: string;
}

export function useUploadWithProgress() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const fetchCompanyId = useCallback(async () => {
    if (companyId) return companyId;
    const res = await fetch('/api/session', { credentials: 'include' });
    const data = await res.json();
    const cid = data?.companyId ?? null;
    setCompanyId(cid);
    return cid;
  }, [companyId]);

  const uploadFile = useCallback(
    async (file: File, onProgress?: (percent: number) => void): Promise<{ assetId?: string; error?: string }> => {
      const cid = await fetchCompanyId();
      if (!cid) return { error: 'Not authenticated' };

      const assetType = getAssetType(file);
      const startRes = await fetch('/api/upload/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          assetType,
        }),
      });
      const startData = await startRes.json();
      if (!startData.success || !startData.upload || !startData.urls?.length) {
        return { error: startData.error || 'Failed to start upload' };
      }

      const { uploadId, sessionId, partSize, totalParts } = startData.upload;
      const urls: { partNumber: number; url: string }[] = startData.urls;
      const parts: { partNumber: number; etag: string }[] = [];

      for (let i = 0; i < urls.length; i++) {
        const { partNumber, url } = urls[i];
        const start = (partNumber - 1) * partSize;
        const end = Math.min(start + partSize, file.size);
        const blob = file.slice(start, end);

        const putRes = await fetch(url, {
          method: 'PUT',
          body: blob,
          headers: { 'Content-Type': file.type },
        });
        if (!putRes.ok) {
          return { error: `Part ${partNumber} upload failed` };
        }
        let etag = putRes.headers.get('etag') ?? putRes.headers.get('ETag') ?? '';
        etag = etag.replace(/^"|"$/g, '');
        parts.push({ partNumber, etag });
        onProgress?.(Math.round((parts.length / totalParts) * 100));
      }

      const completeRes = await fetch('/api/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId,
          uploadId,
          parts,
          assetType,
          companyId: cid,
          priority: 'NORMAL',
        }),
      });
      const completeData = await completeRes.json();
      if (!completeData.success) {
        return { error: completeData.error || 'Failed to complete upload' };
      }
      return { assetId: completeData.assetId };
    },
    [fetchCompanyId]
  );

  const startUpload = useCallback(
    async (files: File[], onProgress?: (fileId: string, percent: number) => void) => {
      const newItems: UploadItem[] = Array.from(files).map((file) => ({
        id: `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        progress: 0,
        status: 'pending' as const,
      }));
      setItems((prev) => [...newItems, ...prev]);

      for (const item of newItems) {
        setItems((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, status: 'uploading' as const } : p))
        );
        const result = await uploadFile(item.file, (percent) => {
          onProgress?.(item.id, percent);
          setItems((prev) =>
            prev.map((p) => (p.id === item.id ? { ...p, progress: percent } : p))
          );
        });
        setItems((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? {
                  ...p,
                  progress: 100,
                  status: result.error ? ('error' as const) : ('done' as const),
                  error: result.error,
                  assetId: result.assetId,
                }
              : p
          )
        );
      }
    },
    [uploadFile]
  );

  const clearItems = useCallback(() => setItems([]), []);

  return { items, startUpload, clearItems, fetchCompanyId };
}
