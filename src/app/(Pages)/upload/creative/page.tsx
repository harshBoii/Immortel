'use client';

import React, { useMemo, useRef, useState } from 'react';

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

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'starting' | 'uploading' | 'finalizing' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [details, setDetails] = useState<string | null>(null);

  function formatMb(bytes: number): string {
    return `${Math.max(0.1, Math.round((bytes / (1024 * 1024)) * 10) / 10)} MB`;
  }

  function uploadPartWithProgress(args: {
    url: string;
    chunk: Blob;
    onProgress: (loaded: number, total: number) => void;
  }): Promise<{ etag: string }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', args.url, true);
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) args.onProgress(evt.loaded, evt.total);
      };
      xhr.onerror = () => reject(new Error('Network error while uploading part'));
      xhr.onabort = () => reject(new Error('Upload aborted'));
      xhr.onload = () => {
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new Error(`Part upload failed (HTTP ${xhr.status})`));
          return;
        }
        const etag = (xhr.getResponseHeader('etag') || xhr.getResponseHeader('ETag') || '').replaceAll('"', '');
        if (!etag) {
          reject(
            new Error(
              'Part uploaded but ETag header was not accessible. Check R2 CORS settings (must expose ETag).',
            ),
          );
          return;
        }
        resolve({ etag });
      };
      xhr.send(args.chunk);
    });
  }

  async function startUpload(f: File) {
    setErr(null);
    setAssetId(null);
    setProgress(0);
    setDetails(null);
    setStatus('starting');

    try {
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
      setDetails(`Uploading 0/${totalParts} parts…`);

      const parts: Array<{ partNumber: number; etag: string }> = [];
      let completedBytes = 0;

      for (const u of urls) {
        const partStart = (u.partNumber - 1) * partSize;
        const partEnd = Math.min(f.size, partStart + partSize);
        const chunk = f.slice(partStart, partEnd);
        const partTotal = partEnd - partStart;

        setDetails(`Uploading part ${u.partNumber}/${totalParts} (${formatMb(partTotal)})…`);

        const { etag } = await uploadPartWithProgress({
          url: u.url,
          chunk,
          onProgress: (loaded) => {
            const pct = Math.min(99, Math.round(((completedBytes + loaded) / f.size) * 100));
            setProgress(pct);
          },
        });

        parts.push({ partNumber: u.partNumber, etag });
        completedBytes += partTotal;
        setProgress(Math.min(99, Math.round((completedBytes / f.size) * 100)));
        setDetails(`Uploaded ${parts.length}/${totalParts} parts…`);
      }

      setStatus('finalizing');
      setDetails('Finalizing upload…');

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
      setDetails(null);
    } catch (e) {
      setStatus('error');
      setErr(e instanceof Error ? e.message : 'Upload failed');
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: '44px auto', padding: 16, fontFamily: 'ui-sans-serif, system-ui' }}>
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 26, fontWeight: 750, marginBottom: 8, letterSpacing: -0.2 }}>Upload creative</h1>
        <p style={{ opacity: 0.78, marginBottom: 0, lineHeight: 1.4 }}>
          Upload an image or video. When done, copy the <code>assetId</code> and paste it back into Claude.
        </p>
      </div>

      {!token ? (
        <div style={{ padding: 12, border: '1px solid #f00', borderRadius: 8 }}>
          Missing upload token. Please request a new upload link from Claude.
        </div>
      ) : (
        <>
          <div
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 14,
              padding: 14,
              background: 'linear-gradient(180deg, #ffffff, #fafafa)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 650, marginBottom: 4 }}>Choose a file</div>
                <div style={{ opacity: 0.72, fontSize: 13 }}>
                  Supported: videos (mp4/mov) and images (png/jpg). Large files upload via multipart.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                <input
                  ref={inputRef}
                  type="file"
                  accept="video/*,image/*"
                  style={{ display: 'none' }}
                  disabled={status === 'uploading' || status === 'finalizing' || status === 'starting'}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setFile(f);
                  }}
                />
                <button
                  onClick={() => inputRef.current?.click()}
                  disabled={status === 'uploading' || status === 'finalizing' || status === 'starting'}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid #111827',
                    background: '#111827',
                    color: 'white',
                    fontWeight: 650,
                    cursor: 'pointer',
                  }}
                >
                  Choose file
                </button>
                <button
                  onClick={() => file && void startUpload(file)}
                  disabled={!file || status === 'uploading' || status === 'finalizing' || status === 'starting'}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid #e5e7eb',
                    background: file ? '#ffffff' : '#f3f4f6',
                    color: '#111827',
                    fontWeight: 650,
                    cursor: file ? 'pointer' : 'not-allowed',
                  }}
                >
                  Upload
                </button>
              </div>
            </div>

            {file ? (
              <div
                style={{
                  marginTop: 12,
                  borderRadius: 12,
                  border: '1px solid #e5e7eb',
                  background: '#fff',
                  padding: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.name}
                    </div>
                    <div style={{ opacity: 0.7, fontSize: 13 }}>
                      {inferAssetType(file)} · {formatMb(file.size)} · {file.type || 'application/octet-stream'}
                    </div>
                  </div>
                  <div style={{ opacity: 0.6, fontSize: 13, whiteSpace: 'nowrap' }}>Status: {status}</div>
                </div>
              </div>
            ) : null}
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ opacity: 0.85 }}>{details ?? `Status: ${status}`}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{progress}%</span>
            </div>
            <div style={{ height: 10, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progress}%`,
                  height: 10,
                  background: 'linear-gradient(90deg, #111827, #4b5563)',
                  borderRadius: 999,
                  transition: 'width 120ms linear',
                }}
              />
            </div>
          </div>

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
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid #111827',
                    background: '#111827',
                    color: 'white',
                    fontWeight: 650,
                    cursor: 'pointer',
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

