"use client";

import { memo, useCallback, useState, useMemo, useEffect } from "react";
import type { ParseResponse, ParserViewMode, ParserConfig } from "@/lib/types";

interface ParserRightPanelProps {
  result: ParseResponse | null;
  selectedFile: File | null;
  config: ParserConfig;
}

interface ViewTab {
  key: ParserViewMode;
  label: string;
  available: boolean;
  hasData: boolean;
}

function ParserRightPanel({ result, selectedFile, config }: ParserRightPanelProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<ParserViewMode>("text");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Determine expected tabs based on parser config (show these even without results)
  const expectedTabs = useMemo<ViewTab[]>(() => {
    const tabs: ViewTab[] = [];

    if (config.parserType === "Upstage") {
      // Upstage returns all formats, show all tabs
      tabs.push({ key: "html", label: "HTML", available: true, hasData: !!result?.html });
      tabs.push({ key: "markdown", label: "Markdown", available: true, hasData: !!result?.markdown });
      tabs.push({ key: "text", label: "Text", available: true, hasData: !!result?.text });
    } else if (config.parserType === "LlamaIndex") {
      // LlamaIndex returns all formats from JSON response
      tabs.push({ key: "markdown", label: "Markdown", available: true, hasData: !!result?.markdown });
      tabs.push({ key: "text", label: "Text", available: true, hasData: !!result?.text });
      tabs.push({ key: "json", label: "JSON", available: true, hasData: !!result?.json });
    } else if (config.parserType === "Azure") {
      const format = config.azureOutputFormat || "text";
      if (format === "markdown") {
        tabs.push({ key: "markdown", label: "Markdown", available: true, hasData: !!result?.markdown });
      } else {
        tabs.push({ key: "text", label: "Text", available: true, hasData: !!result?.text });
      }
    } else if (config.parserType === "Google") {
      tabs.push({ key: "json", label: "JSON", available: true, hasData: !!result?.json });
    } else {
      // Default tabs for unknown parser
      tabs.push({ key: "text", label: "Text", available: true, hasData: !!result?.text });
    }

    // Always add raw tab
    tabs.push({ key: "raw", label: "Raw", available: true, hasData: !!result });

    return tabs;
  }, [config, result]);

  // Auto-select first available tab when config or result changes
  useEffect(() => {
    if (expectedTabs.length > 0) {
      // Try to keep current view mode if it's still available
      const isCurrentModeAvailable = expectedTabs.some(tab => tab.key === viewMode);
      if (!isCurrentModeAvailable) {
        setViewMode(expectedTabs[0].key);
      }
    }
  }, [expectedTabs, viewMode]);

  const handleCopy = useCallback(() => {
    let textToCopy = "";

    if (viewMode === "text") {
      textToCopy = result?.text || "";
    } else if (viewMode === "html") {
      textToCopy = result?.html || "";
    } else if (viewMode === "markdown") {
      textToCopy = result?.markdown || "";
    } else if (viewMode === "json") {
      textToCopy = typeof result?.json === "string"
        ? result.json
        : JSON.stringify(result?.json, null, 2);
    } else if (viewMode === "raw") {
      textToCopy = JSON.stringify(result, null, 2);
    }

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result, viewMode]);

  const handleSave = useCallback(async () => {
    if (!result) return;

    setSaving(true);
    setSaved(false);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('Please login first');
        setSaving(false);
        return;
      }

      const response = await fetch('/api/parse-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          parserType: config.parserType,
          result,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save parse result');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving parse result:', error);
      alert(error instanceof Error ? error.message : 'Failed to save parse result');
    } finally {
      setSaving(false);
    }
  }, [result, config.parserType]);

  return (
    <div className="h-full flex flex-col gap-6 py-6">
      {/* Document Information */}
      <div>
        <h3 className="text-sm font-medium text-surface-foreground mb-4">
          Document Information
        </h3>
        {result?.metadata ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">File Name</p>
              <p className="text-sm text-card-foreground font-medium truncate">
                {result.metadata.fileName}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">File Size</p>
              <p className="text-sm text-card-foreground font-medium">
                {(result.metadata.fileSize / 1024).toFixed(2)} KB
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">MIME Type</p>
              <p className="text-sm text-card-foreground font-medium">
                {result.metadata.mimeType}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Processing Time
              </p>
              <p className="text-sm text-card-foreground font-medium">
                {result.metadata.processingTime}ms
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">File Name</p>
              <p className="text-sm text-muted-foreground">-</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">File Size</p>
              <p className="text-sm text-muted-foreground">-</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">MIME Type</p>
              <p className="text-sm text-muted-foreground">-</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Processing Time
              </p>
              <p className="text-sm text-muted-foreground">-</p>
            </div>
          </div>
        )}
      </div>

      {/* Parsed Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with Tabs and Action Buttons */}
        <div className="flex items-center justify-between mb-4">
          {/* View Mode Toggle - Dynamic Tabs */}
          {expectedTabs.length > 0 && (
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {expectedTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => tab.hasData && setViewMode(tab.key)}
                  disabled={!tab.hasData}
                  className={`px-3 py-1 text-xs font-medium rounded transition-smooth ${
                    viewMode === tab.key
                      ? "bg-card text-card-foreground shadow-sm"
                      : tab.hasData
                      ? "text-muted-foreground hover:text-surface-foreground"
                      : "text-muted-foreground/40 cursor-not-allowed"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          {result && (
            <div className="flex items-center gap-2">
                {/* Save Button */}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1.5 text-xs bg-accent/10 text-accent hover:bg-accent/20
                           rounded-md transition-smooth flex items-center gap-2
                           disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <svg
                        className="w-4 h-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Saving...
                    </>
                  ) : saved ? (
                    <>
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
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Saved
                    </>
                  ) : (
                    <>
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
                          d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                        />
                      </svg>
                      Save
                    </>
                  )}
                </button>

                {/* Copy Button */}
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 text-xs bg-muted hover:bg-muted/80
                           text-muted-foreground rounded-md transition-smooth
                           flex items-center gap-2"
                >
                  {copied ? (
                    <>
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
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Copied
                    </>
                  ) : (
                    <>
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
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
            )}
        </div>

        {/* Content Display */}
        <div className="flex-1 overflow-auto rounded-lg p-6 bg-card">
          {!result ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">
                파싱된 콘텐츠가 여기에 표시됩니다
              </p>
            </div>
          ) : (
            <>
              {viewMode === "text" && (
                result.text ? (
                  <pre className="text-sm text-card-foreground whitespace-pre-wrap font-mono">
                    {result.text}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Text content not available
                  </p>
                )
              )}
              {viewMode === "html" && (
                result.html ? (
                  <pre className="text-sm text-card-foreground whitespace-pre-wrap font-mono">
                    {result.html}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    HTML content not available
                  </p>
                )
              )}
              {viewMode === "markdown" && (
                result.markdown ? (
                  <pre className="text-sm text-card-foreground whitespace-pre-wrap font-mono">
                    {result.markdown}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Markdown content not available
                  </p>
                )
              )}
              {viewMode === "json" && (
                result.json ? (
                  <pre className="text-sm text-card-foreground whitespace-pre-wrap font-mono">
                    {typeof result.json === "string"
                      ? result.json
                      : JSON.stringify(result.json, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    JSON content not available
                  </p>
                )
              )}
              {viewMode === "raw" && (
                <pre className="text-sm text-card-foreground whitespace-pre-wrap font-mono">
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ParserRightPanel);
