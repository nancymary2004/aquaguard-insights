import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'nature' | 'medical' | 'ocean';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themes: { value: Theme; label: string; icon: string; description: string }[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const THEMES = [
  { value: 'light' as Theme, label: 'Light', icon: '☀️', description: 'Clean & bright' },
  { value: 'dark' as Theme, label: 'Dark', icon: '🌙', description: 'Easy on the eyes' },
  { value: 'nature' as Theme, label: 'Nature', icon: '🌿', description: 'Earth & green' },
  { value: 'medical' as Theme, label: 'Medical', icon: '🏥', description: 'Clinical blue' },
  { value: 'ocean' as Theme, label: 'Ocean', icon: '🌊', description: 'Deep sea blue' },
];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('wbdps-theme') as Theme) || 'light';
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('wbdps-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
