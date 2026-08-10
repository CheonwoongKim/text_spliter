"use client";

import { LoaderCircle, type LucideIcon } from "lucide-react";
import { memo } from "react";

import { Button, type ButtonProps } from "@/components/shared/Button";

/**
 * What a panel shows before it has anything to show.
 *
 * Every screen wrote its own version of this and they diverged in the way that
 * matters most: some said what to do next, some only said there was nothing
 * there. "No result yet" is a fact; "Add source text, choose a splitter, and
 * run it" is a way forward, and the second costs nothing extra to write.
 *
 * Loading lives here too. Screens hand-rolled the empty state and the spinner
 * as one conditional because they are the same slot, and a primitive that only
 * covered the empty half just got bypassed.
 */

interface PanelPlaceholderProps {
  /** Swaps the icon for a spinner and marks the region busy. */
  loading?: boolean;
  icon?: LucideIcon;
  title: string;
  /** What the reader can do next, not merely that nothing is here. */
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: ButtonProps["variant"];
  };
  className?: string;
}

function PanelPlaceholder({
  loading = false,
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: PanelPlaceholderProps) {
  return (
    <div
      className={`flex h-full flex-col items-center justify-center p-6 text-center ${className}`}
      aria-busy={loading || undefined}
      aria-live={loading ? "polite" : undefined}
    >
      {loading ? (
        <LoaderCircle
          className="mb-3 h-icon-md w-icon-md animate-spin text-muted-foreground"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      ) : Icon ? (
        <Icon
          className="mb-3 h-icon-md w-icon-md text-muted-foreground"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      ) : null}

      <p className="text-xs font-medium text-card-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-pretty text-2xs text-muted-foreground">{description}</p>
      )}

      {action && !loading && (
        <Button
          variant={action.variant || "primary"}
          size="sm"
          onClick={action.onClick}
          className="mt-4"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

export default memo(PanelPlaceholder);
