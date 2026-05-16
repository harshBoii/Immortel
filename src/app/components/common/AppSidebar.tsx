'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Globe, ShoppingBag, Store, Clock, Settings, CreditCard } from 'lucide-react';
import { ThemePicker } from './ThemePicker';
import { useCurrentContext } from './useCurrentContext';


/* ============================================
   ICONS
============================================ */
const IconHome = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const IconChevronLeft = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const IconChevronRight = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const IconLayoutDashboard = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="7" height="9" x="3" y="3" rx="1" />
    <rect width="7" height="5" x="14" y="3" rx="1" />
    <rect width="7" height="9" x="14" y="12" rx="1" />
    <rect width="7" height="5" x="3" y="16" rx="1" />
  </svg>
);
const IconUpload = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" x2="12" y1="3" y2="15" />
  </svg>
);
const IconHistory = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const IconLogOut = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </svg>
);
const IconGlobe = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);
const IconKnight = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 20H7a2 2 0 0 1-2-2v-1l3-3v-4l-3-2V6l4-2 3 2h2l3-3h2l-1 4-2 2v9a2 2 0 0 1-2 2Z" />
    <path d="M7 20h13" />
    <circle cx="11.5" cy="8.5" r="0.5" />
  </svg>
);
const IconTarget = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);
const IconChartBars = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const IconDatabase = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="8" ry="3" />
    <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
    <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
  </svg>
);
const IconFileText = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
    <path d="M10 9H8" />
  </svg>
);
const IconHelp = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);


/* ============================================
   SECTIONS CONFIG
============================================ */
type MainSection = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hasSecondary: boolean;
  /** When true, section is excluded from the primary nav icons but still resolves secondary nav. */
  hidden?: boolean;
};

const MAIN_SECTIONS: MainSection[] = [
  { id: 'home',      label: 'Home',      icon: IconHome,   hasSecondary: true },
  { id: 'geo',       label: 'GEO',       icon: IconGlobe,  hasSecondary: true },
  // Workspace lives in the bottom utilities strip but still owns a secondary nav.
  { id: 'Workspace', label: 'Workspace', icon: Settings,   hasSecondary: true, hidden: true },
];


/* ============================================
   PRIMARY SIDEBAR ICON
   — No active indicator marker, just bg tint + color shift
============================================ */
const PrimarySidebarIcon = ({
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) => (
  <div className="w-full flex flex-col items-center select-none">
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`
        relative flex items-center justify-center w-10 h-10 rounded-xl
        transition-all duration-200
        ${isActive
          ? 'bg-[var(--sibling-primary)]/10 text-[var(--sibling-primary)]'
          : 'text-muted-foreground/60 hover:text-foreground hover:bg-[var(--glass-hover)]'
        }
      `}
    >
      <Icon className="w-[18px] h-[18px]" />
    </button>
    <span
      className={`mt-0.5 text-[9px] leading-none text-center transition-colors duration-200 ${
        isActive ? 'text-[var(--sibling-primary)]/80 font-semibold' : 'text-muted-foreground/40'
      }`}
    >
      {label}
    </span>
  </div>
);


/* ============================================
   SECONDARY NAV ITEM
============================================ */
const DisabledSecondaryNavItem = ({
  icon: Icon,
  label,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge: string;
}) => (
  <div
    className="relative flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13px] text-muted-foreground/45 cursor-not-allowed select-none"
    aria-disabled
  >
    {Icon && (
      <Icon className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
    )}
    <span className="flex-1 truncate">{label}</span>
    <span className="text-[9px] font-medium rounded-full border border-[var(--glass-border)] px-2 py-0.5 text-muted-foreground/50">
      {badge}
    </span>
  </div>
);


const SecondaryNavItem = ({
  icon: Icon,
  label,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}) => {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/' && pathname?.startsWith(href));

  return (
    <Link
      href={href}
      className={`
        relative flex items-center gap-2.5 px-3 py-[7px] rounded-lg
        text-[13px] transition-all duration-150
        ${isActive
          ? 'bg-[var(--sibling-primary)]/8 text-[var(--sibling-primary)] font-medium'
          : 'text-muted-foreground hover:text-foreground hover:bg-[var(--glass-hover)]'
        }
      `}
    >
      <span
        className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] rounded-r-full bg-[var(--sibling-primary)] transition-all duration-200"
        style={{ height: isActive ? '14px' : '0px', opacity: isActive ? 1 : 0 }}
      />
      {Icon && (
        <Icon className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${isActive ? 'text-[var(--sibling-primary)]' : ''}`} />
      )}
      <span className="flex-1 truncate">{label}</span>
    </Link>
  );
};


/* ============================================
   SECTION LABEL
============================================ */
const SectionLabel = ({ label }: { label: string }) => (
  <div className="px-3 pt-5 pb-1.5">
    <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.08em]">
      {label}
    </span>
  </div>
);


/* ============================================
   NOTIFICATIONS — deal copy helpers
============================================ */
type NotificationPrompt = {
  id: string;
  query: string;
  reason?: string | null;
  topic: string;
  estimatedRevenueUsd: number | null;
};

function formatUsdCompact(value: number | null) {
  if (value == null || !Number.isFinite(value)) return null;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `$${(value / 1_000).toFixed(0)}K`;
  return `$${Math.round(value).toLocaleString()}`;
}

/**
 * Deterministic hash from an ID string → small int.
 * Used to rotate copy variants without randomness (stable across renders).
 */
function idHash(id: string): number {
  return id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

/**
 * Builds urgency + insight copy assembled from the prompt's own data.
 */
function buildDealCopy(p: NotificationPrompt): { hook: string; insight: string } {
  const rev = formatUsdCompact(p.estimatedRevenueUsd);
  const hash = idHash(p.id);

  const hooks = [
    "Buyers are searching this right now",
    "Live queries — no one's claiming this",
    'High-intent window, still wide open',
    "This gap won't stay open long",
    "People are asking, nobody's answering",
    "Unclaimed traffic sitting on the table",
  ];
  const baseHook = hooks[hash % hooks.length];
  const hook = rev ? `${baseHook} · ${rev} in reach` : baseHook;

  const rawReason = typeof p.reason === 'string' ? p.reason.trim() : '';
  const firstSentence = rawReason.split(/(?<=[.!?])\s/)[0].trim();
  const insight =
    firstSentence.length > 5
      ? firstSentence.length > 90
        ? firstSentence.slice(0, 87) + '…'
        : firstSentence
      : '';

  return { hook, insight };
}


/* ============================================
   NOTIFICATIONS PANEL
============================================ */
const NotificationsPanel = () => {
  const [items, setItems] = useState<NotificationPrompt[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/home/notifications', { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        const prompts = Array.isArray(data?.prompts) ? data.prompts : [];
        if (!cancelled) setItems(prompts);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="px-2 pt-3">
      <div className="flex items-center gap-2 px-1 mb-5 border-b border-gray-200 pb-3">
        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/15 flex-shrink-0">
          <Bell className="h-3 w-3 text-amber-500" />
        </div>
        <span className="text-[18px] font-semibold text-foreground flex-1">Notifications</span>
        {loading && (
          <span className="text-[10px] text-muted-foreground/40 animate-pulse">Loading…</span>
        )}
      </div>

      <div className="space-y-2">
        {items.length === 0 && !loading && (
          <div className="flex flex-col items-center gap-2 py-6 rounded-xl border border-dashed border-[var(--glass-border)] text-center">
            <Bell className="h-4 w-4 text-muted-foreground/20" />
            <span className="text-[10px] text-muted-foreground/35 leading-snug px-3">
              All clear — check back soon
            </span>
          </div>
        )}

        {items.map((p) => {
          const rev = formatUsdCompact(p.estimatedRevenueUsd);
          const { hook, insight } = buildDealCopy(p);

          return (
            <div
              key={p.id}
              className="rounded-xl border border-[var(--glass-border)] overflow-hidden hover:border-amber-500/30 transition-all duration-200 group"
            >
              <div className="flex items-center gap-1.5 bg-amber-500/8 border-b border-amber-500/12 px-2.5 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 animate-pulse" />
                <span className="text-[9.5px] font-semibold text-amber-600 dark:text-amber-400 leading-none truncate">
                  {hook}
                </span>
              </div>

              <div className="p-2.5 bg-[var(--glass)]/40 space-y-1.5">
                <p className="text-[11px] font-semibold text-foreground leading-snug">
                  {p.query}
                </p>
                {insight && (
                  <p className="text-[10px] text-muted-foreground/60 leading-snug">
                    {insight}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="inline-flex items-center rounded-md border border-[var(--glass-border)] px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground/50 uppercase tracking-wide leading-none">
                    {p.topic}
                  </span>
                  {rev && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-500 leading-none">
                      <span className="w-1 h-1 rounded-full bg-emerald-500 flex-shrink-0" />
                      {rev}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


/* ============================================
   SECONDARY SIDEBAR CONTENT
============================================ */
const SecondarySidebarContent = ({ activeSection }: { activeSection: string }) => {
  switch (activeSection) {
    case 'home':
      return <NotificationsPanel />;

    case 'ingestion':
      return (
        <>
          <SectionLabel label="Ingestion" />
          <SecondaryNavItem icon={IconUpload}  label="Upload"  href="/ingestion" />
          <SecondaryNavItem icon={IconHistory} label="History" href="/ingestion/history" />
        </>
      );

    case 'geo':
      return (
        <>
          <SectionLabel label="GEO" />
          {/* <SecondaryNavItem icon={Radar}         label="Geo Radar"              href="/geo/radar" /> */}
          <SecondaryNavItem icon={IconKnight}    label="GeoKnight"              href="/geo/geoknight" />
          <SecondaryNavItem icon={IconChartBars} label="Intelligence Report"    href="/geo/report" />
          <SecondaryNavItem icon={IconTarget}    label="Bounty"                 href="/geo/bounty" />
          <SecondaryNavItem icon={IconFileText}  label="Generated Bounty Pages" href="/geo/bounty-pages" />
          <SecondaryNavItem icon={IconDatabase}  label="Data Mine"              href="/geo/data-mine" />
        </>
      );

    case 'Workspace':
      return (
        <>
          <SectionLabel label="Billing" />
          <SecondaryNavItem icon={CreditCard} label="Plan & usage" href="/workspace/plan" />
          <SectionLabel label="Connection" />
          <SecondaryNavItem icon={Globe}  label="Connectors" href="/connection" />
          <SectionLabel label="Integration Tutorials" />
          <SecondaryNavItem icon={Store} label="MCP"         href="/connection/mcp" />
          <SectionLabel label="Enrichment Services" />
          <SecondaryNavItem icon={Clock} label="Job Timing"  href="/jobs/time" />
          <SectionLabel label="Shop Data" />
          <SecondaryNavItem icon={ShoppingBag}         label="WooCommerce" href="/shop/woocommerce-products" />
          <SecondaryNavItem icon={IconLayoutDashboard} label="Shopify"     href="/shop/products" />
          <SecondaryNavItem icon={Globe}               label="WordPress"   href="/shop/wordpress-products" />
        </>
      );

    default:
      return (
        <>
          <SectionLabel label="Navigation" />
          <SecondaryNavItem icon={IconLayoutDashboard} label="Overview" href="/" />
        </>
      );
  }
};


/* ============================================
   MAIN APP SIDEBAR
============================================ */
export default function AppSidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const [activeSection,    setActiveSection]    = useState('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const {
    company, shopify, hqEligible,
    organizationName, organizationCompanies, refetch,
  } = useCurrentContext();

  const switchTenant = async (targetId: string) => {
    if (!company || targetId === company.id) return;
    const res = await fetch('/api/auth/switch-company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ companyId: targetId }),
    });
    if (!res.ok) return;
    refetch();
    router.push('/');
    router.refresh();
  };

  const getFirstRoute = (sectionId: string) => {
    switch (sectionId) {
      case 'home':      return '/';
      case 'ingestion': return '/ingestion';
      case 'geo':       return '/geo/geoknight';
      case 'Workspace': return '/workspace/plan';
      default:          return '/';
    }
  };

  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);
    router.push(getFirstRoute(sectionId));
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout failed:', err);
      router.push('/login');
    }
  };

  useEffect(() => {
    if      (pathname === '/' || pathname?.startsWith('/hq')) setActiveSection('home');
    else if (pathname?.startsWith('/ingestion'))              setActiveSection('ingestion');
    else if (pathname?.startsWith('/geo'))                    setActiveSection('geo');
    else if (pathname?.startsWith('/workspace'))              setActiveSection('Workspace');
    else if (pathname?.startsWith('/connection'))             setActiveSection('Workspace');
    else if (pathname?.startsWith('/jobs'))                   setActiveSection('Workspace');
    else if (pathname?.startsWith('/shop'))                   setActiveSection('Workspace');
    else                                                      setActiveSection('home');
  }, [pathname]);

  const currentSection = MAIN_SECTIONS.find((s) => s.id === activeSection);
  const showSecondary  = !sidebarCollapsed && currentSection?.hasSecondary;

  const springTransition = {
    type: 'spring' as const,
    stiffness: 420,
    damping: 38,
    mass: 0.85,
  };

  /* Org switcher block */
  const organizationSecondaryNav =
    hqEligible && organizationCompanies && organizationCompanies.length > 0 ? (
      <div className="mb-3 border-b border-[var(--sidebar-secondary-glass-border)] pb-3">
        <SectionLabel label={organizationName ?? 'Organization'} />
        <Link
          href="/hq"
          className={`
            mb-1 flex items-center gap-2.5 rounded-lg px-3 py-[7px] text-[13px] transition-all duration-150
            ${pathname === '/hq'
              ? 'bg-[var(--sibling-primary)]/8 text-[var(--sibling-primary)] font-medium'
              : 'text-muted-foreground hover:bg-[var(--glass-hover)] hover:text-foreground'
            }
          `}
        >
          <IconLayoutDashboard className={`h-3.5 w-3.5 flex-shrink-0 ${pathname === '/hq' ? 'text-[var(--sibling-primary)]' : ''}`} />
          <span className="flex-1 truncate">Headquarters</span>
        </Link>
        {organizationCompanies.map((c) => {
          const active = company?.id === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => void switchTenant(c.id)}
              className={`
                mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-[7px] text-left text-[13px] transition-all duration-150
                ${active
                  ? 'bg-[var(--sibling-primary)]/8 text-[var(--sibling-primary)] font-medium'
                  : 'text-muted-foreground hover:bg-[var(--glass-hover)] hover:text-foreground'
                }
              `}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${active ? 'bg-[var(--sibling-primary)]' : 'bg-muted-foreground/30'}`} />
              <span className="flex-1 truncate">
                {c.name}{c.isOrg ? ' · HQ' : ''}
              </span>
            </button>
          );
        })}
      </div>
    ) : null;

  return (
    <div className="flex h-screen sticky top-0 overflow-x-hidden">

      {/* ── Primary Sidebar ── */}
      <aside className="w-16 flex-shrink-0 glass-sidebar flex flex-col items-center py-4 z-20">
        {/* Logo */}
        <div className="mb-5">
          <div className="relative h-10 w-10 overflow-hidden rounded-xl">
            <Image
              src="/Immortel_Logo_Dark.png"
              alt="Immortell"
              fill
              className="object-contain object-center"
              sizes="40px"
              priority
            />
          </div>
        </div>

        <div className="w-8 h-px bg-[var(--sidebar-glass-border)] mb-4 opacity-50" />

        {/* Main nav — flat list, no agent group */}
        <nav className="flex-1 flex flex-col items-center gap-1.5 w-full px-2">
          {MAIN_SECTIONS.filter((s) => !s.hidden).map((section) => (
            <PrimarySidebarIcon
              key={section.id}
              icon={section.icon}
              label={section.label}
              isActive={activeSection === section.id}
              onClick={() => handleSectionClick(section.id)}
            />
          ))}
        </nav>

        {/* Bottom utilities */}
        <div className="mt-auto flex flex-col items-center gap-1 pt-4 w-full px-2">
          <div className="w-8 h-px bg-[var(--sidebar-glass-border)] mb-2 opacity-50" />

          <ThemePicker orientation="vertical" />
          <span id="sidebar-theme-toggle-label" className="text-[9px] leading-none text-muted-foreground/50 mb-1 mt-1">
            Theme
          </span>

          <button
            type="button"
            onClick={() => handleSectionClick('Workspace')}
            title="Workspace"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
              activeSection === 'Workspace'
                ? 'bg-[var(--sibling-primary)]/10 text-[var(--sibling-primary)]'
                : 'text-muted-foreground/60 hover:text-foreground hover:bg-[var(--glass-hover)]'
            }`}
          >
            <Settings className="w-[18px] h-[18px]" />
          </button>
          <span
            className={`text-[9px] leading-none mb-1 transition-colors duration-200 ${
              activeSection === 'Workspace'
                ? 'text-[var(--sibling-primary)]/80 font-semibold'
                : 'text-muted-foreground/40'
            }`}
          >
            Workspace
          </span>

          <Link
            href="/help"
            title="Quick Help"
            className="w-10 h-10 rounded-xl sidebar-icon flex items-center justify-center text-muted-foreground/60 hover:text-black dark:hover:text-[var(--alien-glow-green)] transition-colors"
          >
            <IconHelp className="w-[18px] h-[18px]" />
          </Link>
          <span className="text-[9px] leading-none text-muted-foreground/40 mb-1">Help</span>

          <button
            type="button"
            onClick={handleLogout}
            title="Log out"
            className="w-10 h-10 rounded-xl sidebar-icon flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            <IconLogOut className="w-[18px] h-[18px]" />
          </button>
          <span className="text-[9px] leading-none text-muted-foreground/40">Out</span>
        </div>
      </aside>

      {/* ── Secondary Sidebar ── */}
      <AnimatePresence initial={false}>
        {showSecondary && (
          <motion.aside
            key="secondary-sidebar"
            className="flex-shrink-0 glass-sidebar-secondary flex flex-col h-screen overflow-hidden"
            style={{ width: 224, minWidth: 224 }}
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={springTransition}
          >
            {/* Header */}
            <div className="px-4 py-3.5 nav-section-header flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--sibling-primary)] flex-shrink-0" />
                <h2 className="text-[13px] font-semibold text-foreground truncate">
                  {currentSection?.label ?? 'Navigation'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSidebarCollapsed(true)}
                className={`
                  group/collapse flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
                  border border-[color-mix(in_srgb,var(--alien-core-green)_42%,var(--glass-border))]
                  bg-[color-mix(in_srgb,var(--alien-glow-green)_16%,var(--glass-hover))]
                  text-black
                  shadow-[inset_0_1px_0_color-mix(in_srgb,white_55%,transparent),0_1px_3px_rgba(21,29,53,0.08),0_0_14px_-4px_color-mix(in_srgb,var(--alien-glow-green)_45%,transparent)]
                  ring-1 ring-[color-mix(in_srgb,var(--alien-glow-green)_28%,transparent)]
                  backdrop-blur-sm transition-all duration-200
                  hover:border-[color-mix(in_srgb,var(--alien-glow-green)_58%,var(--glass-border))]
                  hover:bg-[color-mix(in_srgb,var(--alien-glow-green)_26%,var(--glass-hover))]
                  hover:shadow-[inset_0_1px_0_color-mix(in_srgb,white_70%,transparent),0_4px_16px_-4px_color-mix(in_srgb,var(--alien-glow-green)_55%,transparent),0_0_22px_-2px_color-mix(in_srgb,var(--alien-glow-green)_40%,transparent)]
                  hover:ring-[color-mix(in_srgb,var(--alien-glow-green)_42%,transparent)]
                  active:scale-[0.96]
                  dark:border-[color-mix(in_srgb,var(--alien-core-green)_48%,oklch(0.22_0.02_160))]
                  dark:bg-[color-mix(in_srgb,var(--alien-glow-green)_12%,oklch(0.14_0.015_160_/_0.85))]
                  dark:text-white
                  dark:shadow-[inset_0_1px_0_oklch(0.32_0.02_160_/_0.35),0_2px_12px_-2px_rgba(0,0,0,0.45),0_0_18px_-4px_color-mix(in_srgb,var(--alien-glow-green)_35%,transparent)]
                  dark:ring-[color-mix(in_srgb,var(--alien-glow-green)_22%,transparent)]
                  dark:hover:border-[color-mix(in_srgb,var(--alien-glow-green)_55%,oklch(0.28_0.02_160))]
                  dark:hover:bg-[color-mix(in_srgb,var(--alien-glow-green)_22%,oklch(0.18_0.02_160_/_0.92))]
                  dark:hover:shadow-[inset_0_1px_0_oklch(0.38_0.025_160_/_0.4),0_0_28px_-2px_color-mix(in_srgb,var(--alien-glow-green)_45%,transparent)]
                `}
                title="Collapse sidebar"
              >
                <IconChevronLeft className="h-4 w-4 transition-transform duration-200 group-hover/collapse:-translate-x-px" />
              </button>
            </div>

            {/* Nav content */}
            <nav className="flex-1 overflow-y-auto px-2 py-1 glass-scrollbar">
              {activeSection === 'home' ? (
                <>
                  <div className="mb-3 border-b border-[var(--sidebar-secondary-glass-border)] pb-3">
                    <SecondarySidebarContent activeSection={activeSection} />
                  </div>
                  {organizationSecondaryNav}
                </>
              ) : (
                <>
                  {organizationSecondaryNav}
                  <SecondarySidebarContent activeSection={activeSection} />
                </>
              )}
            </nav>

            {/* Footer */}
            <div className="border-t border-[var(--sidebar-secondary-glass-border)] p-3 space-y-2 flex-shrink-0">
              {company && (
                <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/50 p-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[12px] font-semibold text-foreground truncate min-w-0">
                      {company.name}
                    </span>
                    <span className="shrink-0 rounded-full bg-[var(--sibling-primary)]/12 px-2 py-0.5 text-[9px] font-bold text-[var(--sibling-primary)] uppercase tracking-wide">
                      Workspace
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 truncate">{company.email}</p>
                  <div className="flex items-center justify-between pt-1 border-t border-[var(--glass-border)]">
                    <Link
                      href="/connection/shopify"
                      prefetch={false}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-[var(--sibling-primary)] transition-colors"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${shopify ? 'bg-emerald-500' : 'bg-muted-foreground/25'}`} />
                      Shopify
                    </Link>
                    {shopify ? (
                      <span className="text-[10px] font-mono text-emerald-400/80 truncate max-w-[90px]" title={shopify.shopDomain}>
                        {shopify.shopDomain}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => router.push('/connection/shopify')}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md border border-[var(--glass-border)] text-muted-foreground hover:text-[var(--sibling-primary)] hover:border-[var(--sibling-primary)]/30 transition-all"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] text-muted-foreground/60 hover:text-[var(--sibling-primary)] hover:bg-[var(--glass-hover)] transition-all"
              >
                <IconLogOut className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Log out</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Collapsed: floating expand button ── */}
      {sidebarCollapsed && currentSection?.hasSecondary && (
        <button
          type="button"
          onClick={() => setSidebarCollapsed(false)}
          className="group fixed left-16 top-1/2 z-10 -translate-y-1/2 rounded-r-lg border border-l-0 border-[var(--glass-border)] bg-[var(--glass-bg)]/90 px-1.5 py-3 text-muted-foreground shadow-lg backdrop-blur-md transition-all hover:bg-[var(--glass-hover)] hover:text-[var(--sibling-primary)] hover:px-2"
          title="Expand sidebar"
        >
          <IconChevronRight className="h-3.5 w-3.5 transition-colors group-hover:text-[var(--sibling-primary)]" />
        </button>
      )}
    </div>
  );
}