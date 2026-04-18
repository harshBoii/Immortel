'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme =
  | 'light'
  | 'dark'
  | 'minimal'
  | 'midnight'
  | 'monochrome'
  | 'paper';

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
} | null>(null);

const STORAGE_KEY = 'theme';
const VALID_THEMES: readonly Theme[] = [
  'light',
  'dark',
  'minimal',
  'midnight',
  'monochrome',
  'paper',
];

function applyThemeClass(theme: Theme) {
  const h = document.documentElement;
  h.classList.remove('dark', 'minimal', 'monochrome');
  if (theme === 'dark') {
    h.classList.add('dark');
  } else if (theme === 'minimal') {
    h.classList.add('minimal');
  } else if (theme === 'midnight') {
    h.classList.add('minimal', 'dark');
  } else if (theme === 'monochrome') {
    h.classList.add('dark', 'monochrome');
  } else if (theme === 'paper') {
    h.classList.add('monochrome');
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'graphite') {
      localStorage.setItem(STORAGE_KEY, 'midnight');
    }
    const stored = (raw === 'graphite' ? 'midnight' : raw) as Theme | null;
    let next: Theme;
    if (stored && (VALID_THEMES as readonly string[]).includes(stored)) {
      next = stored;
    } else {
      const prefersDark =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      next = prefersDark ? 'dark' : 'light';
    }
    setThemeState(next);
    applyThemeClass(next);
  }, []);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyThemeClass(next);
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
