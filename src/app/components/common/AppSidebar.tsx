'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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

const IconTarget = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const IconSun = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
  </svg>
);

const IconMoon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

const IconShop = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l1-5h16l1 5" />
    <path d="M5 9l1 11h12l1-11" />
    <path d="M9 13h6" />
  </svg>
);

/* ============================================
   SECTIONS CONFIG
============================================ */
const MAIN_SECTIONS = [
  { id: 'home', label: 'Home', icon: IconHome, hasSecondary: true },
  { id: 'ingestion', label: 'Ingestion', icon: IconIngestion, hasSecondary: true },
  { id: 'geo', label: 'GEO', icon: IconGlobe, hasSecondary: true },
  { id: 'shop', label: "Shop Intel", icon: IconShop, hasSecondary: true },
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
        ${isActive ? 'text-[var(--sibling-primary)]' : 'text-muted-foreground hover:text-foreground'}
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
          ? 'glass-button text-foreground font-medium'
          : 'text-muted-foreground hover:text-foreground hover:bg-[var(--glass-hover)]'
        }
      `}
    >
      {Icon && <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[var(--sibling-primary)]' : ''}`} />}
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
          <SecondaryNavItem icon={IconLayoutDashboard} label="Data Mine" href="/geo/data-mine" />
          <SecondaryNavItem icon={IconLayoutDashboard} label="Info Spread" href="/geo/info-spread" />
          <SecondaryNavItem icon={IconRadar} label="Company Radar" href="/geo/radar" />
          <SecondaryNavItem icon={IconTarget} label="Bounty" href="/geo/bounty" />
          <SecondaryNavItem icon={IconTarget} label="Generated Bounty Pages" href="/geo/bounty-pages" />
        </>
      );
    case 'shop':
      return (
        <>
          <SectionLabel label="Shop Intel" />
          <SecondaryNavItem icon={IconLayoutDashboard} label="Products" href="/shop/products" />
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
  const { theme, toggleTheme } = useTheme();
  const [activeSection, setActiveSection] = useState('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
   const { company, shopify, refetch } = useCurrentContext();
  const [disconnecting, setDisconnecting] = useState(false);

  const handleDisconnectShopify = async () => {
    if (!confirm('Disconnect your Shopify store? You can reconnect later.')) return;
    setDisconnecting(true);
    try {
      const res = await fetch('/shopify/disconnect', { method: 'POST', credentials: 'include' });
      if (res.ok) {
        refetch();
      } else {
        console.error('Disconnect failed');
      }
    } catch (err) {
      console.error('Disconnect error:', err);
    } finally {
      setDisconnecting(false);
    }
  };

  const getFirstRoute = (sectionId: string) => {
    switch (sectionId) {
      case 'home':
        return '/';
      case 'ingestion':
        return '/ingestion';
      case 'geo':
        return '/geo/data-mine';
      case 'shop':
        return '/shop/products';
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
    else setActiveSection('home');
  }, [pathname]);

  const currentSection = MAIN_SECTIONS.find((s) => s.id === activeSection);
  const showSecondary = !sidebarCollapsed && currentSection?.hasSecondary;

  return (
    <div className="flex h-screen sticky top-0">
      {/* Primary Sidebar */}
      <aside className="w-16 flex-shrink-0 glass-sidebar flex flex-col items-center py-4 z-20">
        <div className="mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--sibling-primary)] to-[var(--sibling-primary-dark)] flex items-center justify-center text-primary-foreground font-bold text-sm shadow-lg">
            I
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
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-10 h-10 rounded-xl sidebar-icon flex items-center justify-center text-muted-foreground hover:text-[var(--sibling-primary)] transition-colors"
          >
            {theme === 'dark' ? <IconSun className="w-5 h-5" /> : <IconMoon className="w-5 h-5" />}
          </button>
          <span className="text-[10px] leading-none text-center text-muted-foreground">
            {theme === 'dark' ? 'Light' : 'Dark'}
          </span>
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
      {showSecondary && (
        <aside
          className="flex-shrink-0 glass-sidebar-secondary flex flex-col h-screen overflow-hidden w-56"
          style={{ minWidth: 224 }}
        >
          <div className="p-4 nav-section-header flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              {currentSection?.label ?? 'Navigation'}
            </h2>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(true)}
              className="p-1 rounded hover:bg-[var(--glass-hover)] text-muted-foreground hover:text-[var(--sibling-primary)] transition-colors"
              title="Collapse sidebar"
            >
              <IconChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-2 py-2 glass-scrollbar">
            <SecondarySidebarContent activeSection={activeSection} />
          </nav>

          <div className="p-3 border-t border-[var(--sidebar-secondary-glass-border)] space-y-3 bg-[var(--glass-hover)]/40">
            {company && (
              <div className="text-xs text-muted-foreground">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="font-semibold text-foreground truncate">
                    {company.name}
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--sibling-primary)]/15 text-[var(--sibling-primary)]">
                    Workspace
                  </span>
                </div>
                <div className="truncate text-[11px] text-muted-foreground/90">
                  {company.email}
                </div>
                <div className="mt-2 text-[11px]">
                  {shopify ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-emerald-400">
                          Shopify
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] font-medium truncate">
                          {shopify.shopDomain}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleDisconnectShopify}
                        disabled={disconnecting}
                        className="w-full text-[10px] font-medium text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-md py-1 transition-colors disabled:opacity-50"
                      >
                        {disconnecting ? 'Disconnecting…' : 'Disconnect store'}
                      </button>
                    </div>
                  ) : (
                    <Link
                      href="/connect-shopify"
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      <span>Connect Shopify store</span>
                    </Link>
                  )}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-[var(--glass-hover)] transition-colors font-body"
            >
              <IconLogOut className="w-4 h-4 flex-shrink-0" />
              <span>Log out</span>
            </button>
          </div>
        </aside>
      )}

      {/* Collapsed secondary: expand button */}
      {sidebarCollapsed && currentSection?.hasSecondary && (
        <button
          type="button"
          onClick={() => setSidebarCollapsed(false)}
          className="fixed left-16 top-1/2 -translate-y-1/2 p-2 glass-card rounded-r-lg shadow-lg z-10 hover:bg-[var(--glass-hover)] transition-colors"
          title="Expand sidebar"
        >
          <IconChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
