'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ScanSearch,
  PhoneCall,
  MousePointerClick,
  Link as LinkIcon,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import {
  SiShopify,
  SiMeta,
  SiWoocommerce,
  SiWordpress,
  SiOpenai,
  SiPerplexity,
  SiGoogle,
} from 'react-icons/si';

/* ============================================
   TYPES
============================================ */
export type WorkforceHomeProps = {
  firstName: string;
  geoVisibilityPct: number | null;
  callsToday: number;
  adsPendingApproval: number;
  integrations: {
    shopify: boolean;
    meta: boolean;
    mcp: boolean;
    woocommerce: boolean;
    wordpress: boolean;
  };
  mcpLink: string;
};

/* ============================================
   HELPERS
============================================ */
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 18) return 'Good Afternoon';
  return 'Good Evening';
}

/* ============================================
   STATUS PILL (Active / Action Needed)
============================================ */
const StatusPill = ({
  tone,
  children,
}: {
  tone: 'active' | 'action';
  children: React.ReactNode;
}) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide leading-none ${
      tone === 'active'
        ? 'border-[var(--glass-border)] bg-[var(--glass-hover)]/70 text-foreground/80'
        : 'border-[var(--sibling-primary)]/30 bg-[var(--sibling-primary)]/8 text-[var(--sibling-primary)]'
    }`}
  >
    <span
      className={`h-1.5 w-1.5 rounded-full ${
        tone === 'active' ? 'bg-foreground/70' : 'bg-[var(--sibling-primary)]'
      }`}
    />
    {children}
  </span>
);

/* ============================================
   AGENT CARD
============================================ */
const AgentCard = ({
  icon: Icon,
  name,
  description,
  status,
  statusTone,
  statusLabel,
  statusValue,
  statusIcon: StatusIcon,
  ctaLabel,
  ctaHref,
  ctaTone = 'outline',
  wide = false,
  rightSlot,
}: {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  description: string;
  status: string;
  statusTone: 'active' | 'action';
  statusLabel?: string;
  statusValue?: string;
  statusIcon?: React.ComponentType<{ className?: string }>;
  ctaLabel: string;
  ctaHref: string;
  ctaTone?: 'outline' | 'solid';
  wide?: boolean;
  rightSlot?: React.ReactNode;
}) => {
  if (wide) {
    return (
      <div className="glass-card relative flex flex-col gap-4 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass)]/70 p-5 md:flex-row md:items-center md:gap-6">
        {/* Left: icon + pill + name + description */}
        <div className="flex items-start gap-4 md:flex-1 md:min-w-0">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[var(--glass-hover)] border border-[var(--glass-border)] flex-shrink-0">
            <Icon className="w-5 h-5 text-foreground/80" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-heading text-lg font-semibold text-foreground leading-tight">
                {name}
              </h3>
              <StatusPill tone={statusTone}>{status}</StatusPill>
            </div>
            <p className="mt-1 text-[13px] text-muted-foreground leading-snug">{description}</p>
          </div>
        </div>

        {/* Right: custom slot */}
        {rightSlot && <div className="md:flex-shrink-0">{rightSlot}</div>}
      </div>
    );
  }

  return (
    <div className="glass-card relative flex h-full flex-col rounded-2xl border border-[var(--glass-border)] bg-[var(--glass)]/70 p-5">
      {/* Top: icon + status pill */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[var(--glass-hover)] border border-[var(--glass-border)] flex-shrink-0">
          <Icon className="w-5 h-5 text-foreground/80" />
        </div>
        <StatusPill tone={statusTone}>{status}</StatusPill>
      </div>

      {/* Center: name + description */}
      <div className="mt-3.5">
        <h3 className="font-heading text-lg font-semibold text-foreground leading-tight">{name}</h3>
        <p className="mt-1 text-[13px] text-muted-foreground leading-snug">{description}</p>
      </div>

      {/* Status row */}
      {statusLabel && (
        <div className="mt-3.5 flex items-center justify-between gap-2 rounded-lg bg-[var(--glass-hover)]/60 border border-[var(--glass-border)]/60 px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {statusLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
            {StatusIcon && <StatusIcon className="w-3.5 h-3.5 text-muted-foreground" />}
            {statusValue}
          </span>
        </div>
      )}

      {/* CTA — pinned to bottom when card stretches */}
      <div className="mt-auto pt-4">
        <Link
          href={ctaHref}
          className={`flex w-full items-center justify-center rounded-lg px-4 py-2 text-[13px] font-semibold transition-all ${
            ctaTone === 'solid'
              ? 'bg-foreground text-background hover:opacity-90'
              : 'border border-[var(--glass-border)] bg-[var(--glass)]/60 text-foreground hover:bg-[var(--glass-hover)]'
          }`}
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
};

/* ============================================
   INTEGRATION PILL
============================================ */
const IntegrationPill = ({
  icon: Icon,
  name,
  connected,
  connectedLabel = 'Connected',
  disconnectedLabel = 'Not Connected',
  fullWidth = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  connected: boolean;
  connectedLabel?: string;
  disconnectedLabel?: string;
  fullWidth?: boolean;
}) => (
  <div
    className={`glass-card flex flex-col rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/70 p-3 ${
      connected ? '' : 'opacity-70'
    } ${fullWidth ? 'col-span-2' : ''}`}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--glass-hover)] border border-[var(--glass-border)] flex-shrink-0">
        <Icon className="w-4 h-4 text-foreground/80" />
      </div>
      <span
        className={`mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0 ${
          connected ? 'bg-foreground/70' : 'bg-muted-foreground/25'
        }`}
      />
    </div>
    <div className="mt-1.5">
      <p className="text-[12.5px] font-semibold text-foreground leading-tight truncate">{name}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground leading-tight truncate">
        {connected ? connectedLabel : disconnectedLabel}
      </p>
    </div>
  </div>
);

/* ============================================
   MCP LINK FIELD (with copy)
============================================ */
const McpLinkField = ({ link }: { link: string }) => {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-hover)]/50 px-2.5 py-1.5">
      <LinkIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      <code
        className="flex-1 truncate font-mono text-[11.5px] text-muted-foreground"
        title={link}
      >
        {link}
      </code>
      <button
        type="button"
        onClick={onCopy}
        className="flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-[var(--glass-hover)] transition-colors"
        title={copied ? 'Copied!' : 'Copy link'}
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-foreground" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
};

/* ============================================
   MCP CONNECTOR — mini version of /connection/mcp
   Platform switcher + per-step carousel with screenshot.
============================================ */
type McpPlatform = 'chatgpt' | 'perplexity' | 'claude';

const MCP_PLATFORM_ICONS: Record<McpPlatform, React.ComponentType<{ className?: string }>> = {
  chatgpt: SiOpenai as unknown as React.ComponentType<{ className?: string }>,
  perplexity: SiPerplexity as unknown as React.ComponentType<{ className?: string }>,
  claude: SiGoogle as unknown as React.ComponentType<{ className?: string }>,
};

const MCP_PLATFORM_LABEL: Record<McpPlatform, string> = {
  chatgpt: 'ChatGPT',
  perplexity: 'Perplexity',
  claude: 'Claude',
};

function buildMcpInstructions(
  mcpLink: string
): Record<McpPlatform, { title: string; steps: string[] }> {
  return {
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
        `Enter the link "${mcpLink}" in MCP Server Url, any desired name and Select Auth to None`,
        'Connect To The Connector by tapping the plus icon, search for the saved connector, tick it.',
        'Type Your Query and See in action',
      ],
    },
    claude: {
      title: 'Connect with Claude',
      steps: [
        'Tap on "Connect Your Tool to Claude"',
        'Tap on Manage Connectors',
        'Tap on the Plus Icon → Add Custom Connector',
        `Enter any name and enter the link ${mcpLink}`,
        'Type the query and see in action',
      ],
    },
  };
}

const McpStepImage = ({ platform, stepNum }: { platform: McpPlatform; stepNum: number }) => {
  const folder =
    platform === 'chatgpt' ? 'ChatGpt' : platform === 'perplexity' ? 'Perplexity' : 'Claude';
  const src = `/MCP_Tutorial/${folder}/Step-${stepNum}.png`;
  return (
    // Using native img to avoid next/image remote config concerns for local static assets.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${MCP_PLATFORM_LABEL[platform]} step ${stepNum}`}
      className="w-full flex-1 min-h-0 rounded-md object-contain bg-[var(--glass-hover)] border border-[var(--glass-border)]"
    />
  );
};

const McpConnectorMini = ({ mcpLink }: { mcpLink: string }) => {
  const [platform, setPlatform] = useState<McpPlatform>('chatgpt');
  const [stepIndex, setStepIndex] = useState(0);
  const instructions = useMemo(() => buildMcpInstructions(mcpLink), [mcpLink]);
  const { title, steps } = instructions[platform];

  const goPrev = () => setStepIndex((i) => Math.max(0, i - 1));
  const goNext = () => setStepIndex((i) => Math.min(steps.length - 1, i + 1));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Platform switcher */}
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(MCP_PLATFORM_ICONS) as McpPlatform[]).map((p) => {
          const Icon = MCP_PLATFORM_ICONS[p];
          const active = platform === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPlatform(p);
                setStepIndex(0);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-all duration-150 ${
                active
                  ? 'border-[var(--sibling-primary)]/40 bg-[var(--sibling-primary)]/10 text-[var(--sibling-primary)]'
                  : 'border-[var(--glass-border)] bg-[var(--glass)]/60 text-muted-foreground hover:text-foreground hover:bg-[var(--glass-hover)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {MCP_PLATFORM_LABEL[p]}
            </button>
          );
        })}
      </div>

      {/* Step body — fills remaining vertical space */}
      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/40 p-3">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <h4 className="text-[13px] font-semibold text-foreground truncate">{title}</h4>
          <span className="flex-shrink-0 text-[11px] text-muted-foreground/70">
            Step {stepIndex + 1} / {steps.length}
          </span>
        </div>

        <div className="flex min-h-0 flex-1 items-stretch gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={stepIndex === 0}
            aria-label="Previous step"
            className="flex-shrink-0 flex items-center justify-center w-8 rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/60 text-muted-foreground hover:text-foreground hover:bg-[var(--glass-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-[var(--sibling-primary)]/15 text-[var(--sibling-primary)] text-[10.5px] font-semibold">
                {stepIndex + 1}
              </span>
              <p className="text-[12px] text-foreground leading-snug min-w-0">{steps[stepIndex]}</p>
            </div>
            <McpStepImage platform={platform} stepNum={stepIndex + 1} />
          </div>

          <button
            type="button"
            onClick={goNext}
            disabled={stepIndex === steps.length - 1}
            aria-label="Next step"
            className="flex-shrink-0 flex items-center justify-center w-8 rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/60 text-muted-foreground hover:text-foreground hover:bg-[var(--glass-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================
   MAIN
============================================ */
export default function WorkforceHome({
  firstName,
  geoVisibilityPct,
  callsToday,
  adsPendingApproval,
  integrations,
  mcpLink,
}: WorkforceHomeProps) {
  const hello = useMemo(() => greeting(), []);

  const geoValue =
    geoVisibilityPct != null && Number.isFinite(geoVisibilityPct)
      ? `${Math.round(geoVisibilityPct)}% Visibility Score`
      : '— Visibility Score';

  const callsValue = `${callsToday} calls today`;

  return (
    <div className="flex min-h-screen w-full flex-col gap-6 px-5 py-6 md:px-8 md:py-7 lg:gap-7">
      {/* ── Greeting ───────────────────────────────────────────── */}
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          {hello}, {firstName}.
        </h1>
        <p className="mt-1 font-heading text-lg text-muted-foreground md:text-xl">
          Your AI Workforce is active.
        </p>
      </header>

      {/* ── Two-column layout — fills remaining viewport height ── */}
      <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-7">
        {/* ═══════════════════ LEFT: Agents (top) + Integrations (bottom) ═══════════════════ */}
        <div className="flex min-w-0 flex-col gap-6">
          {/* AGENTS */}
          <section className="flex flex-col">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-heading text-xl font-semibold text-foreground">Your AI Agents</h2>
              <Link
                href="/connection"
                className="text-[13px] font-medium text-muted-foreground hover:text-[var(--sibling-primary)] transition-colors"
              >
                Manage All →
              </Link>
            </div>

            {/* Top row: GEO + Calling */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-stretch">
              <AgentCard
                icon={ScanSearch}
                name="GEO Agent"
                description="Optimizing AI visibility and generating SEO pages."
                status="Active"
                statusTone="active"
                statusLabel="Status"
                statusValue={geoValue}
                statusIcon={AgentTrendIcon}
                ctaLabel="View GEO Dashboard"
                ctaHref="/geo/radar"
              />
              <AgentCard
                icon={PhoneCall}
                name="Calling Agent"
                description="Handling abandoned carts and lead follow-ups."
                status="Active"
                statusTone="active"
                statusLabel="Status"
                statusValue={callsValue}
                statusIcon={PhoneCall}
                ctaLabel="Manage Scripts"
                ctaHref="/calls/ai-calls"
              />
            </div>

            {/* Ad agent (wide) */}
            <div className="mt-4">
              <AgentCard
                icon={MousePointerClick}
                name="Ad Agent"
                description="Analyzing winning Meta/Google ads and publishing new ones."
                status="Action Needed"
                statusTone="action"
                ctaLabel="Review Ads"
                ctaHref="/ad-management/meta"
                wide
                rightSlot={
                  <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
                    <div className="flex items-center gap-2 text-[13px] text-foreground">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                      <span className="font-medium">
                        {adsPendingApproval} ads pending approval
                      </span>
                    </div>
                    <Link
                      href="/ad-management/meta"
                      className="inline-flex items-center justify-center rounded-lg bg-foreground px-4 py-2 text-[13px] font-semibold text-background hover:opacity-90 transition-opacity"
                    >
                      Review Ads
                    </Link>
                  </div>
                }
              />
            </div>
          </section>

          {/* INTEGRATIONS — grows to fill remaining left-column height */}
          <section className="flex min-h-0 flex-1 flex-col">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-heading text-xl font-semibold text-foreground">Integrations</h2>
              <Link
                href="/connection"
                className="group inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-[var(--sibling-primary)] transition-colors"
              >
                View more
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {/* 5-card grid — cards stay compact, section claims vertical space via its own flex-1 */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 items-start">
              <IntegrationPill
                icon={SiShopify}
                name="Shopify"
                connected={integrations.shopify}
              />
              <IntegrationPill
                icon={SiMeta}
                name="Meta"
                connected={integrations.meta}
              />
              <IntegrationPill
                icon={McpBrandIcon}
                name="MCP"
                connected={integrations.mcp}
                connectedLabel="Active"
              />
              <IntegrationPill
                icon={SiWoocommerce}
                name="WooCommerce"
                connected={integrations.woocommerce}
              />
              <IntegrationPill
                icon={SiWordpress}
                name="WordPress"
                connected={integrations.wordpress}
              />
            </div>
          </section>
        </div>

        {/* ═══════════════════ RIGHT: Setup Guide — fills column ═══════════════════ */}
        <aside className="flex min-w-0 flex-col">
          <div className="glass-card flex flex-1 flex-col rounded-2xl border border-[var(--glass-border)] bg-[var(--glass)]/70 p-5 gap-4">
            <div>
              <h3 className="font-heading text-xl font-semibold text-foreground">Setup Guide</h3>
              <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">
                Connect your workspace to external AI assistants via the Model Context Protocol
                (MCP).
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Your MCP Link
              </p>
              <McpLinkField link={mcpLink} />
            </div>

            <div className="h-px bg-[var(--glass-border)]" />

            {/* Connector grows to fill remaining card height */}
            <div className="flex min-h-0 flex-1 flex-col">
              <McpConnectorMini mcpLink={mcpLink} />
            </div>

            <Link
              href="/connection/mcp"
              className="group inline-flex items-center justify-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-[var(--sibling-primary)] transition-colors w-full"
            >
              Open full setup guide
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ============================================
   TINY INLINE ICONS (brand-like placeholders)
============================================ */
function AgentTrendIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 17 9 11 13 15 21 7" />
      <polyline points="14 7 21 7 21 14" />
    </svg>
  );
}

function McpBrandIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v4" />
      <path d="M12 17v4" />
      <path d="M3 12h4" />
      <path d="M17 12h4" />
      <path d="M5.6 5.6l2.8 2.8" />
      <path d="M15.6 15.6l2.8 2.8" />
      <path d="M5.6 18.4l2.8-2.8" />
      <path d="M15.6 8.4l2.8-2.8" />
    </svg>
  );
}
