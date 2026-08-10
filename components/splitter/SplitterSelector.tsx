"use client";

import { SPLITTER_INFO, SPLITTER_TYPES, type SplitterType } from "@/lib/types";
import { memo } from "react";

interface SplitterSelectorProps {
  value: SplitterType;
  onChange: (value: SplitterType) => void;
  /** Structure splitting is only possible for a parsed document. */
  structureSplitAvailable?: boolean;
}

function SplitterSelector({
  value,
  onChange,
  structureSplitAvailable = false,
}: SplitterSelectorProps) {
  const structureSelected = value === "DocumentStructureSplitter";

  return (
    <div>
      <label
        htmlFor="splitter-type"
        className="block text-xs font-medium text-surface-foreground mb-2"
      >
        Splitter Type
      </label>
      <select
        id="splitter-type"
        value={value}
        onChange={(e) => onChange(e.target.value as SplitterType)}
        className="w-full h-control-xl px-3 border border-control rounded-lg text-xs
                   focus-ring
                   bg-card text-card-foreground
                   transition-smooth"
      >
        {SPLITTER_TYPES.map((type) => (
          <option
            key={type}
            value={type}
            disabled={type === "DocumentStructureSplitter" && !structureSplitAvailable}
          >
            {SPLITTER_INFO[type].name}
            {type === "DocumentStructureSplitter" && !structureSplitAvailable
              ? " · needs a parsed document"
              : ""}
          </option>
        ))}
      </select>

      {structureSelected && !structureSplitAvailable && (
        <p className="mt-2 text-xs text-danger">
          Send a parser result to the splitter to chunk along document structure.
        </p>
      )}
    </div>
  );
}

export default memo(SplitterSelector);
