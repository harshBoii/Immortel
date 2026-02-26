'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

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

/* ============================================
   SECTIONS CONFIG
============================================ */
const MAIN_SECTIONS = [
  { id: 'home', label: 'Home', icon: IconHome, hasSecondary: true },
  { id: 'ingestion', label: 'Ingestion', icon: IconIngestion, hasSecondary: true },
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
        w-10 h-10 rounded-xl
        transition-all duration-200
        ${isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:text-foreground'
        }
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
      {Icon && <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-primary' : ''}`} />}
      <span className="flex-1 truncate">{label}</span>
    </Link>
  );
};

const SectionLabel = ({ label }: { label: string }) => (
  <div className="flex items-center justify-between px-3 pt-4 pb-1.5">
    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
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
  const [activeSection, setActiveSection] = useState('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const getFirstRoute = (sectionId: string) => {
    switch (sectionId) {
      case 'home':
        return '/';
      case 'ingestion':
        return '/ingestion';
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
    else setActiveSection('home');
  }, [pathname]);

  const currentSection = MAIN_SECTIONS.find((s) => s.id === activeSection);
  const showSecondary = !sidebarCollapsed && currentSection?.hasSecondary;

  return (
    <div className="flex h-screen sticky top-0">
      {/* Primary Sidebar */}
      <aside className="w-16 flex-shrink-0 glass-sidebar flex flex-col items-center py-4 z-20">
        <div className="mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold text-sm shadow-lg">
            I
          </div>
        </div>

        <div className="w-8 h-px bg-[var(--glass-border)] mb-4" />

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
            onClick={handleLogout}
            title="Log out"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-[var(--glass-hover)] transition-colors"
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
          <div className="p-4 border-b border-[var(--glass-border)] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              {currentSection?.label ?? 'Navigation'}
            </h2>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(true)}
              className="p-1 rounded hover:bg-[var(--glass-hover)] text-muted-foreground hover:text-foreground transition-colors"
              title="Collapse sidebar"
            >
              <IconChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-2 py-2 glass-scrollbar">
            <SecondarySidebarContent activeSection={activeSection} />
          </nav>

          <div className="p-3 border-t border-[var(--glass-border)]">
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
