"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  DEFAULT_THEME,
  normalizeTheme,
  THEME_STORAGE_KEY,
} from "@/lib/theme";
import type { Theme } from "@/lib/theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const transitionTimeout = useRef<number | null>(null);

  useEffect(() => {
    let storedTheme: Theme = DEFAULT_THEME;

    try {
      storedTheme = normalizeTheme(
        window.localStorage.getItem(THEME_STORAGE_KEY),
      );
    } catch {
      storedTheme = DEFAULT_THEME;
    }

    setThemeState(storedTheme);
    applyTheme(storedTheme);
  }, []);

  useEffect(() => {
    return () => {
      if (transitionTimeout.current !== null) {
        window.clearTimeout(transitionTimeout.current);
      }
    };
  }, []);

  const setTheme = useCallback((nextTheme: Theme) => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!reduceMotion) {
      root.classList.add("theme-transitioning");
      if (transitionTimeout.current !== null) {
        window.clearTimeout(transitionTimeout.current);
      }
      transitionTimeout.current = window.setTimeout(() => {
        root.classList.remove("theme-transitioning");
        transitionTimeout.current = null;
      }, 220);
    }

    setThemeState(nextTheme);
    applyTheme(nextTheme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Keep the in-memory preference when browser storage is unavailable.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [setTheme, theme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}
