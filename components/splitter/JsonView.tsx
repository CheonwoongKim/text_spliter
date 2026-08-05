"use client";

import { SplitResponse } from "@/lib/types";
import { useState } from "react";
import JsonView from "@uiw/react-json-view";

interface JsonViewComponentProps {
  result: SplitResponse;
}

export default function JsonViewComponent({ result }: JsonViewComponentProps) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-surface-foreground">
          JSON Output
        </h3>
        <div className="flex gap-2">
          <button
            onClick={toggleCollapse}
            className="p-2 hover:bg-muted text-surface-foreground rounded-lg transition-smooth"
            title={collapsed ? "Expand All" : "Collapse All"}
          >
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
          </button>
          <button
            onClick={copyToClipboard}
            className="px-3 py-1 text-xs hover:bg-muted text-surface-foreground rounded-lg transition-smooth"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-card border border-border rounded-lg p-4 scrollbar-thin">
        <JsonView
          value={result}
          collapsed={collapsed}
          displayDataTypes={false}
          enableClipboard={false}
          style={{
            backgroundColor: "transparent",
            fontSize: "12px",
            "--w-rjv-font-family": "monospace",
            "--w-rjv-color": "rgb(229, 229, 229)",
            "--w-rjv-key-string": "rgb(96, 165, 250)",
            "--w-rjv-background-color": "transparent",
            "--w-rjv-line-color": "rgb(82, 82, 82)",
            "--w-rjv-arrow-color": "rgb(156, 163, 175)",
            "--w-rjv-edit-color": "rgb(229, 229, 229)",
            "--w-rjv-info-color": "rgb(156, 163, 175)",
            "--w-rjv-update-color": "rgb(229, 229, 229)",
            "--w-rjv-copied-color": "rgb(229, 229, 229)",
            "--w-rjv-copied-success-color": "rgb(34, 197, 94)",
            "--w-rjv-curlybraces-color": "rgb(229, 229, 229)",
            "--w-rjv-colon-color": "rgb(229, 229, 229)",
            "--w-rjv-brackets-color": "rgb(229, 229, 229)",
            "--w-rjv-type-string-color": "rgb(96, 165, 250)",
            "--w-rjv-type-int-color": "rgb(147, 197, 253)",
            "--w-rjv-type-float-color": "rgb(147, 197, 253)",
            "--w-rjv-type-bigint-color": "rgb(147, 197, 253)",
            "--w-rjv-type-boolean-color": "rgb(251, 146, 60)",
            "--w-rjv-type-date-color": "rgb(250, 204, 21)",
            "--w-rjv-type-url-color": "rgb(96, 165, 250)",
            "--w-rjv-type-null-color": "rgb(156, 163, 175)",
            "--w-rjv-type-nan-color": "rgb(156, 163, 175)",
            "--w-rjv-type-undefined-color": "rgb(156, 163, 175)",
          } as any}
        />
      </div>
    </div>
  );
}
