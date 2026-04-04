'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Globe, ShoppingBag, Store } from 'lucide-react';
import { SiGoogle,SiOpenai } from 'react-icons/si';
import { DayNightLottieToggle } from '../animations/dayNight/DayNightLottieToggle';
import { useTheme } from './ThemeProvider';
import { useCurrentContext } from './useCurrentContext';

/* ============================================
   ICONS (inline SVG to avoid extra deps)
============================================ */
const IconHome = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const IconIngestion = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" x2="12" y1="3" y2="15" />
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

const IconRadar = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a10 10 0 0 1 10 10" />
    <path d="M12 2a10 10 0 0 0-10 10" />
    <path d="M12 2v20" />
    <path d="M2 12h20" />
    <path d="M12 6a6 6 0 0 1 6 6" />
    <path d="M12 6a6 6 0 0 0-6 6" />
  </svg>
);

const IconKnight = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
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

const IconShop = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l1-5h16l1 5" />
    <path d="M5 9l1 11h12l1-11" />
    <path d="M9 13h6" />
  </svg>
);

const IconDatabase = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="8" ry="3" />
    <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
    <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
  </svg>
);

const IconGitBranch = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="6" r="3" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="18" cy="18" r="3" />
    <path d="M9 6h6" />
    <path d="M18 9v6" />
    <path d="M6 9v6a3 3 0 0 0 3 3h6" />
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

const IconConnection = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
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
const MAIN_SECTIONS = [
  { id: 'home', label: 'Home', icon: IconHome, hasSecondary: false },
  // { id: 'ingestion', label: 'Ingestion', icon: IconIngestion, hasSecondary: true },
  { id: 'geo', label: 'GEO', icon: IconGlobe, hasSecondary: true },
  { id: 'shop', label: "Shop Intel", icon: IconShop, hasSecondary: true },
  { id: 'connection', label: 'Connection', icon: IconConnection, hasSecondary: true },
];

/* ============================================
   PRIMARY SIDEBAR ICON
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
  <div className="flex flex-col items-center w-full select-none">
        <button
          type="button"
          onClick={onClick}
          title={label}
          className={`
        relative flex items-center justify-center
        w-10 h-10 rounded-xl sidebar-icon
        transition-all duration-200
        ${isActive ? 'active' : ''}
        ${isActive ? 'text-black dark:text-white' : 'text-muted-foreground hover:text-black dark:hover:text-[var(--alien-glow-green)]'}
      `}
        >
      <Icon className="w-5 h-5" />
    </button>
    <span className="mt-0.5 text-[10px] leading-none text-center text-muted-foreground">
      {label}
    </span>
  </div>
);

/* ============================================
   SECONDARY NAV ITEM
============================================ */
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
        flex items-center gap-2.5 px-3 py-2 rounded-lg
        text-sm transition-all duration-200 font-body
        ${isActive
          ? 'glass-button font-medium text-[var(--sibling-primary)]'
          : 'text-muted-foreground hover:text-[var(--sibling-primary)] hover:bg-[var(--glass-hover)]'
        }
      `}
    >
      {Icon && (
        <Icon
          className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[var(--sibling-primary)]' : ''}`}
        />
      )}
      <span className="flex-1 truncate">{label}</span>
    </Link>
  );
};

const SectionLabel = ({ label }: { label: string }) => (
  <div className="flex items-center justify-between px-3 pt-4 pb-1.5">
    <span className="text-[11px] font-semibold text-[var(--sibling-accent)] uppercase tracking-wider">
      {label}
    </span>
  </div>
);

/* ============================================
   SECONDARY SIDEBAR CONTENT
============================================ */
const SecondarySidebarContent = ({ activeSection }: { activeSection: string }) => {
  switch (activeSection) {
    case 'home':
      return (
        <>
          <SectionLabel label="Dashboard" />
          <SecondaryNavItem icon={IconLayoutDashboard} label="Overview" href="/" />
        </>
      );
    case 'ingestion':
      return (
        <>
          <SectionLabel label="Ingestion" />
          <SecondaryNavItem icon={IconUpload} label="Upload" href="/ingestion" />
          <SecondaryNavItem icon={IconHistory} label="History" href="/ingestion/history" />
        </>
      );
    case 'geo':
      return (
        <>
          <SectionLabel label="GEO" />
          {/* <SecondaryNavItem icon={IconRadar} label="Company Radar" href="/geo/radar" /> */}
          <SecondaryNavItem icon={IconKnight} label="GeoKnight" href="/geo/geoknight" />
          <SecondaryNavItem icon={IconTarget} label="Bounty" href="/geo/bounty" />
          <SecondaryNavItem icon={IconFileText} label="Generated Bounty Pages" href="/geo/bounty-pages" />
          {/* <SecondaryNavItem icon={IconGitBranch} label="Info Spread" href="/geo/info-spread" /> */}
          <SecondaryNavItem icon={IconDatabase} label="Data Mine" href="/geo/data-mine" />
        </>
      );
    case 'shop':
      return (
        <>
          <SectionLabel label="Shop Intel" />
          <SecondaryNavItem icon={IconLayoutDashboard} label="Products" href="/shop/products" />
        </>
      );
    case 'connection':
      return (
        <>
          <SectionLabel label="Connection" />
          <SecondaryNavItem icon={Store} label="MCP" href="/connection/mcp" />
          <SecondaryNavItem icon={SiOpenai} label="ACP" href="/connection/acp" />
          <SecondaryNavItem icon={SiGoogle} label="UCP" href="/connection/ucp" />
          <SecondaryNavItem icon={IconShop} label="Shopify" href="/connection/shopify" />
          <SecondaryNavItem icon={ShoppingBag} label="WooCommerce" href="/connection/woocommerce" />
          <SecondaryNavItem icon={Globe} label="WordPress" href="/connection/wordpress" />

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
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const [activeSection, setActiveSection] = useState('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { company, shopify } = useCurrentContext();

  const getFirstRoute = (sectionId: string) => {
    switch (sectionId) {
      case 'home':
        return '/';
      case 'ingestion':
        return '/ingestion';
      case 'geo':
        return '/geo/geoknight';
      case 'shop':
        return '/shop/products';
      case 'connection':
        return '/connection/mcp';
      default:
        return '/';
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
    if (pathname === '/') setActiveSection('home');
    else if (pathname?.startsWith('/ingestion')) setActiveSection('ingestion');
    else if (pathname?.startsWith('/geo')) setActiveSection('geo');
    else if (pathname?.startsWith('/shop')) setActiveSection('shop');
    else if (pathname?.startsWith('/connection')) setActiveSection('connection');
    else setActiveSection('home');
  }, [pathname]);

  const currentSection = MAIN_SECTIONS.find((s) => s.id === activeSection);
  const showSecondary = !sidebarCollapsed && currentSection?.hasSecondary;

  const secondaryNavTransition = {
    type: 'spring' as const,
    stiffness: 420,
    damping: 38,
    mass: 0.85,
  };

  return (
    <div className="flex h-screen sticky top-0 overflow-x-hidden">
      {/* Primary Sidebar */}
      <aside className="w-16 flex-shrink-0 glass-sidebar flex flex-col items-center py-4 z-20">
        <div className="mb-6">
          <div className="relative h-25 w-18 overflow-hidden rounded-xl ">
            <Image
              src="/Immortel_Logo_Dark.png"
              alt="Immortell"
              fill
              className="object-contain object-center"
              sizes="50px"
              priority
            />
          </div>
        </div>

        <div className="w-8 h-px bg-[var(--sidebar-glass-border)] mb-4" />

        <nav className="flex-1 flex flex-col items-center gap-2">
          {MAIN_SECTIONS.map((section) => (
            <PrimarySidebarIcon
              key={section.id}
              icon={section.icon}
              label={section.label}
              isActive={activeSection === section.id}
              onClick={() => handleSectionClick(section.id)}
            />
          ))}
        </nav>

        <div className="mt-auto pt-4 flex flex-col items-center gap-2">
          <DayNightLottieToggle
            labelId="sidebar-theme-toggle-label"
            className="w-16 h-12 rounded-xl sidebar-icon flex items-center justify-center text-muted-foreground hover:text-black dark:hover:text-[var(--alien-glow-green)] transition-colors"
          />
          <span
            id="sidebar-theme-toggle-label"
            className="inline-flex min-w-[3.25rem] items-center justify-center rounded-md border border-[var(--glass-border)] border-t-[var(--glass-border-top)]/90 bg-[var(--glass-bg)]/85 px-2 py-1 font-sans text-[12px] font-bold leading-none text-center text-muted-foreground shadow-[var(--glass-shadow)] backdrop-blur-[var(--glass-blur)] backdrop-saturate-[var(--glass-saturate)] [-webkit-backdrop-filter:blur(var(--glass-blur))_saturate(var(--glass-saturate))] dark:border-[var(--glass-border)] dark:border-t-white/15 dark:bg-[var(--glass)]/40 dark:text-neutral-100/95 dark:shadow-[0_4px_24px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)]"
          >
            {theme === 'dark' ? 'Dark' : 'Light'}
          </span>
          
          <Link
              href="/help"
              title="Quick Help"
              className="w-10 h-10 rounded-xl sidebar-icon flex items-center justify-center text-muted-foreground hover:text-black dark:hover:text-[var(--alien-glow-green)] transition-colors"
            >
              <IconHelp className="w-5 h-5" />
            </Link>
          <span className="text-[10px] leading-none text-center text-muted-foreground">Help</span>

          <button
            type="button"
            onClick={handleLogout}
            title="Log out"
            className="w-10 h-10 rounded-xl sidebar-icon flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <IconLogOut className="w-5 h-5" />
          </button>
          <span className="text-[10px] leading-none text-center text-muted-foreground">Log out</span>
        </div>
      </aside>

      {/* Secondary Sidebar */}
      <AnimatePresence initial={false}>
      {showSecondary && (
          <motion.aside
            key="secondary-sidebar"
          className="flex-shrink-0 glass-sidebar-secondary flex flex-col h-screen overflow-hidden w-56"
          style={{ minWidth: 224 }}
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={secondaryNavTransition}
        >
          <div className="p-4 nav-section-header flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              {currentSection?.label ?? 'Navigation'}
            </h2>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(true)}
              className={`
                group/collapse flex h-9 w-9 shrink-0 items-center justify-center rounded-lg
                border border-[color-mix(in_srgb,var(--alien-core-green)_42%,var(--glass-border))]
                bg-[color-mix(in_srgb,var(--alien-glow-green)_16%,var(--glass-hover))]
                text-black
                shadow-[inset_0_1px_0_color-mix(in_srgb,white_55%,transparent),0_1px_3px_rgba(21,29,53,0.08),0_0_14px_-4px_color-mix(in_srgb,var(--alien-glow-green)_45%,transparent)]
                ring-1 ring-[color-mix(in_srgb,var(--alien-glow-green)_28%,transparent)]
                backdrop-blur-sm transition-all duration-200
                hover:border-[color-mix(in_srgb,var(--alien-glow-green)_58%,var(--glass-border))]
                hover:bg-[color-mix(in_srgb,var(--alien-glow-green)_26%,var(--glass-hover))]
                hover:text-black
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
                dark:hover:text-white
                dark:hover:shadow-[inset_0_1px_0_oklch(0.38_0.025_160_/_0.4),0_0_28px_-2px_color-mix(in_srgb,var(--alien-glow-green)_45%,transparent)]
              `}
              title="Collapse sidebar"
            >
              <IconChevronLeft className="h-5 w-5 transition-transform duration-200 group-hover/collapse:-translate-x-px" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-2 py-2 glass-scrollbar">
            <SecondarySidebarContent activeSection={activeSection} />
          </nav>

            <div className="space-y-3 border-t border-[var(--sidebar-secondary-glass-border)] bg-[var(--glass-hover)]/40 p-3">
            {company && (
              <div className="text-xs text-muted-foreground">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="font-semibold text-foreground truncate">
                    {company.name}
                  </div>
                    <span className="rounded-full bg-[color-mix(in_srgb,var(--sibling-primary)_14%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--sibling-primary)]">
                    Workspace
                  </span>
                </div>
                <div className="truncate text-[11px] text-muted-foreground/90">
                  {company.email}
                </div>
                <div className="mt-2 text-[11px]">
                  <div className="flex items-center justify-between gap-2 rounded-md py-1.5 px-1 -mx-1 hover:bg-[var(--glass-hover)] transition-colors">
                    <Link
                      href="/connection/shopify"
                      prefetch={false}
                      className="flex min-w-0 shrink items-center gap-1.5 font-semibold text-primary"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/80" />
                      <span>Shopify</span>
                    </Link>
                    {shopify ? (
                      <span
                        className="max-w-[7rem] truncate text-right font-mono text-[10px] text-emerald-400/90"
                        title={shopify.shopDomain}
                      >
                        {shopify.shopDomain}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => router.push('/connection/shopify')}
                          className="shrink-0 rounded-md border border-[var(--glass-border)] bg-background/80 px-2 py-0.5 text-[10px] font-semibold text-foreground shadow-sm transition-colors hover:border-[color-mix(in_srgb,var(--sibling-primary)_35%,var(--glass-border))] hover:bg-[var(--glass-hover)] hover:text-[var(--sibling-primary)]"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <button
              type="button"
              onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-[var(--glass-hover)] hover:text-[var(--sibling-primary)] transition-colors font-body"
            >
              <IconLogOut className="w-4 h-4 flex-shrink-0" />
              <span>Log out</span>
            </button>
          </div>
          </motion.aside>
      )}
      </AnimatePresence>

      {/* Collapsed secondary: expand button */}
      {sidebarCollapsed && currentSection?.hasSecondary && (
        <button
          type="button"
          onClick={() => setSidebarCollapsed(false)}
          className="group fixed left-16 top-1/2 z-10 -translate-y-1/2 rounded-r-lg border border-l-0 border-[var(--glass-border)] bg-[var(--glass-bg)]/90 p-2 text-muted-foreground shadow-lg backdrop-blur-md transition-colors hover:bg-[var(--glass-hover)] hover:text-[var(--sibling-primary)]"
          title="Expand sidebar"
        >
          <IconChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-[var(--sibling-primary)]" />
        </button>
      )}
    </div>
  );
}
