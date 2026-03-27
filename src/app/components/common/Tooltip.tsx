'use client';

import React, { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

type TooltipProps = {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
};

export function Tooltip({ children, content, side = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [positioned, setPositioned] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!visible || !triggerRef.current) {
      setPositioned(false);
      return;
    }
    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const offset = 8;
      switch (side) {
        case 'top':
          setCoords({ top: rect.top - offset, left: rect.left + rect.width / 2 });
          break;
        case 'bottom':
          setCoords({ top: rect.bottom + offset, left: rect.left + rect.width / 2 });
          break;
        case 'left':
          setCoords({ top: rect.top + rect.height / 2, left: rect.left - offset });
          break;
        case 'right':
          setCoords({ top: rect.top + rect.height / 2, left: rect.right + offset });
          break;
      }
    };
    updatePosition();
    setPositioned(true);
  }, [visible, side]);

  const transform =
    side === 'top'
      ? 'translate(-50%, -100%)'
      : side === 'bottom'
        ? 'translate(-50%, 0)'
        : side === 'left'
          ? 'translate(-100%, -50%)'
          : 'translate(0, -50%)';

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible &&
        positioned &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed z-[99999] pointer-events-none max-w-[min(20rem,calc(100vw-1.5rem))] rounded-lg border border-[var(--glass-border)] bg-[var(--glass)]/95 px-3 py-2 text-xs text-foreground shadow-lg backdrop-blur-md"
            style={{ top: coords.top, left: coords.left, transform }}
            role="tooltip"
          >
            {content}
          </div>,
          document.body
        )}
    </div>
  );
}
