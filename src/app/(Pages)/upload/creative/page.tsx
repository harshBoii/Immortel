'use client';

import React, { useMemo, useState } from 'react';

type StartRes =
  | {
      success: true;
      upload: {
        uploadId: string;
        key: string;
        partSize: number;
        totalParts: number;
        sessionId: string;
        assetType: 'VIDEO' | 'IMAGE' | 'DOCUMENT';
      };
      urls: Array<{ partNumber: number; url: string }>;
    }
  | { success: false; error: string };

type CompleteRes =
  | { success: true; assetId: string; queuedForStream: boolean; queueId?: string; queueStatus?: string }
  | { success: false; error: string };

function inferAssetType(file: File): 'VIDEO' | 'IMAGE' | 'DOCUMENT' {
  if (file.type.startsWith('video/')) return 'VIDEO';
  if (file.type.startsWith('image/')) return 'IMAGE';
  return 'DOCUMENT';
}

export default function UploadCreativePage() {
  const token = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('t') ?? '';
  }, []);

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'starting' | 'uploading' | 'finalizing' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function startUpload(f: File) {
    setErr(null);
    setAssetId(null);
    setProgress(0);
    setStatus('starting');

    const assetType = inferAssetType(f);
    const startRes = await fetch('/api/mcp/creative-upload/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-upload-token': token,
      },
      body: JSON.stringify({
        fileName: f.name,
        fileSize: f.size,
        fileType: f.type || 'application/octet-stream',
        assetType,
      }),
    });
    const startJson = (await startRes.json().catch(() => null)) as StartRes | null;
    if (!startJson || startJson.success !== true) {
      setStatus('error');
      setErr((startJson as any)?.error ?? `Start failed (HTTP ${startRes.status})`);
      return;
    }

    setStatus('uploading');

    const { uploadId, sessionId, partSize, totalParts } = startJson.upload;
    const urls = startJson.urls;

    const parts: Array<{ partNumber: number; etag: string }> = [];
    for (const u of urls) {
      const start = (u.partNumber - 1) * partSize;
      const end = Math.min(f.size, start + partSize);
      const chunk = f.slice(start, end);

      const putRes = await fetch(u.url, { method: 'PUT', body: chunk });
      if (!putRes.ok) {
        setStatus('error');
        setErr(`Part ${u.partNumber} upload failed (HTTP ${putRes.status})`);
        return;
      }
      const etag = putRes.headers.get('etag') ?? '';
      parts.push({ partNumber: u.partNumber, etag: etag.replaceAll('"', '') });
      setProgress(Math.round((parts.length / totalParts) * 100));
    }

    setStatus('finalizing');

    const completeRes = await fetch('/api/mcp/creative-upload/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-upload-token': token,
      },
      body: JSON.stringify({
        sessionId,
        uploadId,
        parts,
        assetType,
      }),
    });

    const completeJson = (await completeRes.json().catch(() => null)) as CompleteRes | null;
    if (!completeJson || completeJson.success !== true) {
      setStatus('error');
      setErr((completeJson as any)?.error ?? `Complete failed (HTTP ${completeRes.status})`);
      return;
    }

    setAssetId(completeJson.assetId);
    setStatus('done');
    setProgress(100);
  }

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: 16, fontFamily: 'ui-sans-serif, system-ui' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Upload creative</h1>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>
        Upload an image or video. After upload completes, copy the <code>assetId</code> and paste it into Claude.
      </p>

      {!token ? (
        <div style={{ padding: 12, border: '1px solid #f00', borderRadius: 8 }}>
          Missing upload token. Please request a new upload link from Claude.
        </div>
      ) : (
        <>
          <input
            type="file"
            accept="video/*,image/*"
            disabled={status === 'uploading' || status === 'finalizing' || status === 'starting'}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              if (f) void startUpload(f);
            }}
          />

          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>Status: {status}</span>
              <span>{progress}%</span>
            </div>
            <div style={{ height: 10, background: '#eee', borderRadius: 999 }}>
              <div style={{ width: `${progress}%`, height: 10, background: '#111', borderRadius: 999 }} />
            </div>
          </div>

          {file ? (
            <div style={{ marginTop: 12, opacity: 0.9 }}>
              File: <b>{file.name}</b> ({Math.round(file.size / (1024 * 1024))} MB)
            </div>
          ) : null}

          {err ? (
            <div style={{ marginTop: 12, padding: 12, border: '1px solid #f00', borderRadius: 8 }}>
              {err}
            </div>
          ) : null}

          {assetId ? (
            <div style={{ marginTop: 16, padding: 12, border: '1px solid #0a0', borderRadius: 8 }}>
              <div style={{ marginBottom: 8 }}>
                Upload complete. Copy this <code>assetId</code> into Claude:
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <code style={{ padding: '8px 10px', background: '#f6f6f6', borderRadius: 6, flex: 1 }}>
                  {assetId}
                </code>
                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(assetId);
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

