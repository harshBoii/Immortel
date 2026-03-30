'use client';

import { useCallback, useEffect, useState } from 'react';
import LoadingAnimation from '@/app/components/animations/loading';
type LoadState = {
  apiKey: string;
  scopes: string;
  appUrl: string;
  connectUrl: string;
  expectedShopDomain: string;
  hasSecret: boolean;
  updatedAt: string | null;
};

export default function CompanyDevShopifyPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [scopes, setScopes] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [connectUrl, setConnectUrl] = useState('');
  const [expectedShopDomain, setExpectedShopDomain] = useState('');
  const [hasSecret, setHasSecret] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/company/shopify-app', { credentials: 'include' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to load');
        return;
      }
      const d = json.data as LoadState;
      setApiKey(d.apiKey);
      setScopes(d.scopes);
      setAppUrl(d.appUrl);
      setConnectUrl(d.connectUrl);
      setExpectedShopDomain(d.expectedShopDomain ?? '');
      setHasSecret(d.hasSecret);
      setApiSecret('');
    } catch {
      setError('Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const body: Record<string, string> = {};
      if (apiKey.trim()) body.apiKey = apiKey.trim();
      if (scopes.trim()) body.scopes = scopes.trim();
      if (appUrl.trim()) body.appUrl = appUrl.trim();
      if (apiSecret.trim()) body.apiSecret = apiSecret.trim();
      body.connectUrl = connectUrl.trim();
      body.expectedShopDomain = expectedShopDomain.trim();

      const hasCredentialField =
        Boolean(body.apiKey) ||
        Boolean(body.scopes) ||
        Boolean(body.appUrl) ||
        Boolean(body.apiSecret);
      if (!hasCredentialField && !body.connectUrl && !body.expectedShopDomain) {
        setError('Enter at least one field to save.');
        setSaving(false);
        return;
      }

      const res = await fetch('/api/company/shopify-app', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Save failed');
        return;
      }
      setSaved(true);
      setApiSecret('');
      window.dispatchEvent(new Event('immortel:refetch-context'));
      await load();
    } catch {
      setError('Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto min-h-[60vh] px-6 pb-6 pt-2">
      <h1 className="text-3xl font-semibold text-foreground font-heading tracking-tight">
        Shopify custom app (dev)
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        OAuth credentials for your company’s Shopify app. When all four values are set,
        Immortel uses them for install, callback, and webhooks; otherwise <code className="text-xs">SHOPIFY_*</code> env
        vars are used.
      </p>

      {loading ? (
        <LoadingAnimation />
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4 glass-card card-anime-float rounded-xl p-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              API key (Client ID)
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border border-[var(--glass-border)] bg-[var(--glass-hover)]"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              API secret
              {hasSecret ? (
                <span className="ml-2 text-xs font-normal text-emerald-500">saved</span>
              ) : null}
            </label>
            <input
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder={hasSecret ? 'Leave blank to keep existing' : ''}
              className="w-full px-3 py-2 rounded-lg text-sm border border-[var(--glass-border)] bg-[var(--glass-hover)]"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Scopes (comma-separated)
            </label>
            <textarea
              value={scopes}
              onChange={(e) => setScopes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm border border-[var(--glass-border)] bg-[var(--glass-hover)] font-mono text-xs"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              App URL (base, no trailing path)
            </label>
            <input
              type="url"
              value={appUrl}
              onChange={(e) => setAppUrl(e.target.value)}
              placeholder="https://your-app.example.com"
              className="w-full px-3 py-2 rounded-lg text-sm border border-[var(--glass-border)] bg-[var(--glass-hover)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Connect URL (sidebar “Connect Shopify store” link)
            </label>
            <input
              type="text"
              value={connectUrl}
              onChange={(e) => setConnectUrl(e.target.value)}
              placeholder="https://example.com/connect-shopify or /connect-shopify"
              className="w-full px-3 py-2 rounded-lg text-sm border border-[var(--glass-border)] bg-[var(--glass-hover)]"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Full URL or path starting with <code className="text-[10px]">/</code>. Leave empty to use <code className="text-[10px]">/connect-shopify</code>.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Expected store domain (for HMAC before install)
            </label>
            <input
              type="text"
              value={expectedShopDomain}
              onChange={(e) => setExpectedShopDomain(e.target.value)}
              placeholder="my-store.myshopify.com"
              className="w-full px-3 py-2 rounded-lg text-sm border border-[var(--glass-border)] bg-[var(--glass-hover)]"
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Must match the shop you open in Shopify Admin. Also editable from the sidebar before connecting.
            </p>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          {saved && (
            <div className="text-sm text-emerald-600 dark:text-emerald-400">Saved.</div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2.5 rounded-xl text-sm font-medium btn-primary disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
      )}
    </div>
  );
}
