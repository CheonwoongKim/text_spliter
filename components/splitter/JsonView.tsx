"use client";

import { SplitResponse } from "@/lib/types";
import { Button } from "@/components/shared/Button";
import { useState } from "react";
import JsonView from "@uiw/react-json-view";
import { useCopyToClipboard } from "@/lib/hooks/useCopyToClipboard";
import { JSON_VIEW_THEME } from "@/lib/json-view-theme";

interface JsonViewComponentProps {
  result: SplitResponse;
}

export default function JsonViewComponent({ result }: JsonViewComponentProps) {
  const { copied, copy } = useCopyToClipboard();
  const [collapsed, setCollapsed] = useState(false);

  const copyToClipboard = () => {
    void copy(JSON.stringify(result, null, 2)).catch(() => undefined);
  };

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xs font-medium text-surface-foreground">
          JSON Output
        </h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={toggleCollapse} title={collapsed ? "Expand All" : "Collapse All"}>
            {collapsed ? (
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 12H4"
                />
              </svg>
            )}
          </Button>
          <button
            onClick={copyToClipboard}
            className="px-3 py-1 text-xs hover:bg-muted text-surface-foreground rounded-lg transition-smooth"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <JsonView
          value={result}
          collapsed={collapsed}
          displayDataTypes={false}
          enableClipboard={false}
          style={JSON_VIEW_THEME}
        />
      </div>
    </div>
  );
}
