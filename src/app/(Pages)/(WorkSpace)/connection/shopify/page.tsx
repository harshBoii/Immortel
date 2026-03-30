'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Store } from 'lucide-react';
import { useCurrentContext } from '@/app/components/common/useCurrentContext';
import LoadingAnimation from '@/app/components/animations/loading';

function absoluteConnectUrl(connectHref: string): string {
  if (connectHref.startsWith('http://') || connectHref.startsWith('https://')) {
    return connectHref;
  }
  if (typeof window === 'undefined') {
    return connectHref.startsWith('/') ? connectHref : `/${connectHref}`;
  }
  const path = connectHref.startsWith('/') ? connectHref : `/${connectHref}`;
  return `${window.location.origin}${path}`;
}

export default function ConnectionShopifyPage() {
  const router = useRouter();
  const {
    shopify,
    shopifyConnectUrl,
    expectedShopDomain,
    refetch,
    loading,
    error,
  } = useCurrentContext();

  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (expectedShopDomain) setDraft(expectedShopDomain);
  }, [expectedShopDomain]);

  const connectHref = shopifyConnectUrl?.trim() || '/connect-shopify';
  const connectAbsolute = absoluteConnectUrl(connectHref);
  const canConnect = Boolean(expectedShopDomain?.trim());
  const hasInstallLink = Boolean(shopifyConnectUrl?.trim());
  const installShop =
    shopify?.shopDomain?.trim() ||
    expectedShopDomain?.trim() ||
    draft.trim();

  const handleSaveDomain = async () => {
    setFormError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/company/shopify-app', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ expectedShopDomain: draft.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setFormError(data.error ?? 'Could not save');
        return;
      }
      refetch();
      window.dispatchEvent(new Event('immortel:refetch-context'));
    } catch {
      setFormError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect your Shopify store? You can reconnect later.')) return;
    setDisconnecting(true);
    try {
      const res = await fetch('/shopify/disconnect', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        refetch();
        window.dispatchEvent(new Event('immortel:refetch-context'));
      }
    } finally {
      setDisconnecting(false);
    }
  };

  const handleReconnect = () => {
    if (!installShop) return;
    let shop = installShop.trim().toLowerCase();
    shop = shop.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!shop.endsWith('.myshopify.com')) {
      shop = `${shop}.myshopify.com`;
    }
    router.push(`/shopify/install?shop=${encodeURIComponent(shop)}`);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto min-h-[50vh] px-6 pb-6 pt-2">
        <LoadingAnimation text={`Jus A Sec...`} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto min-h-[50vh] px-6 pb-6 pt-2">
        <p className="text-sm text-destructive mt-8">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto min-h-[60vh] px-6 pb-6 pt-2">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Store className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold font-heading text-foreground tracking-tight">
            Shopify
          </h1>
          <p className="text-sm text-muted-foreground">
            Store domain, install link, and OAuth lookup for your workspace.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {shopify ? (
          <section className="glass-card card-anime-float rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-emerald-400">Connected</h2>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Store</p>
              <p className="text-sm font-mono text-foreground bg-[var(--glass-hover)] rounded-lg px-3 py-2 border border-[var(--glass-border)]">
                {shopify.shopDomain}
              </p>
            </div>
            {expectedShopDomain ? (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Saved lookup domain (read-only)
                </p>
                <p className="text-sm font-mono text-muted-foreground bg-[var(--glass-hover)] rounded-lg px-3 py-2 border border-[var(--glass-border)]">
                  {expectedShopDomain}
                </p>
              </div>
            ) : null}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Install URL (read-only)
              </p>
              <p className="text-sm font-mono text-muted-foreground break-all bg-[var(--glass-hover)] rounded-lg px-3 py-2 border border-[var(--glass-border)]">
                {connectAbsolute}
              </p>
              {!connectHref.startsWith('http') && (
                <p className="text-xs text-muted-foreground mt-1">
                  Path: <code className="text-[11px]">{connectHref}</code>
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Link
                href="/shopify/install-app"
                prefetch={false}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
              >
                Install (step 1)
              </Link>
              <button
                type="button"
                onClick={handleReconnect}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
              >
                Connect (OAuth, step 2)
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="px-4 py-2 rounded-lg text-sm font-medium text-destructive/90 bg-destructive/10 hover:bg-destructive/20 transition-colors disabled:opacity-50"
              >
                {disconnecting ? 'Disconnecting…' : 'Disconnect store'}
              </button>
            </div>
          </section>
        ) : (
          <section className="glass-card card-anime-float rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Not connected</h2>
            <p className="text-sm text-muted-foreground">
              This is a two-step flow: first install the app in Shopify, then connect it here to
              authorize access and link it to your workspace.
            </p>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                {expectedShopDomain ? 'Update store domain' : 'Store domain'}
              </label>
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="my-store.myshopify.com"
                className="w-full px-3 py-2 rounded-lg text-sm border border-[var(--glass-border)] bg-[var(--glass-hover)] font-mono"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={handleSaveDomain}
                disabled={saving}
                className="mt-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary/15 text-primary hover:bg-primary/25 disabled:opacity-50"
              >
                {saving ? 'Updating...' : 'Update store domain'}
              </button>
              {formError && (
                <p className="text-sm text-destructive mt-2">{formError}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Install URL (step 1, read-only)
              </p>
              <p className="text-sm font-mono text-muted-foreground break-all bg-[var(--glass-hover)] rounded-lg px-3 py-2 border border-[var(--glass-border)]">
                {connectAbsolute}
              </p>
              {!connectHref.startsWith('http') && (
                <p className="text-xs text-muted-foreground mt-1">
                  Path: <code className="text-[11px]">{connectHref}</code>
                </p>
              )}
            </div>
            <div className="pt-2">
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/shopify/install-app"
                  prefetch={false}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary to-violet-500 text-primary-foreground shadow-lg hover:shadow-xl transition-all"
                >
                  Install app (step 1)
                </Link>
                {canConnect ? (
                  <Link
                    href="/connect-shopify"
                    prefetch={false}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                  >
                    Connect (OAuth, step 2)
                  </Link>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Save a store domain above to enable <strong>Connect (OAuth, step 2)</strong>.
                  </p>
                )}
              </div>
              {hasInstallLink ? null : (
                <p className="text-xs text-muted-foreground mt-2">
                  No install link is set for this workspace. Add a Shopify install URL in your
                  company settings (Shopify connectUrl).
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
