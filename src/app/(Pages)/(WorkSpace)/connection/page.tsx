'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Globe, ShoppingBag, Store, ExternalLink, Check, AlertCircle } from 'lucide-react';
import { SiOpenai, SiPerplexity, SiAnthropic } from 'react-icons/si';
import { useCurrentContext } from '@/app/components/common/useCurrentContext';
import LoadingAnimation from '@/app/components/animations/loading';

// ── Constants ──────────────────────────────────────────────────────────────────

const MCP_LINK = 'https://immortel.vercel.app/api/mcpServer';

type Platform = 'chatgpt' | 'perplexity' | 'claude';
type ModalTarget = 'shopify' | 'woocommerce' | 'wordpress' | null;

const PLATFORMS: { key: Platform; label: string; Icon: React.ElementType }[] = [
  { key: 'chatgpt',    label: 'ChatGPT',    Icon: SiOpenai },
  { key: 'perplexity', label: 'Perplexity', Icon: SiPerplexity },
  { key: 'claude',     label: 'Claude',     Icon: SiAnthropic },
];

const INSTRUCTIONS: Record<Platform, { title: string; steps: string[] }> = {
  chatgpt: {
    title: 'Connect with ChatGPT',
    steps: [
      'Go to App store',
      'Search The App',
      'Open and Connect To The App',
      'Tag The app and type the prompt',
      'See In Action',
    ],
  },
  perplexity: {
    title: 'Connect with Perplexity',
    steps: [
      'Go To Settings → Connector',
      'Tap On Custom Connector',
      `Enter the link "${MCP_LINK}" in MCP Server URL, any name, and set Auth to None`,
      'Connect by tapping the plus icon, search the connector and tick it',
      'Type your query and see it in action',
    ],
  },
  claude: {
    title: 'Connect with Claude',
    steps: [
      'Tap on "Connect Your Tool to Claude"',
      'Tap on Manage Connectors',
      'Tap the Plus Icon → Add Custom Connector',
      `Enter any name and paste: ${MCP_LINK}`,
      'Type your query and see it in action',
    ],
  },
};

// ── Step image ─────────────────────────────────────────────────────────────────

function StepImage({ platform, stepNum }: { platform: Platform; stepNum: number }) {
  const folder = platform === 'chatgpt' ? 'ChatGpt' : platform === 'perplexity' ? 'Perplexity' : 'Claude';
  return (
    <img
      src={`/MCP_Tutorial/${folder}/Step-${stepNum}.png`}
      alt={`Step ${stepNum}`}
      className="w-full rounded-lg object-contain bg-[var(--glass-hover)]"
      style={{ maxHeight: '28vh' }}   
    />
  );
}
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

function Modal({ title, icon: Icon, onClose, children }: {
  title: string;
  icon: React.ElementType;
  onClose: () => void;
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
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--glass-border)] bg-[var(--glass)]/60">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-foreground">{title}</span>
          </div>
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
        {/* Modal body */}
        <div className="overflow-auto flex-1">
          {children}
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

// ── Main unified page ──────────────────────────────────────────────────────────

export default function ConnectionPageClient() {
  const [platform, setPlatform] = useState<Platform>('chatgpt');
  const [stepIndex, setStepIndex] = useState(0);
  const [activeModal, setActiveModal] = useState<ModalTarget>(null);
  const [mcpFullscreen, setMcpFullscreen] = useState(false);

  const { shopify, woocommerce, wordpressIntegration } = useCurrentContext();

  const { title, steps } = INSTRUCTIONS[platform];

  const goPrev = () => setStepIndex((i) => Math.max(0, i - 1));
  const goNext = () => setStepIndex((i) => Math.min(steps.length - 1, i + 1));

  const integrationCards = [
    {
      key: 'shopify' as ModalTarget,
      label: 'Shopify',
      description: 'Store domain, install link, and OAuth for your workspace.',
      icon: Store,
      connected: Boolean(shopify),
    },
    {
      key: 'woocommerce' as ModalTarget,
      label: 'WooCommerce',
      description: 'Connect via the WooCommerce REST API authorization flow.',
      icon: ShoppingBag,
      connected: woocommerce?.status === 'installed',
    },
    {
      key: 'wordpress' as ModalTarget,
      label: 'WordPress',
      description: 'Connect a WordPress site using Application Passwords.',
      icon: Globe,
      connected: wordpressIntegration?.status === 'active',
    },
  ];

  return (
    <div className="flex flex-col gap-5 p-6 h-full overflow-hidden">

      {/* ── Top row: MCP (75%) + Coming Soon (25%) ── */}
      <div className="flex gap-5 min-h-0" style={{ height: '60vh' }}>

        {/* MCP Panel */}
        <div className="flex-[3] min-w-0 glass-card rounded-2xl overflow-hidden flex flex-col">
          {/* Accent line */}
          <div className="h-[2px] bg-gradient-to-r from-primary/50 via-primary/20 to-transparent flex-shrink-0" />

          {/* Header */}
            <div className="px-6 pt-5 pb-4 flex-shrink-0">
              {/* Title row — add flex justify-between */}
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-lg font-semibold text-foreground tracking-tight">MCP</h1>
                  <p className="mt-0.5 text-xs text-muted-foreground max-w-md">
                    Connect Immortel to AI assistants via the Model Context Protocol.
                  </p>
                </div>
                {/* ← new expand button */}
                <button
                  onClick={() => setMcpFullscreen(true)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-button text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="View tutorial fullscreen"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                  </svg>
                  Full view
                </button>
              </div>
            {/* Platform chips */}
            <div className="flex flex-wrap gap-2 mt-4">
              {PLATFORMS.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => { setPlatform(key); setStepIndex(0); }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                    platform === key
                      ? 'glass-button text-[var(--sibling-primary)] border border-[var(--sibling-primary)]/40 bg-[var(--sibling-primary)]/8'
                      : 'glass-button text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Step slider — fills remaining height */}
          <div className="flex-1 min-h-0 px-6 pb-5 flex flex-col gap-3">
            <p className="text-sm font-semibold text-foreground flex-shrink-0">{title}</p>

            <div className="flex items-center gap-3 flex-1 min-h-0">
              {/* Prev */}
              <button onClick={goPrev} disabled={stepIndex === 0}
                className="flex-shrink-0 w-9 h-9 rounded-xl glass-button flex items-center justify-center text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous step">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
              </button>

              {/* Slide viewport */}
              <div className="flex-1 min-w-0 min-h-0 overflow-hidden rounded-xl"
              style={{ isolation: 'isolate' }}>
                  <div
                      className="flex transition-transform duration-300 ease-out"  
                      style={{
                        width: `${steps.length * 100}%`,
                        transform: `translateX(-${(stepIndex / steps.length) * 100}%)`,
                      }}
                    >
                  {steps.map((step, idx) => (
                    <div key={idx} className="flex-shrink-0 px-1" style={{ width: `${100 / steps.length}%` }}>
                      <div className="flex gap-3 items-start h-full">
                        <span className="flex-shrink-0 w-7 h-7 mt-0.5 rounded-full bg-[var(--sibling-primary)]/15 text-[var(--sibling-primary)] flex items-center justify-center text-xs font-semibold">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0 space-y-3">
                          <p className="text-sm text-foreground leading-relaxed">{step}</p>
                          <StepImage platform={platform} stepNum={idx + 1} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next */}
              <button onClick={goNext} disabled={stepIndex === steps.length - 1}
                className="flex-shrink-0 w-9 h-9 rounded-xl glass-button flex items-center justify-center text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Next step">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>

            {/* Step dots */}
            <div className="flex items-center justify-center gap-1.5 flex-shrink-0">
              {steps.map((_, idx) => (
                <button key={idx} onClick={() => setStepIndex(idx)}
                  className={`rounded-full transition-all ${idx === stepIndex ? 'w-4 h-1.5 bg-[var(--sibling-primary)]' : 'w-1.5 h-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/50'}`}
                  aria-label={`Go to step ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Coming Soon: ACP + UCP */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* ACP card */}
          <div className="flex-1 glass-card rounded-2xl p-5 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-[var(--glass-border)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  Coming Soon
                </span>
              </div>
              <h2 className="text-xl font-bold text-foreground tracking-tight">ACP</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                App Context Protocol — connect Immortel to ChatGPT for richer app integrations and extended workflows.
              </p>
            </div>
            <div className="mt-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-[11px] font-semibold text-primary">
                <SiOpenai className="w-3 h-3" />
                ChatGPT
              </span>
            </div>
          </div>

          {/* UCP card */}
          <div className="flex-1 glass-card rounded-2xl p-5 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-[var(--glass-border)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  Coming Soon
                </span>
              </div>
              <h2 className="text-xl font-bold text-foreground tracking-tight">UCP</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Universal Context Protocol — bring Immortel data into Gemini for cross-platform AI integrations.
              </p>
            </div>
            <div className="mt-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 text-[11px] font-semibold text-blue-500">
                <SiAnthropic className="w-3 h-3" />
                Gemini
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom row: Integration cards (100% width, 35vh) ── */}
      <div className="grid grid-cols-3 gap-4 flex-shrink-0" style={{ height: '35vh' }}>
        {integrationCards.map(({ key, label, description, icon: Icon, connected }) => (
          <button
            key={key}
            onClick={() => setActiveModal(key)}
            className="glass-card rounded-2xl p-5 flex flex-col justify-between text-left hover:shadow-lg hover:border-[var(--sibling-primary)]/30 transition-all duration-200 group"
          >
            <div className="space-y-3">
              {/* Icon + status */}
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <StatusDot connected={connected} />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground">{label}</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>
              </div>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--sibling-primary)] mt-4">
              {connected ? 'Manage connection' : 'Connect now'}
              <ExternalLink className="w-3 h-3 opacity-60" />
            </div>
          </button>
        ))}
      </div>

      {/* ── Modals ── */}
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
      {/* ── MCP Fullscreen Tutorial Modal ── */}
      {mcpFullscreen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-[var(--color-bg)] backdrop-blur-sm"
          style={{ background: 'var(--glass-bg, var(--background))' }}
        >
          {/* Modal top bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--glass-border)] bg-[var(--glass)]/60 flex-shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-foreground">MCP Tutorial</span>
              {/* Platform chips — same as card */}
              <div className="flex gap-2">
                {PLATFORMS.map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    onClick={() => { setPlatform(key); setStepIndex(0); }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                      platform === key
                        ? 'glass-button text-[var(--sibling-primary)] border border-[var(--sibling-primary)]/40'
                        : 'glass-button text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setMcpFullscreen(false)}
              className="p-2 rounded-lg hover:bg-[var(--glass-hover)] text-muted-foreground transition-colors"
              aria-label="Close fullscreen"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Two-column: step list left, image right */}
          <div className="flex flex-1 min-h-0 gap-0">

            {/* Step list sidebar */}
            <div className="w-72 flex-shrink-0 border-r border-[var(--glass-border)] bg-[var(--glass)]/30 overflow-y-auto p-4 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 px-2 mb-3">
                {INSTRUCTIONS[platform].title}
              </p>
              {INSTRUCTIONS[platform].steps.map((step, idx) => (
                <button
                  key={idx}
                  onClick={() => setStepIndex(idx)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-150 flex items-start gap-3 ${
                    idx === stepIndex
                      ? 'bg-[var(--sibling-primary)]/10 text-foreground border border-[var(--sibling-primary)]/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-[var(--glass-hover)]'
                  }`}
                >
                  <span className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    idx === stepIndex
                      ? 'bg-[var(--sibling-primary)] text-white'
                      : 'bg-muted-foreground/15 text-muted-foreground'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </button>
              ))}
            </div>

            {/* Main image area */}
            <div className="flex-1 min-w-0 flex flex-col items-center justify-center p-8 gap-6">
              <img
                src={`/MCP_Tutorial/${
                  platform === 'chatgpt' ? 'ChatGpt' : platform === 'perplexity' ? 'Perplexity' : 'Claude'
                }/Step-${stepIndex + 1}.png`}
                alt={`Step ${stepIndex + 1}`}
                className="max-h-[65vh] w-auto max-w-full rounded-2xl object-contain border border-[var(--glass-border)] shadow-2xl bg-[var(--glass-hover)]"
              />

              {/* Prev / dots / next */}
              <div className="flex items-center gap-4">
                <button onClick={goPrev} disabled={stepIndex === 0}
                  className="w-9 h-9 rounded-xl glass-button flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous step">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <div className="flex items-center gap-1.5">
                  {INSTRUCTIONS[platform].steps.map((_, idx) => (
                    <button key={idx} onClick={() => setStepIndex(idx)}
                      className={`rounded-full transition-all ${idx === stepIndex ? 'w-4 h-1.5 bg-[var(--sibling-primary)]' : 'w-1.5 h-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/50'}`}
                    />
                  ))}
                </div>
                <button onClick={goNext} disabled={stepIndex === INSTRUCTIONS[platform].steps.length - 1}
                  className="w-9 h-9 rounded-xl glass-button flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next step">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}