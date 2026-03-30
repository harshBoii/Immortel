'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { AnimationItem } from 'lottie-web';
import animationData from './day-night-toggle.json';
import { useTheme } from '../../common/ThemeProvider';


const SUN_FRAME = 50;        // swapped
const MOON_FRAME = 0;        // swapped
const SUN_BACK_START = 0;    // swapped
const END_FRAME = 50;        // swapped

function syncFrame(anim: AnimationItem, isDark: boolean) {
  if (isDark) {
    anim.goToAndStop(MOON_FRAME, true); // now 0
  } else {
    anim.goToAndStop(SUN_FRAME, true); // now 50
  }
}
export function DayNightLottieToggle({
  className,
  labelId,
}: {
  className?: string;
  labelId?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimationItem | null>(null);
  const isAnimatingRef = useRef(false);

  const { theme, toggleTheme } = useTheme();
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    let cancelled = false;

    void import('lottie-web').then((lottie) => {
      if (cancelled || !containerRef.current) return;

      const anim = lottie.default.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: false,
        autoplay: false,
        animationData,
      });

      anim.setSubframe(false); // stability fix
      animRef.current = anim;

      // 🔥 IMPORTANT: do NOT sync here (causes snapping bug)
      anim.addEventListener('complete', () => {
        isAnimatingRef.current = false;
        anim.pause(); // freeze exactly where it ended
      });

      // initial position
      syncFrame(anim, themeRef.current === 'dark');
    });

    return () => {
      cancelled = true;
      const anim = animRef.current;
      if (anim) {
        anim.destroy();
        animRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const anim = animRef.current;
    if (!anim) return;

    if (isAnimatingRef.current) return;

    syncFrame(anim, theme === 'dark');
  }, [theme]);

  const handleClick = useCallback(() => {
    const anim = animRef.current;
    if (!anim || isAnimatingRef.current) return;
  
    const goingDark = theme === 'light';
  
    isAnimatingRef.current = true;
  
    anim.stop();
  
    if (goingDark) {
      // now reversed
      anim.playSegments([50, 0], true);
    } else {
      anim.playSegments([0, 50], true);
    }
  
    toggleTheme();
  }, [theme, toggleTheme]);
  return (
    <button
      type="button"
      onClick={handleClick}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-labelledby={labelId}
      className={className}
    >
      <div
        ref={containerRef}
        className="h-16 w-16 [&_svg]:!block"
        aria-hidden
      />
    </button>
  );
}