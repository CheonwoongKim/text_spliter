"use client";

import { SplitterType, SPLITTER_INFO } from "@/lib/types";
import { memo } from "react";

interface SplitterSelectorProps {
  value: SplitterType;
  onChange: (value: SplitterType) => void;
}

const SPLITTER_TYPES: SplitterType[] = [
  "RecursiveCharacterTextSplitter",
  "CharacterTextSplitter",
  "TokenTextSplitter",
  "MarkdownTextSplitter",
  "LatexTextSplitter",
  "CodeSplitter",
  "SemanticChunker",
];

function SplitterSelector({
  value,
  onChange,
}: SplitterSelectorProps) {

  return (
    <div>
      <label className="block text-sm font-medium text-surface-foreground mb-2">
        Splitter Type
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SplitterType)}
        className="w-full h-12 px-3 border border-border rounded-lg
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
