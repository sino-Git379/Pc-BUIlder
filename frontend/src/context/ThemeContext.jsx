import React, { createContext, useContext, useEffect, useState } from 'react';
import { translations } from '../data/translations';

const ThemeContext = createContext(null);

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'ru', label: 'Русский', short: 'RU' },
  { code: 'tj', label: 'Тоҷикӣ', short: 'TJ' },
];

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('rigforge_theme') || localStorage.getItem('pcforge-theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (_) {}
    return 'light';
  });

  const [language, setLanguage] = useState(() => {
    try {
      const saved = localStorage.getItem('rigforge_lang');
      if (saved && ['en', 'ru', 'tj'].includes(saved)) return saved;
    } catch (_) {}
    return 'en';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('rigforge_theme', theme);
      localStorage.setItem('pcforge-theme', theme);
    } catch (_) {}
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem('rigforge_lang', language);
    } catch (_) {}
  }, [language]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const cycleLanguage = () => {
    const codes = ['en', 'ru', 'tj'];
    setLanguage((prev) => codes[(codes.indexOf(prev) + 1) % codes.length]);
  };

  const t = (key) => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        language,
        setLanguage,
        cycleLanguage,
        localeCurrency: `${language.toUpperCase()} / USD`,
        t,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
