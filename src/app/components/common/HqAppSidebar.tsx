"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { IconGlobe } from "./hq-sidebar-icons";
import { useCurrentContext } from "./useCurrentContext";

const secondaryNavTransition = {
  type: "spring" as const,
  stiffness: 420,
  damping: 38,
  mass: 0.85,
};

const IconLogOut = ({ className }: { className?: string }) => (
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
    aria-hidden
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </svg>
);

export default function HqAppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  /** Company list panel: open by default on HQ. */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const {
    company,
    hqEligible,
    organizationName,
    organizationCompanies,
    refetch,
  } = useCurrentContext();

  const switchTenant = async (targetId: string) => {
    if (!company || targetId === company.id) return;
    const res = await fetch("/api/auth/switch-company", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ companyId: targetId }),
    });
    if (!res.ok) return;
    refetch();
    router.push("/");
    router.refresh();
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
      router.push("/login");
    }
  };

  const showSecondary =
    !sidebarCollapsed &&
    hqEligible &&
    organizationCompanies &&
    organizationCompanies.length > 0;

  return (
    <div className="flex h-screen sticky top-0 overflow-x-hidden">
      <aside className="w-16 flex-shrink-0 glass-sidebar flex flex-col items-center py-4 z-20">
        <div className="mb-6">
          <Link
            href="/hq"
            className="relative block h-25 w-18 overflow-hidden rounded-xl"
            title="Headquarters dashboard"
          >
            <Image
              src="/Immortel_Logo_Dark.png"
              alt="Immortell"
              fill
              className="object-contain object-center"
              sizes="50px"
              priority
            />
          </Link>
        </div>

        <div className="w-8 h-px bg-[var(--sidebar-glass-border)] mb-4" />

        <nav className="flex-1 flex flex-col items-center gap-2">
          <div className="flex flex-col items-center w-full select-none">
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              title="Companies in your organization"
              className={`
                relative flex items-center justify-center w-10 h-10 rounded-xl sidebar-icon transition-all duration-200
                ${
                  !sidebarCollapsed
                    ? "active text-black dark:text-white"
                    : "text-muted-foreground hover:text-black dark:hover:text-[var(--alien-glow-green)]"
                }
              `}
            >
              <IconGlobe className="w-5 h-5" />
            </button>
            <span className="mt-0.5 text-[10px] leading-none text-center text-muted-foreground">
              Company
            </span>
          </div>
        </nav>

        <div className="mt-auto pt-4 flex flex-col items-center gap-2">
          <Link
            href="/help"
            title="Help"
            className="w-10 h-10 rounded-xl sidebar-icon flex items-center justify-center text-muted-foreground hover:text-[var(--alien-glow-green)]"
          >
            <span className="text-xs font-semibold">?</span>
          </Link>

          <button
            type="button"
            onClick={() => void handleLogout()}
            title="Log out"
            className="w-10 h-10 rounded-xl sidebar-icon flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <IconLogOut className="w-5 h-5" />
          </button>
          <span className="text-[10px] leading-none text-center text-muted-foreground">Log out</span>
        </div>
      </aside>

      <AnimatePresence initial={false}>
        {showSecondary && (
          <motion.aside
            key="hq-secondary"
            className="flex-shrink-0 glass-sidebar-secondary flex flex-col h-screen overflow-hidden w-56"
            style={{ minWidth: 224 }}
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={secondaryNavTransition}
          >
            <div className="p-4 nav-section-header flex items-center justify-between border-b border-[var(--sidebar-secondary-glass-border)]">
              <h2 className="text-sm font-semibold text-foreground truncate">
                {organizationName ?? "Organization"}
              </h2>
              <button
                type="button"
                onClick={() => setSidebarCollapsed(true)}
                className="shrink-0 rounded-lg border border-[var(--glass-border)] px-2 py-1 text-[10px] text-muted-foreground hover:bg-[var(--glass-hover)]"
                title="Collapse"
              >
                ←
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 py-3 glass-scrollbar">
              <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--sibling-accent)]">
                Companies
              </p>
              <Link
                href="/hq"
                className={`mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  pathname === "/hq"
                    ? "glass-button font-medium text-[var(--sibling-primary)]"
                    : "text-muted-foreground hover:bg-[var(--glass-hover)]"
                }`}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/80" />
                Headquarters view
              </Link>
              {organizationCompanies.map((c) => {
                const active = company?.id === c.id;
                const rowClass = `mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  active
                    ? "glass-button font-medium text-[var(--sibling-primary)]"
                    : "text-muted-foreground hover:bg-[var(--glass-hover)] hover:text-foreground"
                }`;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => void switchTenant(c.id)}
                    className={rowClass}
                    title="Open workspace as this company"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/80" />
                    <span className="truncate">
                      {c.name}
                      {c.isOrg ? " · HQ" : ""}
                    </span>
                  </button>
                );
              })}
            </nav>
          </motion.aside>
        )}
      </AnimatePresence>

      {sidebarCollapsed && (
        <button
          type="button"
          onClick={() => setSidebarCollapsed(false)}
          className="group fixed left-16 top-1/2 z-10 -translate-y-1/2 rounded-r-lg border border-l-0 border-[var(--glass-border)] bg-[var(--glass-bg)]/90 p-2 text-muted-foreground shadow-lg backdrop-blur-md"
          title="Expand Company panel"
        >
          →
        </button>
      )}
    </div>
  );
}
