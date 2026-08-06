"use client";

import { memo, useCallback, useState, useMemo, useEffect } from "react";
import type { CSSProperties } from "react";
import JsonView from '@uiw/react-json-view';
import { JSON_VIEW_THEME } from "@/lib/json-view-theme";
import type { ParseResponse, ParserViewMode, ParserConfig } from "@/lib/types";
import ParseComparisonWorkbench from "@/components/parser/ParseComparisonWorkbench";

interface ParserRightPanelProps {
  result: ParseResponse | null;
  runs?: ParseResponse[];
  selectedFile: File | null;
  selectedFileStorageKey?: string | null;
  config: ParserConfig;
  onSelectRun?: (runId: string) => void;
  onClearRuns?: () => void;
}

interface ViewTab {
  key: ParserViewMode;
  label: string;
  available: boolean;
  hasData: boolean;
}

function ParserRightPanel({
  result,
  runs = [],
  selectedFile,
  selectedFileStorageKey,
  config,
  onSelectRun,
  onClearRuns,
}: ParserRightPanelProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<ParserViewMode>("text");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);

  // All engines expose legacy formats plus normalized and immutable raw views.
  const expectedTabs = useMemo<ViewTab[]>(() => {
    const tabs: ViewTab[] = [
      { key: "text", label: "Text", available: true, hasData: !!result?.text },
      { key: "html", label: "HTML", available: true, hasData: !!result?.html },
      { key: "markdown", label: "Markdown", available: true, hasData: !!result?.markdown },
      { key: "json", label: "JSON", available: true, hasData: !!result?.json },
      { key: "document", label: "Document IR", available: true, hasData: !!result?.document },
      { key: "raw", label: "Raw", available: true, hasData: !!result?.raw },
    ];

    return tabs;
  }, [result]);

  // Auto-select first available tab when config or result changes
  useEffect(() => {
    if (expectedTabs.length > 0) {
      // Try to keep current view mode if it's still available
      const isCurrentModeAvailable = expectedTabs.some(tab => tab.key === viewMode && tab.hasData);
      if (!isCurrentModeAvailable) {
        const firstAvailableTab = expectedTabs.find((tab) => tab.hasData);
        if (firstAvailableTab) setViewMode(firstAvailableTab.key);
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
    } else if (viewMode === "document") {
      textToCopy = JSON.stringify(result?.document, null, 2);
    } else if (viewMode === "raw") {
      textToCopy = JSON.stringify(result?.raw, null, 2);
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

      // Create FormData to send both file and result
      const formData = new FormData();
      formData.append('parserType', result.metadata?.parserType || config.parserType);
      formData.append('result', JSON.stringify(result));

      // If file is from storage, send the storage key instead of uploading again
      if (selectedFileStorageKey) {
        formData.append('fileStorageKey', selectedFileStorageKey);
      }
      // Otherwise, upload the file if available
      else if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const response = await fetch('/api/parse-results', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
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
  }, [result, config.parserType, selectedFile, selectedFileStorageKey]);

  return (
    <div className="h-full flex flex-col gap-6 py-6">
      {runs.length > 0 && (
        <section className="shrink-0 rounded-xl border border-border bg-card p-3">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-card-foreground">Parse Experiment</h3>
                <span className="px-2 py-1 rounded-full bg-muted text-xs text-muted-foreground">
                  {runs.length} run{runs.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                설정을 바꿔 다시 실행하면 같은 문서의 비교 후보로 누적됩니다.
              </p>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex rounded-lg bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setComparisonMode(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-smooth ${
                    !comparisonMode ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  Result
                </button>
                <button
                  type="button"
                  onClick={() => runs.length >= 2 && setComparisonMode(true)}
                  disabled={runs.length < 2}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-smooth ${
                    comparisonMode ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  Compare
                </button>
              </div>
              <button
                type="button"
                onClick={onClearRuns}
                className="px-3 py-2 text-xs text-muted-foreground hover:text-card-foreground"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {runs.map((run, index) => {
              const id = run.run?.id || `legacy-run-${index}`;
              const selected = result?.run?.id === run.run?.id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectRun?.(id)}
                  className={`shrink-0 min-w-[170px] max-w-[230px] text-left rounded-lg border px-3 py-2 transition-smooth ${
                    selected
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-border-darkest"
                  }`}
                >
                  <p className="text-xs font-medium text-card-foreground truncate">
                    {run.run?.engineId || run.metadata?.parserType || `Run ${index + 1}`}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {[run.run?.model, run.run?.version].filter(Boolean).join(" · ") || `Run ${index + 1}`}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Document Information */}
      {!comparisonMode && <div>
        <h3 className="text-base font-medium text-surface-foreground mb-4">
          Document Information
        </h3>
        {result?.metadata ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">File Name</p>
              <p className="text-base text-card-foreground font-medium truncate">
                {result.metadata.fileName}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">File Size</p>
              <p className="text-base text-card-foreground font-medium">
                {(result.metadata.fileSize / 1024).toFixed(2)} KB
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">MIME Type</p>
              <p className="text-base text-card-foreground font-medium">
                {result.metadata.mimeType}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Processing Time
              </p>
              <p className="text-base text-card-foreground font-medium">
                {result.metadata.processingTime}ms
              </p>
            </div>
            {result.run && (
              <>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Engine</p>
                  <p className="text-base text-card-foreground font-medium">
                    {result.run.engineId}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Model / Version</p>
                  <p className="text-base text-card-foreground font-medium">
                    {[result.run.model, result.run.version].filter(Boolean).join(" · ") || "-"}
                  </p>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">File Name</p>
              <p className="text-base text-muted-foreground">-</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">File Size</p>
              <p className="text-base text-muted-foreground">-</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">MIME Type</p>
              <p className="text-base text-muted-foreground">-</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Processing Time
              </p>
              <p className="text-base text-muted-foreground">-</p>
            </div>
          </div>
        )}
      </div>}

      {/* Parsed Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with Tabs and Action Buttons */}
        <div className="flex items-center justify-between mb-4">
          {/* View Mode Toggle - Dynamic Tabs */}
          {!comparisonMode && expectedTabs.length > 0 && (
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {expectedTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => tab.hasData && setViewMode(tab.key)}
                  disabled={!tab.hasData}
                  className={`px-3 py-1 text-xs font-medium rounded-sm transition-smooth ${
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
                  className="px-3 py-2 text-xs bg-accent/10 text-accent hover:bg-accent/20
                           rounded-lg transition-smooth flex items-center gap-2
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
                      {comparisonMode ? "Save Selected" : "Save"}
                    </>
                  )}
                </button>

                {/* Copy Button */}
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 text-xs bg-muted hover:bg-muted/80
                           text-muted-foreground rounded-lg transition-smooth
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
        <div className={`flex-1 overflow-auto rounded-lg ${comparisonMode ? "bg-transparent" : "p-6 bg-card"}`}>
          {!result ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-base text-muted-foreground">
                파싱된 콘텐츠가 여기에 표시됩니다
              </p>
            </div>
          ) : comparisonMode && runs.length >= 2 ? (
            <ParseComparisonWorkbench
              runs={runs}
              selectedFile={selectedFile}
              onSelectRun={onSelectRun}
            />
          ) : (
            <>
              {viewMode === "text" && (
                result.text ? (
                  <pre className="text-base text-card-foreground whitespace-pre-wrap font-mono">
                    {result.text}
                  </pre>
                ) : (
                  <p className="text-base text-muted-foreground italic">
                    Text content not available
                  </p>
                )
              )}
              {viewMode === "html" && (
                result.html ? (
                  <pre className="text-base text-card-foreground whitespace-pre-wrap font-mono">
                    {result.html}
                  </pre>
                ) : (
                  <p className="text-base text-muted-foreground italic">
                    HTML content not available
                  </p>
                )
              )}
              {viewMode === "markdown" && (
                result.markdown ? (
                  <pre className="text-base text-card-foreground whitespace-pre-wrap font-mono">
                    {result.markdown}
                  </pre>
                ) : (
                  <p className="text-base text-muted-foreground italic">
                    Markdown content not available
                  </p>
                )
              )}
              {viewMode === "json" && (
                result.json ? (
                  <div className="w-full">
                    <JsonView
                      value={typeof result.json === "string" ? JSON.parse(result.json) : result.json}
                      style={{
                        ...JSON_VIEW_THEME,
                        '--w-rjv-background-color': 'transparent',
                      } as CSSProperties}
                      collapsed={2}
                      displayDataTypes={false}
                      enableClipboard={true}
                    />
                  </div>
                ) : (
                  <p className="text-base text-muted-foreground italic">
                    JSON content not available
                  </p>
                )
              )}
              {viewMode === "document" && (
                result.document ? (
                  <div className="w-full">
                    <JsonView
                      value={result.document}
                      style={{
                        ...JSON_VIEW_THEME,
                        '--w-rjv-background-color': 'transparent',
                      } as CSSProperties}
                      collapsed={3}
                      displayDataTypes={false}
                      enableClipboard={true}
                    />
                  </div>
                ) : (
                  <p className="text-base text-muted-foreground italic">
                    Normalized document content not available
                  </p>
                )
              )}
              {viewMode === "raw" && (
                result.raw ? (
                  <div className="w-full">
                    {typeof result.raw === "object" ? (
                      <JsonView
                        value={result.raw}
                        style={{
                          ...JSON_VIEW_THEME,
                          '--w-rjv-background-color': 'transparent',
                        } as CSSProperties}
                        collapsed={3}
                        displayDataTypes={false}
                        enableClipboard={true}
                      />
                    ) : (
                      <pre className="text-base text-card-foreground whitespace-pre-wrap font-mono">
                        {String(result.raw)}
                      </pre>
                    )}
                  </div>
                ) : (
                  <p className="text-base text-muted-foreground italic">
                    Raw provider response not available
                  </p>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ParserRightPanel);
