import type { Config } from "tailwindcss";

/**
 * Vercel Design System - Tailwind Configuration
 * Based on Vercel's design system
 */
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class", // Support for dark mode
  theme: {
    extend: {
      colors: {
        // Semantic color system
        surface: {
          DEFAULT: "var(--color-surface)",
          foreground: "var(--color-surface-foreground)",
        },
        subtle: {
          DEFAULT: "var(--color-subtle)",
        },
        "secondary-background": {
          DEFAULT: "var(--color-secondary-background)",
        },
        border: {
          DEFAULT: "var(--color-border)",
          darkest: "var(--color-border-darkest)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          foreground: "var(--color-accent-foreground)",
        },
        muted: {
          DEFAULT: "var(--color-muted)",
          foreground: "var(--color-muted-foreground)",
        },
        card: {
          DEFAULT: "var(--color-card)",
          foreground: "var(--color-card-foreground)",
        },
        background: "var(--color-surface)",
        foreground: "var(--color-surface-foreground)",
      },
      fontFamily: {
        sans: [
          "var(--font-geist-sans)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "var(--font-geist-mono)",
          "Menlo",
          "Monaco",
          "Courier New",
          "monospace",
        ],
      },
      fontSize: {
        xs: ["12px", { lineHeight: "1.5" }],
        sm: ["13px", { lineHeight: "1.5" }],
        base: ["14px", { lineHeight: "1.5" }],
        lg: ["16px", { lineHeight: "1.5" }],
        xl: ["18px", { lineHeight: "1.5" }],
        "2xl": ["24px", { lineHeight: "1.25", fontWeight: "600" }],
        "3xl": ["30px", { lineHeight: "1.25", fontWeight: "600" }],
      },
      spacing: {
        "14": "3.5rem", // 56px (navigation height)
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "6px",
        lg: "8px",
      },
      boxShadow: {
        sm: "0 0 0 1px rgba(0,0,0,0.04)",
        DEFAULT: "0 0 0 1px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
        md: "0 0 0 1px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
        lg: "0 0 0 1px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.08)",
      },
      opacity: {
        disabled: "0.5",
        hover: "0.8",
      },
      zIndex: {
        navigation: "10",
        dropdown: "20",
        modal: "30",
        toast: "40",
      },
      backdropBlur: {
        sm: "4px",
        DEFAULT: "8px",
        md: "12px",
      },
    },
  },
  plugins: [],
};

export default config;
