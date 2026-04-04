'use client';

import { ShoppingBag } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCurrentContext } from '@/app/components/common/useCurrentContext';
import LoadingAnimation from '@/app/components/animations/loading';

export function ConnectionWooCommerceClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ran = useRef(false);

  const { woocommerce, loading, error, refetch } = useCurrentContext();

  const [storeUrl, setStoreUrl] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current) return;
    if (searchParams?.get('woocommerce_connected') !== '1') return;
    ran.current = true;

    refetch();
    window.dispatchEvent(new Event('immortel:refetch-context'));

    const next = new URL(window.location.href);
    next.searchParams.delete('woocommerce_connected');
    router.replace(next.pathname + (next.search ? next.search : '') + next.hash, {
      scroll: false,
    });
  }, [refetch, router, searchParams]);

  useEffect(() => {
    const err = searchParams?.get('error');
    if (!err) return;
    if (err === 'wc_auth_denied') setFormError('Authorization was cancelled or failed.');
  }, [searchParams]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setConnecting(true);
    try {
      const res = await fetch('/api/woocommerce/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ storeUrl }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        redirectUrl?: string;
        error?: string;
      };
      if (!res.ok) {
        setFormError(data.error ?? 'Could not start connection');
        return;
      }
      if (!data.redirectUrl) {
        setFormError('Missing redirect URL');
        return;
      }
      window.location.href = data.redirectUrl;
    } catch {
      setFormError('Network error');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect your WooCommerce store? You can reconnect later.')) return;
    setDisconnecting(true);
    setFormError(null);
    try {
      const res = await fetch('/api/woocommerce/disconnect', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        refetch();
        window.dispatchEvent(new Event('immortel:refetch-context'));
      } else {
        setFormError('Could not disconnect');
      }
    } finally {
      setDisconnecting(false);
    }
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

  const connected = woocommerce?.status === 'installed';

  return (
    <div className="max-w-2xl mx-auto min-h-[60vh] px-6 pb-6 pt-2">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <ShoppingBag className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold font-heading text-foreground tracking-tight">
            WooCommerce
          </h1>
          <p className="text-sm text-muted-foreground">
            Connect a store using the WooCommerce REST API authorization flow.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {connected ? (
          <section className="glass-card card-anime-float rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-emerald-400">Connected</h2>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Store URL</p>
              <p className="text-sm font-mono text-foreground bg-[var(--glass-hover)] rounded-lg px-3 py-2 border border-[var(--glass-border)] break-all">
                {woocommerce?.storeUrl}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Permissions</p>
                <p className="text-sm text-foreground">{woocommerce?.keyPermissions ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Connected</p>
                <p className="text-sm text-foreground">
                  {woocommerce?.installedAt
                    ? new Date(woocommerce.installedAt).toLocaleDateString()
                    : '—'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
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
              Enter your store&apos;s base URL (where WooCommerce is installed). You&apos;ll be
              redirected to approve API access; keys are delivered to this app over HTTPS.
            </p>

            <form onSubmit={handleConnect} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Store URL
                </label>
                <input
                  type="url"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  placeholder="https://yourstore.com"
                  className="w-full px-3 py-2 rounded-lg text-sm border border-[var(--glass-border)] bg-[var(--glass-hover)]"
                  required
                />
              </div>
              {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
              <button
                type="submit"
                disabled={connecting}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary to-violet-500 text-primary-foreground shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                {connecting ? 'Starting…' : 'Connect WooCommerce'}
              </button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
