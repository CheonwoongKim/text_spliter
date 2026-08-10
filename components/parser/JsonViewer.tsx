"use client";

import JsonView from "@uiw/react-json-view";
import { useMemo } from "react";
import { normalizeJsonViewerValue } from "@/lib/json-view";
import { JSON_VIEW_THEME } from "@/lib/json-view-theme";

interface JsonViewerProps {
  value: unknown;
  collapsed?: boolean | number;
}

export default function JsonViewer({ value, collapsed = 2 }: JsonViewerProps) {
  const normalizedValue = useMemo(() => normalizeJsonViewerValue(value), [value]);

  return (
    <div className="w-full overflow-x-auto font-mono text-xs">
      <JsonView
        value={normalizedValue}
        style={JSON_VIEW_THEME}
        collapsed={collapsed}
        displayDataTypes={false}
        enableClipboard
      />
    </div>
  );
}
