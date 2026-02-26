'use client';

import React, { useState } from 'react';

const PIXEL = 2;

export type PixelatedButtonVariant = 'approve' | 'reject' | 'viewMore';

type PixelatedButtonProps = {
  variant: PixelatedButtonVariant;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  type?: 'button' | 'submit';
  className?: string;
  title?: string;
  as?: 'button' | 'a';
  href?: string;
};

const variantStyles: Record<
  PixelatedButtonVariant,
  {
    bg: string;
    border: string;
    shadow: string;
    hoverBg: string;
    activeShadow: string;
    text: string;        // dark at rest
    hoverText: string;   // deeper/saturated on hover
    hoverBorder: string; // border sharpens on hover
  }
> = {
  approve: {
    bg: 'rgba(134, 239, 172, 0.06)',
    border: 'rgba(134, 239, 172, 0.22)',
    hoverBorder: 'rgba(22, 163, 74, 0.55)',     // green-600
    shadow: 'rgba(74, 222, 128, 0.10)',
    hoverBg: 'rgba(134, 239, 172, 0.11)',
    activeShadow: 'rgba(34, 197, 94, 0.16)',
    text: '#166534',        // green-800 — dark & crisp at rest
    hoverText: '#14532d',   // green-900 — deepens on hover
  },
  reject: {
    bg: 'rgba(252, 165, 165, 0.06)',
    border: 'rgba(252, 165, 165, 0.22)',
    hoverBorder: 'rgba(220, 38, 38, 0.55)',     // red-600
    shadow: 'rgba(248, 113, 113, 0.10)',
    hoverBg: 'rgba(252, 165, 165, 0.11)',
    activeShadow: 'rgba(239, 68, 68, 0.16)',
    text: '#991b1b',        // red-800
    hoverText: '#7f1d1d',   // red-900
  },
  viewMore: {
    bg: 'rgba(196, 181, 253, 0.06)',
    border: 'rgba(196, 181, 253, 0.22)',
    hoverBorder: 'rgba(124, 58, 237, 0.55)',    // violet-600
    shadow: 'rgba(167, 139, 250, 0.10)',
    hoverBg: 'rgba(196, 181, 253, 0.11)',
    activeShadow: 'rgba(139, 92, 246, 0.16)',
    text: '#4c1d95',        // violet-900 — dark indigo at rest
    hoverText: '#3b0764',   // even deeper on hover
  },
};

export function PixelatedButton({
  variant,
  children,
  onClick,
  type = 'button',
  className = '',
  title,
  as = 'button',
  href,
}: PixelatedButtonProps) {
  const [pressed, setPressed] = useState(false);
  const [hover, setHover] = useState(false);
  const style = variantStyles[variant];

  const shadowOffset = pressed ? 1 : PIXEL;
  const translateY = pressed ? PIXEL - 1 : 0;

  const buttonStyle: React.CSSProperties = {
    backgroundColor: hover ? style.hoverBg : style.bg,
    border: `1px solid ${hover ? style.hoverBorder : style.border}`,
    boxShadow: `${shadowOffset}px ${shadowOffset}px 0 0 ${
      pressed ? style.activeShadow : style.shadow
    }`,
    color: hover ? style.hoverText : style.text,
    transform: `translate(0, ${translateY}px)`,
    transition: 'background-color 0.2s, color 0.15s, border-color 0.2s, box-shadow 0.1s, transform 0.1s',
    borderRadius: 0,
  };

  const shared = {
    className: `inline-flex items-center justify-center min-w-[28px] h-7 px-1.5 select-none ${className}`.trim(),
    style: buttonStyle,
    title,
    onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPressed(false);
    },
    onMouseDown: () => setPressed(true),
    onMouseUp: () => setPressed(false),
  };

  if (as === 'a' && href) {
    return <a href={href} {...shared}>{children}</a>;
  }

  return (
    <button type={type} {...shared}>
      {children}
    </button>
  );
}
