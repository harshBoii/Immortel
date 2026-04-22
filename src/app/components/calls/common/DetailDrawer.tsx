'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export type DetailDrawerProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClass?: string;
};

export function DetailDrawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  widthClass = 'w-full sm:w-[480px]',
}: DetailDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="flex-1 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`ml-auto flex h-full flex-col border-l border-[var(--glass-border)] bg-[var(--background)] ${widthClass} shadow-2xl`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-[var(--glass-border)] px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-lg font-semibold text-foreground leading-tight truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-[12px] text-muted-foreground/70 truncate">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--glass-border)] text-muted-foreground hover:text-foreground hover:bg-[var(--glass-hover)] transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <footer className="border-t border-[var(--glass-border)] bg-[var(--glass)]/40 px-5 py-3">
            {footer}
          </footer>
        )}
      </aside>
    </div>
  );
}
