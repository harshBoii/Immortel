'use client';

import { Globe } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCurrentContext } from '@/app/components/common/useCurrentContext';
import LoadingAnimation from '@/app/components/animations/loading';

export default function ConnectionWordPressPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ran = useRef(false);

  const { wordpressIntegration, loading, error, refetch } = useCurrentContext();

  const [url, setUrl] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current) return;
    if (searchParams?.get('wordpress_connected') !== '1') return;
    ran.current = true;

    refetch();
    window.dispatchEvent(new Event('immortel:refetch-context'));

    const next = new URL(window.location.href);
    next.searchParams.delete('wordpress_connected');
    router.replace(next.pathname + (next.search ? next.search : '') + next.hash, {
      scroll: false,
    });
  }, [refetch, router, searchParams]);

  useEffect(() => {
    const err = searchParams?.get('error');
    if (!err) return;
    if (err === 'wp_rejected') setFormError('Connection cancelled.');
    else if (err === 'wp_missing_params')
      setFormError('Connection failed. Please try again.');
    else if (err === 'wp_invalid_state')
      setFormError('Connection expired. Please try again.');
  }, [searchParams]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setConnecting(true);
    try {
      const res = await fetch('/api/wordpress/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ siteUrl: url }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        redirectUrl?: string;
        error?: string;
      };
      if (!res.ok) {
        setFormError(data.error ?? 'Could not connect');
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
    if (!confirm('Disconnect your WordPress site? You can reconnect later.')) return;
    setDisconnecting(true);
    setFormError(null);
    try {
      const res = await fetch('/api/wordpress/disconnect', {
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

  const connected = wordpressIntegration?.status === 'active';
  const needsReconnect = wordpressIntegration?.status === 'disconnected';

  return (
    <div className="max-w-2xl mx-auto min-h-[60vh] px-6 pb-6 pt-2">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Globe className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold font-heading text-foreground tracking-tight">
            WordPress
          </h1>
          <p className="text-sm text-muted-foreground">
            Connect a WordPress site using Application Passwords.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {connected ? (
          <section className="glass-card card-anime-float rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-emerald-400">Connected</h2>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Site</p>
              <p className="text-sm font-mono text-foreground bg-[var(--glass-hover)] rounded-lg px-3 py-2 border border-[var(--glass-border)] break-all">
                {wordpressIntegration?.siteUrl}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Authorized as
                </p>
                <p className="text-sm text-foreground">
                  {wordpressIntegration?.userLogin}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Connected
                </p>
                <p className="text-sm text-foreground">
                  {wordpressIntegration?.connectedAt
                    ? new Date(wordpressIntegration.connectedAt).toLocaleDateString()
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
                {disconnecting ? 'Disconnecting…' : 'Disconnect site'}
              </button>
            </div>
          </section>
        ) : (
          <section className="glass-card card-anime-float rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">
              {needsReconnect ? 'Reconnect needed' : 'Not connected'}
            </h2>
            <p className="text-sm text-muted-foreground">
              Enter your WordPress site URL. You’ll be redirected to authorize via Application
              Passwords.
            </p>

            <form onSubmit={handleConnect} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Site URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://yoursite.com"
                  className="w-full px-3 py-2 rounded-lg text-sm border border-[var(--glass-border)] bg-[var(--glass-hover)]"
                  required
                />
              </div>
              {formError ? (
                <p className="text-sm text-destructive">{formError}</p>
              ) : null}
              <button
                type="submit"
                disabled={connecting}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary to-violet-500 text-primary-foreground shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                {connecting ? 'Validating…' : 'Connect WordPress'}
              </button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}

