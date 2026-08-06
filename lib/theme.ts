export const THEME_STORAGE_KEY = "text-splitter-theme";

export const DEFAULT_THEME = "light" as const;

export type Theme = "light" | "dark";

export function normalizeTheme(value: unknown): Theme {
  return value === "dark" ? "dark" : DEFAULT_THEME;
}

export const THEME_BOOTSTRAP_SCRIPT = `
  (function () {
    try {
      var storedTheme = window.localStorage.getItem("${THEME_STORAGE_KEY}");
      var isDark = storedTheme === "dark";
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    } catch (error) {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }
  })();
`;
