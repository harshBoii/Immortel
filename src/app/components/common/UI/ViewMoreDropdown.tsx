'use client';

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Tooltip } from '../Tooltip';
import { PixelatedButton } from './Buttons';

const IconMore = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export type ViewMoreDropdownProps = {
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  tooltipContent?: string;
  className?: string;
  align?: 'right' | 'left';
};

export function ViewMoreDropdown({
  children,
  tooltipContent = 'More options',
  className = '',
  align = 'right',
}: ViewMoreDropdownProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    const el = containerRef.current;
    if (!el || typeof document === 'undefined') return;
    const rect = el.getBoundingClientRect();
    const menuWidth = 160;
    setPosition({
      top: rect.bottom + 4,
      left: align === 'right' ? rect.right - menuWidth : rect.left,
    });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const handleResize = () => updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [open, align]);

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      const container = containerRef.current;
      const menu = ref.current;
      if (
        container && !container.contains(e.target as Node) &&
        menu && !menu.contains(e.target as Node)
      ) {
        setOpen(false);
        setPosition(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const trigger = (
    <PixelatedButton
      variant="viewMore"
      onClick={(e) => {
        e.stopPropagation();
        setOpen((o) => !o);
      }}
    >
      <IconMore />
    </PixelatedButton>
  );

  const close = () => {
    setOpen(false);
    setPosition(null);
  };
  const menuContent = typeof children === 'function' ? children(close) : children;

  const menuStyle: React.CSSProperties = {
    top: position?.top ?? 0,
    left: position?.left ?? 0,
    backgroundColor: 'rgba(219, 234, 254, 0.08)',
    border: '1px solid rgba(147, 197, 253, 0.25)',
    boxShadow: '2px 2px 0 0 rgba(59, 130, 246, 0.10), 0 4px 20px rgba(37, 99, 235, 0.08)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '6px',
  };

  const menuEl = open && typeof document !== 'undefined' && position && (
    <div
      ref={ref}
      className="fixed min-w-[160px] py-1 z-[9999]"
      style={menuStyle}
      role="menu"
    >
      {menuContent}
    </div>
  );

  return (
    <>
      <div ref={containerRef} className={`relative ${className}`.trim()}>
        {tooltipContent ? (
          <Tooltip content={tooltipContent}>{trigger}</Tooltip>
        ) : (
          trigger
        )}
      </div>
      {menuEl && createPortal(menuEl, document.body)}
    </>
  );
}
