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
  { bg: string; border: string; shadow: string; hoverBg: string; activeShadow: string; text: string }
> = {
  approve: {
    bg: '#7DD3A0',
    border: '#5BB882',
    shadow: '#4A9A6B',
    hoverBg: '#8FDEB0',
    activeShadow: '#3D8A5C',
    text: '#1a472a',
  },
  reject: {
    bg: '#E87A7A',
    border: '#D45C5C',
    shadow: '#B84A4A',
    hoverBg: '#F08E8E',
    activeShadow: '#9E3D3D',
    text: '#fff',
  },
  viewMore: {
    bg: '#FF2D92',
    border: '#E91E8C',
    shadow: '#C41A75',
    hoverBg: '#FF5AA8',
    activeShadow: '#A0155E',
    text: '#fff',
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

  const bg = pressed ? style.bg : hover ? style.hoverBg : style.bg;
  const shadowOffset = pressed ? 1 : PIXEL;
  const translateY = pressed ? PIXEL - 1 : 0;

  const buttonStyle: React.CSSProperties = {
    backgroundColor: bg,
    boxShadow: `${shadowOffset}px ${shadowOffset}px 0 0 ${pressed ? style.activeShadow : style.shadow}`,
    color: style.text,
    transform: `translate(0, ${translateY}px)`,
    transition: 'background-color 0.15s, box-shadow 0.1s, transform 0.1s',
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
