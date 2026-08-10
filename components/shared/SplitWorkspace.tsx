"use client";

import { memo, type ReactNode } from "react";

/**
 * The two-column frame the pipeline stages run in: settings on the left, the
 * result on the right.
 *
 * Parsing, chunking, and indexing each declared this grid inline in the page
 * component, and the three had drifted — different column splits, different
 * gutters, and only some of them a divider. Moving it here also gives the
 * columns landmark roles, so the settings side can be skipped by a screen
 * reader user going straight to the result.
 */

interface SplitWorkspaceProps {
  settings: ReactNode;
  result: ReactNode;
  /** Left-column width in tenths. The rest goes to the result. */
  settingsSpan?: 2 | 3 | 4;
  settingsLabel?: string;
  resultLabel?: string;
}

const SETTINGS_SPAN = { 2: "lg:col-span-2", 3: "lg:col-span-3", 4: "lg:col-span-4" } as const;
const RESULT_SPAN = { 2: "lg:col-span-8", 3: "lg:col-span-7", 4: "lg:col-span-6" } as const;

function SplitWorkspace({
  settings,
  result,
  settingsSpan = 3,
  settingsLabel = "설정",
  resultLabel = "결과",
}: SplitWorkspaceProps) {
  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-10">
      <aside
        aria-label={settingsLabel}
        className={`h-full overflow-hidden border-border-subtle px-4 sm:px-6 lg:border-r lg:pl-10 lg:pr-6 ${SETTINGS_SPAN[settingsSpan]}`}
      >
        {settings}
      </aside>

      <section
        aria-label={resultLabel}
        className={`h-full overflow-hidden px-4 sm:px-6 lg:pl-6 lg:pr-10 ${RESULT_SPAN[settingsSpan]}`}
      >
        {result}
      </section>
    </div>
  );
}

export default memo(SplitWorkspace);
