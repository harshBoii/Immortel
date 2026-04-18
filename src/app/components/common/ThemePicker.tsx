'use client';

import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Square, CloudMoon, Contrast, Feather } from 'lucide-react';
import { useTheme, type Theme } from './ThemeProvider';

type Option = { id: Theme; label: string; Icon: typeof Sun };

const OPTIONS: Option[] = [
  { id: 'light', label: 'Lumen', Icon: Sun },
  { id: 'dark', label: 'Techno', Icon: Moon },
  { id: 'minimal', label: 'Vector', Icon: Square },
  { id: 'midnight', label: 'Midnight', Icon: CloudMoon },
  { id: 'monochrome', label: 'Monochrome', Icon: Contrast },
  { id: 'paper', label: 'Paper', Icon: Feather },
];

export function ThemePicker({
  className,
  orientation = 'vertical',
}: {
  className?: string;
  orientation?: 'vertical' | 'horizontal';
}) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = OPTIONS.find((o) => o.id === theme) ?? OPTIONS[0];
  const CurrentIcon = current.Icon;

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  };

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => () => cancelClose(), []);

  const flyoutPosition =
    orientation === 'vertical'
      ? 'left-full top-1/2 -translate-y-1/2 ml-2'
      : 'top-full left-1/2 -translate-x-1/2 mt-2';

  const flyoutLayout = orientation === 'vertical' ? 'flex-col' : 'flex-row';

  return (
    <div
      ref={containerRef}
      className={['relative inline-block', className ?? ''].join(' ')}
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
      onFocus={() => {
        cancelClose();
        setOpen(true);
      }}
      onBlur={(e) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
          scheduleClose();
        }
      }}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Theme: ${current.label}`}
        title={`Theme: ${current.label}`}
        onClick={() => setOpen((v) => !v)}
        className={[
          'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
          'border border-[var(--glass-border)] bg-[var(--glass-hover)]',
          'text-foreground hover:bg-[var(--glass-active)]',
        ].join(' ')}
      >
        <CurrentIcon className="w-[18px] h-[18px]" />
      </button>

      <div
        role="menu"
        aria-label="Choose theme"
        className={[
          'absolute z-50',
          flyoutPosition,
          'transition-all duration-150 ease-out',
          open
            ? 'opacity-100 translate-x-0 pointer-events-auto'
            : 'opacity-0 pointer-events-none',
          orientation === 'vertical'
            ? open
              ? 'translate-x-0'
              : '-translate-x-1'
            : open
              ? 'translate-y-0'
              : '-translate-y-1',
        ].join(' ')}
      >
        <div
          className={[
            'flex gap-1 p-1.5 rounded-xl',
            'bg-[var(--popover)] text-[var(--popover-foreground)]',
            'border border-[var(--glass-border)] shadow-[var(--glass-shadow-lg)]',
            'backdrop-blur-[var(--glass-blur)]',
            flyoutLayout,
          ].join(' ')}
        >
          {OPTIONS.map(({ id, label, Icon }) => {
            const active = theme === id;
            return (
              <button
                key={id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                aria-label={label}
                title={label}
                onClick={() => {
                  setTheme(id);
                  setOpen(false);
                }}
                className={[
                  'flex items-center gap-2 h-8 px-2.5 rounded-lg transition-colors',
                  orientation === 'vertical' ? 'justify-start' : 'justify-center',
                  active
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                    : 'text-muted-foreground hover:bg-[var(--glass-active)] hover:text-foreground',
                ].join(' ')}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-xs font-medium whitespace-nowrap">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
