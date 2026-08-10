"use client";

import { memo, type ReactNode } from "react";

/**
 * The shell every workbench page is built in.
 *
 * Each panel used to declare its own frame, and they drifted: three pages used
 * `<header>`, five a bare `<div>`, two nothing at all, and the same page title
 * appeared at three different sizes. That inconsistency is invisible on any one
 * screen and obvious the moment a user moves between them.
 *
 * The frame is decided here so a page only supplies its content.
 */

/** One gutter for every page, so panels line up when a user switches menus. */
const PAGE_GUTTER = "px-4 sm:px-6 lg:px-10";

interface PagePanelProps {
  title: string;
  /** One line on what the page is for. Omit when the title says everything. */
  description?: string;
  /** Controls that act on the page as a whole. */
  actions?: ReactNode;
  /** Tabs or filters that belong to the header rather than the body. */
  toolbar?: ReactNode;
  /** Set when the body manages its own scrolling, such as a split workspace. */
  bodyScroll?: "auto" | "hidden";
  /** Set when the body supplies its own gutter, such as a full-bleed table. */
  bleed?: boolean;
  children: ReactNode;
}

function PagePanel({
  title,
  description,
  actions,
  toolbar,
  bodyScroll = "auto",
  bleed = false,
  children,
}: PagePanelProps) {
  return (
    <div className="flex h-full flex-col bg-surface">
      <header className={`shrink-0 border-b border-border-subtle bg-card py-4 ${PAGE_GUTTER}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-card-foreground">{title}</h1>
            {description && (
              <p className="mt-1 text-2xs text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {toolbar && <div className="mt-4">{toolbar}</div>}
      </header>

      <div
        className={`min-h-0 flex-1 ${bodyScroll === "auto" ? "overflow-y-auto" : "overflow-hidden"} ${
          bleed ? "" : `py-6 ${PAGE_GUTTER}`
        }`}
      >
        {children}
      </div>
    </div>
  );
}

interface PanelSectionProps {
  /** Uppercase eyebrow above a group inside a page. */
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** A titled group inside a page, one level below the page heading. */
export const PanelSection = memo(function PanelSection({
  title,
  description,
  actions,
  children,
}: PanelSectionProps) {
  return (
    <section className="flex min-h-0 flex-col">
      {(title || actions) && (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h2 className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-2xs text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
});

export default memo(PagePanel);
