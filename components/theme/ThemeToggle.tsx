"use client";

import { useTheme } from "@/components/theme/ThemeProvider";

interface ThemeToggleProps {
  showLabel?: boolean;
}

export default function ThemeToggle({ showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const nextTheme = isDark ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-control-md items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-muted-foreground shadow-sm transition-smooth hover:border-border-darkest hover:bg-muted hover:text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      aria-label={`Switch to ${nextTheme} theme`}
      aria-pressed={isDark}
      title={`Switch to ${nextTheme} theme`}
    >
      <span className="relative block h-4 w-4" aria-hidden="true">
        <svg
          className={`absolute inset-0 h-4 w-4 transition-all duration-normal ${
            isDark ? "scale-100 rotate-0 opacity-100" : "scale-75 -rotate-45 opacity-0"
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
        </svg>
        <svg
          className={`absolute inset-0 h-4 w-4 transition-all duration-normal ${
            isDark ? "scale-75 rotate-45 opacity-0" : "scale-100 rotate-0 opacity-100"
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        </svg>
      </span>
      {showLabel && (
        <span className="text-xs font-medium capitalize">{nextTheme} theme</span>
      )}
    </button>
  );
}
