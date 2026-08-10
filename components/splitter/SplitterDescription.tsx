"use client";

import { SplitterType, SPLITTER_INFO } from "@/lib/types";
import { memo } from "react";

interface SplitterDescriptionProps {
  splitterType: SplitterType;
}

function SplitterDescription({
  splitterType,
}: SplitterDescriptionProps) {
  const info = SPLITTER_INFO[splitterType];

  return (
    <div className="rounded-lg bg-upload-zone p-3">
      <h3 className="text-xs font-medium text-card-foreground mb-2">
        {info.name}
      </h3>
      <p className="text-xs text-surface-foreground mb-3">
        {info.description}
      </p>
      <div>
        <p className="text-xs font-medium text-surface-foreground mb-1">
          사용 사례:
        </p>
        <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
          {info.useCases.map((useCase, index) => (
            <li key={index}>{useCase}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default memo(SplitterDescription);
