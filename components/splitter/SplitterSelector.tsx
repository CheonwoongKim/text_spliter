"use client";

import { SPLITTER_INFO, SPLITTER_TYPES, type SplitterType } from "@/lib/types";
import { memo } from "react";

interface SplitterSelectorProps {
  value: SplitterType;
  onChange: (value: SplitterType) => void;
}

function SplitterSelector({
  value,
  onChange,
}: SplitterSelectorProps) {

  return (
    <div>
      <label className="block text-2xs font-medium text-surface-foreground mb-2">
        Splitter Type
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SplitterType)}
        className="w-full h-control-xl px-3 border border-border rounded-lg text-xs
                   focus-ring
                   bg-card text-card-foreground
                   transition-smooth"
      >
        {SPLITTER_TYPES.map((type) => (
          <option key={type} value={type}>
            {SPLITTER_INFO[type].name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default memo(SplitterSelector);
