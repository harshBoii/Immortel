"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SelectDropdownOption = {
  value: string;
  label: string;
  subtitle?: string;
};

export function SelectDropdown({
  value,
  options,
  onChange,
  disabled = false,
  align = "left",
  className = "",
}: {
  value: string;
  options: SelectDropdownOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(
    null
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? options[0],
    [options, value]
  );

  const triggerCls =
    "w-full rounded-md border border-[var(--glass-border)] bg-[var(--glass)]/60 px-2.5 py-1.5 text-left text-[13px] focus:outline-none focus:ring-1 focus:ring-[var(--sibling-primary)]/40";

  const updatePosition = () => {
    const el = containerRef.current;
    if (!el || typeof document === "undefined") return;
    const rect = el.getBoundingClientRect();
    const width = rect.width;
    const left = align === "right" ? rect.right - width : rect.left;
    setPosition({ top: rect.bottom + 4, left, width });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const handleResize = () => updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [open, align]);

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      const container = containerRef.current;
      const menu = menuRef.current;
      if (
        container &&
        !container.contains(e.target as Node) &&
        menu &&
        !menu.contains(e.target as Node)
      ) {
        setOpen(false);
        setPosition(null);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  useEffect(() => {
    if (disabled && open) {
      setOpen(false);
      setPosition(null);
    }
  }, [disabled, open]);

  if (disabled) {
    return (
      <div className={`${triggerCls} opacity-50 ${className}`.trim()}>
        {selected?.label ?? value}
      </div>
    );
  }

  const menuStyle: React.CSSProperties = {
    top: position?.top ?? 0,
    left: position?.left ?? 0,
    width: position?.width ?? undefined,
    backgroundColor: "rgba(219, 234, 254, 0.08)",
    border: "1px solid rgba(147, 197, 253, 0.25)",
    boxShadow:
      "2px 2px 0 0 rgba(59, 130, 246, 0.10), 0 4px 20px rgba(37, 99, 235, 0.08)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    borderRadius: "6px",
  };

  const menuEl = open && typeof document !== "undefined" && position && (
    <div
      ref={menuRef}
      className="fixed z-[9999] py-1"
      style={menuStyle}
      role="menu"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => {
              onChange(o.value);
              setOpen(false);
              setPosition(null);
            }}
            className={`w-full px-3 py-2 text-left text-[12px] transition-colors ${
              active
                ? "bg-[var(--glass-hover)] text-foreground"
                : "text-muted-foreground hover:bg-[var(--glass-hover)] hover:text-foreground"
            }`}
            role="menuitem"
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold">{o.label}</span>
              {o.subtitle && (
                <span className="text-[11px] text-muted-foreground/70">
                  {o.subtitle}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      <div ref={containerRef} className={`relative w-full ${className}`.trim()}>
        <button
          type="button"
          className={triggerCls}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate">{selected?.label ?? value}</span>
            <span className="text-muted-foreground/70">▾</span>
          </span>
        </button>
      </div>
      {menuEl && createPortal(menuEl, document.body)}
    </>
  );
}

