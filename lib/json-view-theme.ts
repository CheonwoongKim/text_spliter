import type { CSSProperties } from "react";

/**
 * Shared JSON syntax theme. It intentionally uses only the product's neutral,
 * accent, and status roles from the product's single dark palette.
 */
export const JSON_VIEW_THEME = {
  backgroundColor: "transparent",
  fontSize: "var(--ds-font-size-xs)",
  "--w-rjv-font-family": "var(--ds-font-family-mono)",
  "--w-rjv-color": "var(--ds-color-fg-default)",
  "--w-rjv-key-string": "var(--ds-color-fg-default)",
  "--w-rjv-background-color": "transparent",
  "--w-rjv-line-color": "var(--ds-color-border-default)",
  "--w-rjv-arrow-color": "var(--ds-color-fg-muted)",
  "--w-rjv-edit-color": "var(--ds-color-fg-default)",
  "--w-rjv-info-color": "var(--ds-color-fg-muted)",
  "--w-rjv-update-color": "var(--ds-color-warning)",
  "--w-rjv-copied-color": "var(--ds-color-fg-default)",
  "--w-rjv-copied-success-color": "var(--ds-color-success)",
  "--w-rjv-curlybraces-color": "var(--ds-color-fg-muted)",
  "--w-rjv-colon-color": "var(--ds-color-fg-muted)",
  "--w-rjv-brackets-color": "var(--ds-color-fg-muted)",
  "--w-rjv-quotes-color": "var(--ds-color-fg-muted)",
  "--w-rjv-quotes-string-color": "var(--ds-color-accent)",
  "--w-rjv-type-string-color": "var(--ds-color-accent)",
  "--w-rjv-type-int-color": "var(--ds-color-fg-default)",
  "--w-rjv-type-float-color": "var(--ds-color-fg-default)",
  "--w-rjv-type-bigint-color": "var(--ds-color-fg-default)",
  "--w-rjv-type-boolean-color": "var(--ds-color-warning)",
  "--w-rjv-type-date-color": "var(--ds-color-fg-default)",
  "--w-rjv-type-url-color": "var(--ds-color-accent)",
  "--w-rjv-type-null-color": "var(--ds-color-fg-muted)",
  "--w-rjv-type-nan-color": "var(--ds-color-danger)",
  "--w-rjv-type-undefined-color": "var(--ds-color-fg-muted)",
} as CSSProperties;
