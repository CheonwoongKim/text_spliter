"use client";

import { memo } from "react";

/**
 * The segmented switch used to move between views of one page.
 *
 * Every panel had grown its own copy of this markup, and they disagreed on
 * padding, radius, and which state carried the shadow. Selection is announced
 * through `role="tab"` and `aria-selected` so it is not conveyed by colour
 * alone.
 */

export interface TabOption<Value extends string> {
  value: Value;
  label: string;
  /** Rendered after the label, for a count or status. */
  badge?: string | number;
  disabled?: boolean;
}

interface TabBarProps<Value extends string> {
  options: ReadonlyArray<TabOption<Value>>;
  value: Value;
  onChange: (value: Value) => void;
  /** Accessible name, since a page may hold more than one switch. */
  label: string;
}

function TabBarInner<Value extends string>({
  options,
  value,
  onChange,
  label,
}: TabBarProps<Value>) {
  return (
    <div className="inline-flex gap-1 rounded-lg bg-muted p-1" role="tablist" aria-label={label}>
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={`flex items-center gap-1 rounded-sm px-3 py-1 text-xs transition-smooth
                     disabled:cursor-not-allowed disabled:opacity-disabled ${
              selected
                ? "bg-card font-semibold text-card-foreground shadow-sm"
                : "font-medium text-muted-foreground hover:text-card-foreground"
            }`}
          >
            {option.label}
            {option.badge !== undefined && (
              <span className="text-xs font-normal text-muted-foreground">{option.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

const TabBar = memo(TabBarInner) as typeof TabBarInner;

export default TabBar;
