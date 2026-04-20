'use client';

import { useCallback, useEffect, useState } from 'react';
import { ViewMoreDropdown } from '@/app/components/common/UI/ViewMoreDropdown';
import { useCurrentContext } from '@/app/components/common/useCurrentContext';

const CTAS = [
  'LEARN_MORE',
  'SHOP_NOW',
  'SIGN_UP',
  'DOWNLOAD',
  'BOOK_TRAVEL',
  'CONTACT_US',
] as const;

type MediaRow = { id: string; imageHash: string | null; imageUrl: string | null };
type Creative = {
  id: string;
  headline: string;
  metaCreativeId: string | null;
};

export function AdCreativesTab() {
  const { meta } = useCurrentContext();
  const [images, setImages] = useState<MediaRow[]>([]);
  const [items, setItems] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mediaId, setMediaId] = useState('');
  const [headline, setHeadline] = useState('');
  const [primaryText, setPrimaryText] = useState('');
  const [description, setDescription] = useState('');
  const [landingUrl, setLandingUrl] = useState('https://');
  const [ctaType, setCtaType] = useState<string>(CTAS[0]!);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ri, rc] = await Promise.all([
        fetch('/api/meta/adimages?limit=100', { credentials: 'include' }),
        fetch('/api/meta/adcreatives', { credentials: 'include' }),
      ]);
      const ji = await ri.json().catch(() => ({}));
      const jc = await rc.json().catch(() => ({}));
      if (ri.ok) {
        const list = (Array.isArray(ji.items) ? ji.items : []) as MediaRow[];
        setImages(list);
      }
      if (rc.ok) setItems(Array.isArray(jc.items) ? jc.items : []);
    } catch {
      setError('Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (images.length && !mediaId) setMediaId(images[0]!.id);
  }, [images, mediaId]);

  useEffect(() => {
    if (meta) void load();
    else setLoading(false);
  }, [meta, load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/meta/adcreatives', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId,
          headline,
          primaryText,
          description,
          ctaType,
          landingUrl,
          name: headline,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof j.error === 'string' ? j.error : 'Create failed');
        return;
      }
      await load();
    } catch {
      setError('Create failed');
    } finally {
      setSaving(false);
    }
  };

  const sync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch('/api/meta/adcreatives/sync', {
        method: 'POST',
        credentials: 'include',
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof j.error === 'string' ? j.error : 'Sync failed');
        return;
      }
      await load();
    } catch {
      setError('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  if (!meta) return null;

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="space-y-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/40 p-4 max-w-xl">
        <h3 className="text-sm font-semibold">New ad creative (link ad)</h3>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Image from library</span>
          <ViewMoreDropdown tooltipContent="Image" align="left">
            {(close) => (
              <div className="py-1 max-h-56 overflow-auto">
                {images.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--glass-hover)]"
                    onClick={() => {
                      setMediaId(m.id);
                      close();
                    }}
                  >
                    {m.id.slice(0, 8)}… {m.imageHash ? `· ${m.imageHash.slice(0, 8)}` : ''}
                  </button>
                ))}
              </div>
            )}
          </ViewMoreDropdown>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Headline</label>
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            required
            className="w-full rounded-lg border border-[var(--glass-border)] bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Primary text</label>
          <textarea
            value={primaryText}
            onChange={(e) => setPrimaryText(e.target.value)}
            required
            rows={3}
            className="w-full rounded-lg border border-[var(--glass-border)] bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Description (optional)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-[var(--glass-border)] bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Landing URL</label>
          <input
            value={landingUrl}
            onChange={(e) => setLandingUrl(e.target.value)}
            required
            className="w-full rounded-lg border border-[var(--glass-border)] bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Call to action</span>
          <ViewMoreDropdown tooltipContent="CTA" align="left">
            {(close) => (
              <div className="py-1">
                {CTAS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--glass-hover)]"
                    onClick={() => {
                      setCtaType(c);
                      close();
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </ViewMoreDropdown>
          <p className="text-xs text-muted-foreground/80">{ctaType}</p>
        </div>
        <button
          type="submit"
          disabled={saving || !mediaId}
          className="rounded-lg bg-[var(--sibling-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? 'Creating…' : 'Create creative'}
        </button>
      </form>

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Creatives</h3>
        <button
          type="button"
          onClick={() => void sync()}
          disabled={syncing}
          className="rounded-lg border border-[var(--glass-border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--glass-hover)] disabled:opacity-50"
        >
          {syncing ? 'Syncing…' : 'Sync from Meta'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map((c) => (
            <li key={c.id} className="rounded-lg border border-[var(--glass-border)] px-3 py-2">
              <span className="font-medium">{c.headline}</span>
              {c.metaCreativeId && (
                <span className="ml-2 font-mono text-[10px] text-muted-foreground">{c.metaCreativeId}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
