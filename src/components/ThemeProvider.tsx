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
  // Always start with 'light' to avoid hydration mismatch
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // Sync with localStorage after mount
  useEffect(() => {
    setMounted(true);
    const stored = window.localStorage.getItem('clientwave-theme') as Theme;
    if (stored && (stored === 'light' || stored === 'dark')) {
      setThemeState(stored);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const root = document.documentElement;
    
    // Immediate synchronous update for mobile browsers
    root.classList.remove('light', 'dark');
    
    // Force reflow
    void root.offsetHeight;
    
    // Add the new theme class
    root.classList.add(theme);
    
    // Force another reflow
    void root.offsetHeight;
    
    // Additional update in next frame for stubborn mobile browsers
    requestAnimationFrame(() => {
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
      void root.offsetHeight;
    });
    
    // And one more delayed update for maximum compatibility
    setTimeout(() => {
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
    }, 10);
    
    // Store in localStorage
    window.localStorage.setItem('clientwave-theme', theme);
  }, [theme, mounted]);

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
