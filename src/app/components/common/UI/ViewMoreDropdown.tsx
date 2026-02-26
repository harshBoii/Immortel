'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Tooltip } from '../Tooltip';
import { PixelatedButton } from './Buttons';

const IconMore = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5"  cy="12" r="1" />
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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

  const close = () => setOpen(false);
  const menuContent = typeof children === 'function' ? children(close) : children;

  return (
    <div ref={ref} className={`relative ${className}`.trim()}>
      {tooltipContent ? (
        <Tooltip content={tooltipContent}>{trigger}</Tooltip>
      ) : (
        trigger
      )}
      {open && (
        <div
          className={`absolute top-full mt-1 min-w-[160px] py-1 z-[100] ${
            align === 'left' ? 'left-0' : 'right-0'
          }`}
          style={{
            backgroundColor: 'rgba(219, 234, 254, 0.08)',   // blue-100 tint
            border: '1px solid rgba(147, 197, 253, 0.25)',   // blue-300
            boxShadow: `
              2px 2px 0 0 rgba(59, 130, 246, 0.10),
              0 4px 20px rgba(37, 99, 235, 0.08)
            `,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderRadius: '6px',
          }}
          role="menu"
        >
          {menuContent}
        </div>
      )}
    </div>
  );
}
