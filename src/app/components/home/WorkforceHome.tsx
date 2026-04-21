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
  Bot,
  ArrowRight,
} from 'lucide-react';
import { SiShopify, SiMeta, SiWoocommerce, SiWordpress, SiOpenai } from 'react-icons/si';

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
            <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed">{description}</p>
          </div>
        </div>

        {/* Right: custom slot */}
        {rightSlot && <div className="md:flex-shrink-0">{rightSlot}</div>}
      </div>
    );
  }

  return (
    <div className="glass-card relative flex flex-col rounded-2xl border border-[var(--glass-border)] bg-[var(--glass)]/70 p-5">
      {/* Top: icon + status pill */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[var(--glass-hover)] border border-[var(--glass-border)] flex-shrink-0">
          <Icon className="w-5 h-5 text-foreground/80" />
        </div>
        <StatusPill tone={statusTone}>{status}</StatusPill>
      </div>

      {/* Center: name + description */}
      <div className="mt-4">
        <h3 className="font-heading text-lg font-semibold text-foreground leading-tight">{name}</h3>
        <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed">{description}</p>
      </div>

      {/* Status row */}
      {statusLabel && (
        <div className="mt-4 flex items-center justify-between gap-2 rounded-lg bg-[var(--glass-hover)]/60 border border-[var(--glass-border)]/60 px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {statusLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
            {StatusIcon && <StatusIcon className="w-3.5 h-3.5 text-muted-foreground" />}
            {statusValue}
          </span>
        </div>
      )}

      {/* CTA */}
      <Link
        href={ctaHref}
        className={`mt-4 inline-flex items-center justify-center rounded-lg px-4 py-2 text-[13px] font-semibold transition-all ${
          ctaTone === 'solid'
            ? 'bg-foreground text-background hover:opacity-90'
            : 'border border-[var(--glass-border)] bg-[var(--glass)]/60 text-foreground hover:bg-[var(--glass-hover)]'
        }`}
      >
        {ctaLabel}
      </Link>
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
    <p className="mt-2 text-[13px] font-semibold text-foreground leading-tight">{name}</p>
    <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
      {connected ? connectedLabel : disconnectedLabel}
    </p>
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
   SETUP GUIDE BLOCK (Claude / ChatGPT)
============================================ */
const GuideBlock = ({
  icon: Icon,
  title,
  steps,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  steps: React.ReactNode[];
}) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--glass-hover)] border border-[var(--glass-border)] flex-shrink-0">
        <Icon className="w-3.5 h-3.5 text-foreground/80" />
      </span>
      <h4 className="text-[14px] font-semibold text-foreground">{title}</h4>
    </div>
    <ol className="ml-1 list-decimal list-inside space-y-1 text-[12px] text-muted-foreground leading-relaxed marker:text-muted-foreground/60 marker:font-semibold">
      {steps.map((s, i) => (
        <li key={i}>{s}</li>
      ))}
    </ol>
  </div>
);

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
    <div className="mx-auto min-h-[60vh] w-full max-w-6xl px-4 pb-10 pt-6 md:px-6">
      {/* ── Greeting ───────────────────────────────────────────── */}
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          {hello}, {firstName}.
        </h1>
        <p className="mt-1 font-heading text-xl text-muted-foreground md:text-2xl">
          Your AI Workforce is active.
        </p>
      </header>

      {/* ── Two-column layout ──────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        {/* ═══════════════════ LEFT: AI Agents ═══════════════════ */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-xl font-semibold text-foreground">Your AI Agents</h2>
            <Link
              href="/connection"
              className="text-[13px] font-medium text-muted-foreground hover:text-[var(--sibling-primary)] transition-colors"
            >
              Manage All →
            </Link>
          </div>

          {/* Top row: GEO + Calling */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              ctaHref="/call-center"
            />
          </div>

          {/* Bottom: Ad agent (wide) */}
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

        {/* ═══════════════════ RIGHT: Integrations ═══════════════════ */}
        <aside className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-semibold text-foreground">Integrations</h2>
          </div>

          {/* Integration grid — space for up to 5 cards (5th spans full width) */}
          <div className="grid grid-cols-2 gap-3">
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
              fullWidth
            />
          </div>

          {/* View more link */}
          <Link
            href="/connection"
            className="group inline-flex items-center justify-between rounded-xl border border-dashed border-[var(--glass-border)] bg-[var(--glass)]/40 px-3.5 py-2.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:border-[var(--glass-border)] hover:bg-[var(--glass-hover)] hover:text-foreground"
          >
            <span>View more integrations</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>

          {/* Setup Guide card */}
          <div className="glass-card rounded-2xl border border-[var(--glass-border)] bg-[var(--glass)]/70 p-5 space-y-4">
            <div>
              <h3 className="font-heading text-lg font-semibold text-foreground">Setup Guide</h3>
              <p className="mt-1 text-[12.5px] text-muted-foreground leading-relaxed">
                Manually connect your workspace to external AI assistants via the Model Context
                Protocol (MCP).
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Your MCP Link
              </p>
              <McpLinkField link={mcpLink} />
            </div>

            <div className="h-px bg-[var(--glass-border)]" />

            <GuideBlock
              icon={Bot}
              title="Claude Desktop"
              steps={[
                'Open your Claude Desktop settings.',
                <>
                  Navigate to the <strong>Developer</strong> tab.
                </>,
                <>
                  Click on <strong>Edit MCP Config</strong>.
                </>,
                'Paste your MCP connection link into the servers array and save.',
              ]}
            />

            <GuideBlock
              icon={SiOpenai as unknown as React.ComponentType<{ className?: string }>}
              title="ChatGPT"
              steps={[
                <>
                  Go to <strong>My GPTs</strong> and click Create a GPT.
                </>,
                <>
                  Under the <strong>Configure</strong> tab, scroll down and click Add Action.
                </>,
                'Select Import from URL and paste your MCP link.',
              ]}
            />
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
