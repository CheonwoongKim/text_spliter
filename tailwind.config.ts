import type { Config } from "tailwindcss";

/**
 * BGK Design System - strict Tailwind adapter
 *
 * Colors, typography, radius, elevation, and motion are intentionally
 * replaced instead of extended so unsupported Tailwind defaults are not
 * available to product components.
 */
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    colors: {
      inherit: "inherit",
      current: "currentColor",
      transparent: "transparent",
      surface: {
        DEFAULT: "var(--ds-color-bg-canvas)",
        foreground: "var(--ds-color-fg-default)",
      },
      subtle: "var(--ds-color-bg-muted)",
      "upload-zone": "var(--ds-color-bg-upload-zone)",
      "secondary-background": "var(--ds-color-bg-secondary)",
      border: {
        DEFAULT: "var(--ds-color-border-default)",
        subtle: "var(--ds-color-bg-secondary)",
        darkest: "var(--ds-color-border-strong)",
        control: "var(--ds-color-border-control)",
      },
      accent: {
        DEFAULT: "var(--ds-color-accent)",
        foreground: "var(--ds-color-accent-foreground)",
      },
      muted: {
        DEFAULT: "var(--ds-color-bg-muted)",
        foreground: "var(--ds-color-fg-muted)",
      },
      subdued: "var(--ds-color-fg-placeholder)",
      card: {
        DEFAULT: "var(--ds-color-bg-raised)",
        foreground: "var(--ds-color-fg-strong)",
      },
      background: "var(--ds-color-bg-canvas)",
      foreground: "var(--ds-color-fg-default)",
      brand: "var(--ds-color-brand-canvas)",
      overlay: "var(--ds-color-overlay)",
      success: {
        DEFAULT: "var(--ds-color-success)",
        surface: "var(--ds-color-success-surface)",
        border: "var(--ds-color-success-border)",
      },
      warning: {
        DEFAULT: "var(--ds-color-warning)",
        surface: "var(--ds-color-warning-surface)",
        border: "var(--ds-color-warning-border)",
      },
      danger: {
        DEFAULT: "var(--ds-color-danger)",
        surface: "var(--ds-color-danger-surface)",
        border: "var(--ds-color-danger-border)",
        action: "var(--ds-color-danger-action)",
        "action-foreground": "var(--ds-color-danger-action-foreground)",
      },
    },
    fontFamily: {
      sans: ["var(--ds-font-family-sans)"],
      mono: ["var(--ds-font-family-mono)"],
    },
    fontSize: {
      nav: ["var(--ds-navigation-font-size)", { lineHeight: "var(--ds-line-height-nav)" }],
      xs: ["var(--ds-font-size-xs)", { lineHeight: "var(--ds-line-height-xs)" }],
      base: ["var(--ds-font-size-base)", { lineHeight: "var(--ds-line-height-base)" }],
      lg: ["var(--ds-font-size-lg)", { lineHeight: "var(--ds-line-height-lg)" }],
      xl: ["var(--ds-font-size-xl)", { lineHeight: "var(--ds-line-height-xl)" }],
      "2xl": ["var(--ds-font-size-2xl)", { lineHeight: "var(--ds-line-height-2xl)" }],
    },
    fontWeight: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    },
    lineHeight: {
      4: "var(--ds-leading-4)",
      5: "var(--ds-leading-5)",
      6: "var(--ds-leading-6)",
      7: "var(--ds-leading-7)",
    },
    letterSpacing: {
      tight: "var(--ds-letter-spacing-tight)",
      normal: "var(--ds-letter-spacing-normal)",
      wide: "var(--ds-letter-spacing-wide)",
    },
    borderRadius: {
      sm: "var(--ds-radius-sm)",
      lg: "var(--ds-radius-lg)",
      xl: "var(--ds-radius-xl)",
      "2xl": "var(--ds-radius-2xl)",
      full: "var(--ds-radius-full)",
    },
    boxShadow: {
      sm: "var(--ds-shadow-sm)",
      DEFAULT: "var(--ds-shadow-md)",
      md: "var(--ds-shadow-md)",
      lg: "var(--ds-shadow-lg)",
    },
    transitionDuration: {
      DEFAULT: "var(--ds-duration-normal)",
      fast: "var(--ds-duration-fast)",
      normal: "var(--ds-duration-normal)",
      slow: "var(--ds-duration-slow)",
    },
    transitionTimingFunction: {
      standard: "var(--ds-ease-standard)",
    },
    zIndex: {
      auto: "auto",
      navigation: "var(--ds-z-navigation)",
      dropdown: "var(--ds-z-dropdown)",
      modal: "var(--ds-z-modal)",
      toast: "var(--ds-z-toast)",
    },
    extend: {
      maxWidth: {
        auth: "var(--ds-layout-auth-width)",
      },
      spacing: {
        "1": "var(--ds-space-1)",
        "2": "var(--ds-space-2)",
        "3": "var(--ds-space-3)",
        "4": "var(--ds-space-4)",
        "6": "var(--ds-space-6)",
        "8": "var(--ds-space-8)",
        "10": "var(--ds-space-10)",
        "12": "var(--ds-space-12)",
        "16": "var(--ds-space-16)",
        "icon-sm": "var(--ds-icon-sm)",
        "icon-md": "var(--ds-icon-md)",
        "control-sm": "var(--ds-control-sm)",
        "control-md": "var(--ds-control-md)",
        "control-lg": "var(--ds-control-lg)",
        "control-xl": "var(--ds-control-xl)",
        "parser-engine-option": "var(--ds-parser-engine-option-height)",
        "parser-file-zone": "var(--ds-parser-file-zone-height)",
        "splitter-source": "var(--ds-splitter-source-height)",
        topbar: "var(--ds-layout-topbar-height)",
        sidebar: "var(--ds-layout-sidebar-width)",
      },
      opacity: {
        disabled: "var(--ds-opacity-disabled)",
        hover: "var(--ds-opacity-hover)",
      },
    },
  },
  plugins: [],
};

export default config;
