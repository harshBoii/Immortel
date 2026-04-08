'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Globe, ShoppingBag, Store, ExternalLink, Copy, Check } from 'lucide-react';
import { SiOpenai, SiPerplexity, SiAnthropic,SiGooglegemini } from 'react-icons/si';
import { useCurrentContext } from '@/app/components/common/useCurrentContext';
import LoadingAnimation from '@/app/components/animations/loading';

// ── Constants ──────────────────────────────────────────────────────────────────

const MCP_SERVER_URL = 'https://immortell.shop/api/mcpServer';

type ModalTarget = 'mcp' | 'shopify' | 'woocommerce' | 'wordpress' | null;

// ── Integration status dot ─────────────────────────────────────────────────────

function StatusDot({ connected }: { connected: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
      connected ? 'text-emerald-500' : 'text-muted-foreground/60'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
      {connected ? 'Connected' : 'Not connected'}
    </span>
  );
}

// ── Modal wrapper ──────────────────────────────────────────────────────────────

function Modal({ title, icon: Icon, onClose, headerAction, children }: {
  title: string;
  icon: React.ElementType;
  onClose: () => void;
  headerAction?: React.ReactNode;  // ← add this
  children: React.ReactNode;

}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--color-bg,#f7f6f2)]/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl glass-card rounded-2xl overflow-hidden flex flex-col border border-[var(--glass-border)] shadow-2xl max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--glass-border)] bg-[var(--glass)]/60">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-foreground">{title}</span>
          </div>

          <div className="flex items-center gap-2">
              {headerAction}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-[var(--glass-hover)] text-muted-foreground transition-colors"
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
        <div className="overflow-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

// ── MCP modal content ──────────────────────────────────────────────────────────

function MCPContent() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(MCP_SERVER_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const platforms = [
    { label: 'ChatGPT',    Icon: SiOpenai,    hint: 'Use as a custom GPT action or App Store connector.' },
    { label: 'Perplexity', Icon: SiPerplexity, hint: 'Settings → Connectors → Custom Connector → paste URL.' },
    { label: 'Claude',     Icon: SiAnthropic,  hint: 'Manage Connectors → Add Custom Connector → paste URL.' },
  ];

  return (
    <div className="px-5 py-5 space-y-5">
      {/* URL block */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">MCP Server URL</p>
        <div className="flex items-center gap-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)] px-3 py-2.5">
          <code className="flex-1 text-xs font-mono text-foreground break-all select-all">
            {MCP_SERVER_URL}
          </code>
          <button
            onClick={handleCopy}
            className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              copied
                ? 'bg-emerald-500/15 text-emerald-500'
                : 'bg-primary/10 text-primary hover:bg-primary/20'
            }`}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Per-platform quick instructions */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Where to paste it</p>
        <div className="divide-y divide-[var(--glass-border)] rounded-xl border border-[var(--glass-border)] overflow-hidden">
          {platforms.map(({ label, Icon, hint }) => (
            <div key={label} className="flex items-start gap-3 px-4 py-3 bg-[var(--glass)]/40">
              <div className="flex-shrink-0 mt-0.5 h-6 w-6 flex items-center justify-center rounded-md bg-[var(--glass-hover)] text-foreground">
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">{label}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{hint}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Shopify modal content ──────────────────────────────────────────────────────

function ShopifyContent() {
  const router = useRouter();
  const { shopify, shopifyConnectUrl, expectedShopDomain, refetch, loading, error } = useCurrentContext();
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => { if (expectedShopDomain) setDraft(expectedShopDomain); }, [expectedShopDomain]);

  const connectHref = shopifyConnectUrl?.trim() || '/connect-shopify';
  const connectAbsolute = connectHref.startsWith('http') ? connectHref
    : `${typeof window !== 'undefined' ? window.location.origin : ''}${connectHref.startsWith('/') ? connectHref : `/${connectHref}`}`;
  const canConnect = Boolean(expectedShopDomain?.trim());
  const installShop = shopify?.shopDomain?.trim() || expectedShopDomain?.trim() || draft.trim();

  const handleSaveDomain = async () => {
    setFormError(null); setSaving(true);
    try {
      const res = await fetch('/api/company/shopify-app', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ expectedShopDomain: draft.trim() }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) { setFormError(data.error ?? 'Could not save'); return; }
      refetch(); window.dispatchEvent(new Event('immortel:refetch-context'));
    } catch { setFormError('Network error'); } finally { setSaving(false); }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect your Shopify store?')) return;
    setDisconnecting(true);
    try {
      const res = await fetch('/shopify/disconnect', { method: 'POST', credentials: 'include' });
      if (res.ok) { refetch(); window.dispatchEvent(new Event('immortel:refetch-context')); }
    } finally { setDisconnecting(false); }
  };

  const handleReconnect = () => {
    if (!installShop) return;
    let shop = installShop.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!shop.endsWith('.myshopify.com')) shop = `${shop}.myshopify.com`;
    router.push(`/shopify/install?shop=${encodeURIComponent(shop)}`);
  };

  if (loading) return <div className="p-8"><LoadingAnimation text="Loading…" /></div>;
  if (error) return <p className="p-8 text-sm text-destructive">{error}</p>;

  return (
    <div className="px-5 py-4 space-y-4">
      {shopify ? (
        <>
          <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/50 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-500">Connected</h3>
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">Store</p>
              <p className="text-sm font-mono bg-[var(--glass-hover)] rounded-lg px-3 py-2 border border-[var(--glass-border)]">{shopify.shopDomain}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">Install URL</p>
              <p className="text-xs font-mono text-muted-foreground break-all bg-[var(--glass-hover)] rounded-lg px-3 py-2 border border-[var(--glass-border)]">{connectAbsolute}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/shopify/install-app" prefetch={false} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">Install (step 1)</Link>
            <button onClick={handleReconnect} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">Connect OAuth (step 2)</button>
            <button onClick={handleDisconnect} disabled={disconnecting} className="px-3 py-1.5 rounded-lg text-xs font-medium text-destructive/90 bg-destructive/10 hover:bg-destructive/20 transition-colors disabled:opacity-50">
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/50 p-4 space-y-3">
            <p className="text-sm text-muted-foreground">Two-step flow: install the app in Shopify, then connect it here to authorize access.</p>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">Store domain</label>
              <input type="text" value={draft} onChange={(e) => setDraft(e.target.value)}
                placeholder="my-store.myshopify.com"
                className="w-full px-3 py-2 rounded-lg text-sm border border-[var(--glass-border)] bg-[var(--glass-hover)] font-mono" />
              <button onClick={handleSaveDomain} disabled={saving}
                className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Save domain'}
              </button>
              {formError && <p className="text-xs text-destructive mt-1.5">{formError}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/shopify/install-app" prefetch={false} className="px-3 py-2 rounded-xl text-xs font-semibold bg-primary/15 text-primary hover:bg-primary/25 transition-colors">Install app (step 1)</Link>
            {canConnect && <Link href="/connect-shopify" prefetch={false} className="px-3 py-2 rounded-xl text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors">Connect OAuth (step 2)</Link>}
          </div>
        </>
      )}
    </div>
  );
}

// ── WooCommerce modal content ──────────────────────────────────────────────────

function WooCommerceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ran = useRef(false);
  const { woocommerce, loading, error, refetch } = useCurrentContext();
  const [storeUrl, setStoreUrl] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current || searchParams?.get('woocommerce_connected') !== '1') return;
    ran.current = true;
    refetch(); window.dispatchEvent(new Event('immortel:refetch-context'));
    const next = new URL(window.location.href);
    next.searchParams.delete('woocommerce_connected');
    router.replace(next.pathname + next.search + next.hash, { scroll: false });
  }, [refetch, router, searchParams]);

  useEffect(() => {
    const err = searchParams?.get('error');
    if (err === 'wc_auth_denied') setFormError('Authorization was cancelled or failed.');
  }, [searchParams]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError(null); setConnecting(true);
    try {
      const res = await fetch('/api/woocommerce/connect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ storeUrl }),
      });
      const data = await res.json().catch(() => ({})) as { redirectUrl?: string; error?: string };
      if (!res.ok) { setFormError(data.error ?? 'Could not start connection'); return; }
      if (!data.redirectUrl) { setFormError('Missing redirect URL'); return; }
      window.location.href = data.redirectUrl;
    } catch { setFormError('Network error'); } finally { setConnecting(false); }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect your WooCommerce store?')) return;
    setDisconnecting(true);
    try {
      const res = await fetch('/api/woocommerce/disconnect', { method: 'POST', credentials: 'include' });
      if (res.ok) { refetch(); window.dispatchEvent(new Event('immortel:refetch-context')); }
      else setFormError('Could not disconnect');
    } finally { setDisconnecting(false); }
  };

  if (loading) return <div className="p-8"><LoadingAnimation text="Loading…" /></div>;
  if (error) return <p className="p-8 text-sm text-destructive">{error}</p>;

  const connected = woocommerce?.status === 'installed';
  return (
    <div className="px-5 py-4 space-y-4">
      {connected ? (
        <>
          <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/50 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-500">Connected</h3>
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">Store URL</p>
              <p className="text-sm font-mono bg-[var(--glass-hover)] rounded-lg px-3 py-2 border border-[var(--glass-border)] break-all">{woocommerce?.storeUrl}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Permissions</p>
                <p className="text-sm">{woocommerce?.keyPermissions ?? '—'}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Connected</p>
                <p className="text-sm">{woocommerce?.installedAt ? new Date(woocommerce.installedAt).toLocaleDateString() : '—'}</p>
              </div>
            </div>
          </div>
          <button onClick={handleDisconnect} disabled={disconnecting}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-destructive/90 bg-destructive/10 hover:bg-destructive/20 transition-colors disabled:opacity-50">
            {disconnecting ? 'Disconnecting…' : 'Disconnect store'}
          </button>
        </>
      ) : (
        <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/50 p-4 space-y-3">
          <p className="text-sm text-muted-foreground">Enter your store's base URL. You'll be redirected to approve API access.</p>
          <form onSubmit={handleConnect} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">Store URL</label>
              <input type="url" value={storeUrl} onChange={(e) => setStoreUrl(e.target.value)}
                placeholder="https://yourstore.com"
                className="w-full px-3 py-2 rounded-lg text-sm border border-[var(--glass-border)] bg-[var(--glass-hover)]" required />
            </div>
            {formError && <p className="text-xs text-destructive">{formError}</p>}
            <button type="submit" disabled={connecting}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary/15 text-primary hover:bg-primary/25 transition-colors disabled:opacity-50">
              {connecting ? 'Starting…' : 'Connect WooCommerce'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ── WordPress modal content ────────────────────────────────────────────────────

function WordPressContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ran = useRef(false);
  const { wordpressIntegration, loading, error, refetch } = useCurrentContext();
  const [url, setUrl] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current || searchParams?.get('wordpress_connected') !== '1') return;
    ran.current = true;
    refetch(); window.dispatchEvent(new Event('immortel:refetch-context'));
    const next = new URL(window.location.href);
    next.searchParams.delete('wordpress_connected');
    router.replace(next.pathname + next.search + next.hash, { scroll: false });
  }, [refetch, router, searchParams]);

  useEffect(() => {
    const err = searchParams?.get('error');
    if (!err) return;
    if (err === 'wp_rejected') setFormError('Connection cancelled.');
    else if (err === 'wp_missing_params') setFormError('Connection failed. Please try again.');
    else if (err === 'wp_invalid_state') setFormError('Connection expired. Please try again.');
  }, [searchParams]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError(null); setConnecting(true);
    try {
      const res = await fetch('/api/wordpress/connect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ siteUrl: url }),
      });
      const data = await res.json().catch(() => ({})) as { redirectUrl?: string; error?: string };
      if (!res.ok) { setFormError(data.error ?? 'Could not connect'); return; }
      if (!data.redirectUrl) { setFormError('Missing redirect URL'); return; }
      window.location.href = data.redirectUrl;
    } catch { setFormError('Network error'); } finally { setConnecting(false); }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect your WordPress site?')) return;
    setDisconnecting(true);
    try {
      const res = await fetch('/api/wordpress/disconnect', { method: 'POST', credentials: 'include' });
      if (res.ok) { refetch(); window.dispatchEvent(new Event('immortel:refetch-context')); }
      else setFormError('Could not disconnect');
    } finally { setDisconnecting(false); }
  };

  if (loading) return <div className="p-8"><LoadingAnimation text="Loading…" /></div>;
  if (error) return <p className="p-8 text-sm text-destructive">{error}</p>;

  const connected = wordpressIntegration?.status === 'active';
  return (
    <div className="px-5 py-4 space-y-4">
      {connected ? (
        <>
          <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/50 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-500">Connected</h3>
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">Site</p>
              <p className="text-sm font-mono bg-[var(--glass-hover)] rounded-lg px-3 py-2 border border-[var(--glass-border)] break-all">{wordpressIntegration?.siteUrl}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Authorized as</p>
                <p className="text-sm">{wordpressIntegration?.userLogin}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Connected</p>
                <p className="text-sm">{wordpressIntegration?.connectedAt ? new Date(wordpressIntegration.connectedAt).toLocaleDateString() : '—'}</p>
              </div>
            </div>
          </div>
          <button onClick={handleDisconnect} disabled={disconnecting}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-destructive/90 bg-destructive/10 hover:bg-destructive/20 transition-colors disabled:opacity-50">
            {disconnecting ? 'Disconnecting…' : 'Disconnect site'}
          </button>
        </>
      ) : (
        <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/50 p-4 space-y-3">
          <p className="text-sm text-muted-foreground">Enter your WordPress site URL. You'll be redirected to authorize via Application Passwords.</p>
          <form onSubmit={handleConnect} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">Site URL</label>
              <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder="https://yoursite.com"
                className="w-full px-3 py-2 rounded-lg text-sm border border-[var(--glass-border)] bg-[var(--glass-hover)]" required />
            </div>
            {formError && <p className="text-xs text-destructive">{formError}</p>}
            <button type="submit" disabled={connecting}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary/15 text-primary hover:bg-primary/25 transition-colors disabled:opacity-50">
              {connecting ? 'Validating…' : 'Connect WordPress'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ── MCP icon ───────────────────────────────────────────────────────────────────

function MCPIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 17l10 5 10-5"/>
      <path d="M2 12l10 5 10-5"/>
    </svg>
  );
}

// ── Main unified page ──────────────────────────────────────────────────────────

export default function ConnectionPageClient() {
  const [activeModal, setActiveModal] = useState<ModalTarget>(null);
  const { shopify, woocommerce, wordpressIntegration } = useCurrentContext();

  // ── All 6 cards ──
  const activeCards = [
    {
      key: 'mcp' as ModalTarget,
      label: 'MCP',
      description: 'Connect Immortel to any AI assistant via the Model Context Protocol.',
      Icon: MCPIcon,
      connected: true,  // MCP is always "available"
      statusLabel: 'Active',
      statusColor: 'text-[var(--sibling-primary)]',
      dotColor: 'bg-[var(--sibling-primary)]',
      cta: 'Get server URL',
    },
    {
      key: 'shopify' as ModalTarget,
      label: 'Shopify',
      description: 'Store domain, install link, and OAuth for your workspace.',
      Icon: Store,
      connected: Boolean(shopify),
      cta: Boolean(shopify) ? 'Manage connection' : 'Connect now',
    },
    {
      key: 'woocommerce' as ModalTarget,
      label: 'WooCommerce',
      description: 'Connect via the WooCommerce REST API authorization flow.',
      Icon: ShoppingBag,
      connected: woocommerce?.status === 'installed',
      cta: woocommerce?.status === 'installed' ? 'Manage connection' : 'Connect now',
    },
    {
      key: 'wordpress' as ModalTarget,
      label: 'WordPress',
      description: 'Connect a WordPress site using Application Passwords.',
      Icon: Globe,
      connected: wordpressIntegration?.status === 'active',
      cta: wordpressIntegration?.status === 'active' ? 'Manage connection' : 'Connect now',
    },
  ];

  const comingSoonCards = [
    {
      key: 'acp',
      label: 'ACP',
      description: 'App Context Protocol — connect Immortel to ChatGPT for richer app integrations and extended workflows.',
      Icon: SiOpenai,
      badge: 'ChatGPT',
      badgeClass: 'bg-primary/10 border-primary/20 text-primary',
    },
    {
      key: 'ucp',
      label: 'UCP',
      description: 'Universal Context Protocol — bring Immortel data into Gemini for cross-platform AI integrations.',
      Icon: SiGooglegemini,
      badge: 'Gemini',
      badgeClass: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-base font-semibold text-foreground tracking-tight">Connections</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Connect Immortel to AI assistants and e-commerce platforms.
        </p>
      </div>

      {/* ── Active integrations: 4-col grid ── */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-3">Integrations</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {activeCards.map(({ key, label, description, Icon, connected, statusLabel, statusColor, dotColor, cta }) => (
            <button
              key={key}
              onClick={() => setActiveModal(key)}
              className="glass-card rounded-2xl p-5 flex flex-col justify-between text-left hover:shadow-lg hover:border-[var(--sibling-primary)]/30 transition-all duration-200 group min-h-[160px]"
            >
              <div className="space-y-3">
              {/* Inside the activeCards.map, for the MCP card specifically */}
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
                  <Icon className="h-4.5 w-4.5" style={{ width: '18px', height: '18px' }} />
                </div>

                {/* Top-right: status + tutorial button */}
                <div className="flex items-center gap-2">
                  {statusLabel ? (
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${statusColor}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                      {statusLabel}
                    </span>
                  ) : (
                    <StatusDot connected={connected} />
                  )}

                  {/* Only render on MCP card */}
                  {key === 'mcp' && (
                    <Link
                      href="/connection/mcp"
                      prefetch={false}
                      onClick={(e) => e.stopPropagation()}  // prevent card modal from opening
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border border-[var(--glass-border)] text-muted-foreground hover:text-foreground hover:border-[var(--sibling-primary)]/40 transition-colors bg-[var(--glass-hover)]"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                      </svg>
                      See Tutorial
                    </Link>
                  )}
                </div>
              </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground">{label}</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">{description}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--sibling-primary)] mt-4">
                {cta}
                <ExternalLink className="w-3 h-3 opacity-60" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Coming soon: 2-col grid ── */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-3">Coming Soon</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {comingSoonCards.map(({ key, label, description, Icon, badge, badgeClass }) => (
            <div key={key} className="glass-card rounded-2xl p-5 flex flex-col justify-between opacity-70 min-h-[130px]">
              <div className="space-y-2">
                <span className="inline-flex items-center rounded-full border border-[var(--glass-border)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  Coming Soon
                </span>
                <h2 className="text-lg font-bold text-foreground tracking-tight">{label}</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
              </div>
              <div className="mt-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeClass}`}>
                  <Icon className="w-3 h-3" />
                  {badge}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Modals ── */}
      {activeModal === 'mcp' && (
      <Modal
          title="MCP Server"
          icon={MCPIcon}
          onClose={() => setActiveModal(null)}
          headerAction={
            <Link
              href="/connection/mcp"
              prefetch={false}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-semibold border border-[var(--glass-border)] text-muted-foreground hover:text-foreground hover:border-[var(--sibling-primary)]/40 transition-colors bg-primary/10 "
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className='bg-emerald-100'>
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
              </svg>
              See Tutorial
            </Link>
          }
        >
          <MCPContent />
        </Modal>
      )}      
     {activeModal === 'shopify' && (
        <Modal title="Shopify" icon={Store} onClose={() => setActiveModal(null)}>
          <ShopifyContent />
        </Modal>
      )}
      {activeModal === 'woocommerce' && (
        <Modal title="WooCommerce" icon={ShoppingBag} onClose={() => setActiveModal(null)}>
          <WooCommerceContent />
        </Modal>
      )}
      {activeModal === 'wordpress' && (
        <Modal title="WordPress" icon={Globe} onClose={() => setActiveModal(null)}>
          <WordPressContent />
        </Modal>
      )}
    </div>
  );
}