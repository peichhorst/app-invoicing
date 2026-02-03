'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="fixed top-4 right-4 z-50 inline-flex items-center justify-center rounded-full border px-3 py-3 text-sm font-semibold shadow-lg transition-all hover:scale-105 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-200"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun size={20} className="text-yellow-500" />
      ) : (
        <Moon size={20} className="text-zinc-500" />
      )}
    </button>
  );
}
