'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = window.localStorage.getItem('clientwave-theme');
    return stored === 'dark' || stored === 'light' ? stored : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    const applyTheme = () => {
      root.classList.remove('light', 'dark');
      body.classList.remove('light', 'dark');
      root.classList.add(theme);
      body.classList.add(theme);
      root.dataset.theme = theme;
      body.dataset.theme = theme;
      root.style.colorScheme = theme;
    };

    applyTheme();
    requestAnimationFrame(applyTheme);
    window.localStorage.setItem('clientwave-theme', theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
