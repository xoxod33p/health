'use client';

import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  resolvedTheme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
});

const THEME_STORAGE_KEY = 'caresignal-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [, startTransition] = useTransition();

  // 1. Initial read from localStorage on client mount (defaults to 'light')
  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemeState(stored);
      } else {
        setThemeState('light');
      }
    } catch {
      setThemeState('light');
    }
  }, []);

  // 2. Resolve the effective theme and synchronize with <html> element
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateTheme = () => {
      const systemDark = mediaQuery.matches;
      const effective: ResolvedTheme =
        theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

      setResolvedTheme(effective);

      const root = document.documentElement;
      root.setAttribute('data-theme', effective);
      root.classList.remove('light', 'dark');
      root.classList.add(effective);
      root.style.colorScheme = effective;

      // Update mobile browser meta theme-color
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', effective === 'dark' ? '#0d171c' : '#1b8b83');
      }
    };

    updateTheme();

    const handleChange = () => {
      if (theme === 'system') {
        updateTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    startTransition(() => {
      setThemeState(newTheme);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      } catch {}
    });
  };

  const toggleTheme = () => {
    // Quick toggle between light and dark
    const next: Theme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
