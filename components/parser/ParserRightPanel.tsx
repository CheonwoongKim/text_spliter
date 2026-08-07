"use client";

import JsonView from "@uiw/react-json-view";
import { Check, Clipboard, FileText, LoaderCircle, Save } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import ParseComparisonWorkbench from "@/components/parser/ParseComparisonWorkbench";
import { summarizeDocumentEngineConfig } from "@/lib/document-engine-settings";
import { useCopyToClipboard } from "@/lib/hooks/useCopyToClipboard";
import { JSON_VIEW_THEME } from "@/lib/json-view-theme";
import type {
  DocumentEngineConfig,
  DocumentEngineType,
  ParseResponse,
  ParserViewMode,
} from "@/lib/types";

interface ParserRightPanelProps {
  result: ParseResponse | null;
  runs?: ParseResponse[];
  loading: boolean;
  selectedFile: File | null;
  selectedFileStorageKey?: string | null;
  config: DocumentEngineConfig & { parserType: DocumentEngineType };
  onSelectRun?: (runId: string) => void;
  onClearRuns?: () => void;
}

interface ViewTab {
  key: ParserViewMode;
  label: string;
  hasData: boolean;
}

function ParserRightPanel({
  result,
  runs = [],
  loading,
  selectedFile,
  selectedFileStorageKey,
  config,
  onSelectRun,
  onClearRuns,
}: ParserRightPanelProps) {
  const { copied, copy } = useCopyToClipboard();
  const [viewMode, setViewMode] = useState<ParserViewMode>("text");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);

  const expectedTabs = useMemo<ViewTab[]>(() => [
    { key: "text", label: "Text", hasData: Boolean(result?.text) },
    { key: "html", label: "HTML", hasData: Boolean(result?.html) },
    { key: "markdown", label: "Markdown", hasData: Boolean(result?.markdown) },
    { key: "json", label: "JSON", hasData: Boolean(result?.json) },
    { key: "document", label: "Document IR", hasData: Boolean(result?.document) },
    { key: "raw", label: "Raw", hasData: Boolean(result?.raw) },
  ], [result]);
  const availableTabs = expectedTabs.filter((tab) => tab.hasData);
  const activeViewMode = availableTabs.some((tab) => tab.key === viewMode)
    ? viewMode
    : availableTabs[0]?.key || "text";
  const showComparison = comparisonMode && runs.length >= 2;

  const handleCopy = useCallback(() => {
    let textToCopy = "";

    if (activeViewMode === "text") {
      textToCopy = result?.text || "";
    } else if (activeViewMode === "html") {
      textToCopy = result?.html || "";
    } else if (activeViewMode === "markdown") {
      textToCopy = result?.markdown || "";
    } else if (activeViewMode === "json") {
      textToCopy = typeof result?.json === "string"
        ? result.json
        : JSON.stringify(result?.json, null, 2);
    } else if (activeViewMode === "document") {
      textToCopy = JSON.stringify(result?.document, null, 2);
    } else if (activeViewMode === "raw") {
      textToCopy = JSON.stringify(result?.raw, null, 2);
    }

    if (textToCopy) {
      void copy(textToCopy).catch(() => undefined);
    }
  }, [activeViewMode, copy, result]);

  const handleSave = useCallback(async () => {
    if (!result) return;

    setSaving(true);
    setSaved(false);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        alert("Please login first");
        setSaving(false);
        return;
      }

      const formData = new FormData();
      formData.append("parserType", result.metadata?.parserType || config.parserType);
      formData.append("result", JSON.stringify(result));

      if (selectedFileStorageKey) {
        formData.append("fileStorageKey", selectedFileStorageKey);
      } else if (selectedFile) {
        formData.append("file", selectedFile);
      }

      const response = await fetch("/api/parse-results", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save parse result");
      }

      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Error saving parse result:", error);
      alert(error instanceof Error ? error.message : "Failed to save parse result");
    } finally {
      setSaving(false);
    }
  }, [config.parserType, result, selectedFile, selectedFileStorageKey]);

  return (
    <div className="flex h-full flex-col gap-6 py-6">
      {runs.length > 0 && (
        <section className="shrink-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
              Experiment results · {runs.length}
            </h3>
            <div className="flex items-center gap-1">
              <div className="flex rounded-lg bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setComparisonMode(false)}
                  className={`rounded-sm px-3 py-1 text-2xs font-medium transition-smooth ${
                    !showComparison
                      ? "bg-card text-card-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  Result
                </button>
                <button
                  type="button"
                  onClick={() => runs.length >= 2 && setComparisonMode(true)}
                  disabled={runs.length < 2}
                  className={`rounded-sm px-3 py-1 text-2xs font-medium transition-smooth ${
                    showComparison
                      ? "bg-card text-card-foreground shadow-sm"
                      : "text-muted-foreground"
                  } disabled:cursor-not-allowed disabled:opacity-disabled`}
                >
                  Compare
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setComparisonMode(false);
                  onClearRuns?.();
                }}
                className="px-3 py-2 text-2xs text-muted-foreground transition-smooth hover:text-card-foreground"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-1">
            {runs.map((run, index) => {
              const id = run.run?.id || `legacy-run-${index}`;
              const selected = result === run
                || Boolean(run.run?.id && result?.run?.id === run.run.id);
              const role = run.run?.role === "primary"
                ? "Primary"
                : run.run?.role === "additional"
                  ? "Additional"
                  : "Run";
              const summary = run.metadata?.parserType && run.run?.config
                ? summarizeDocumentEngineConfig(run.metadata.parserType, run.run.config)
                : [run.run?.model, run.run?.version].filter(Boolean).join(" · ")
                  || `Run ${index + 1}`;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectRun?.(id)}
                  aria-pressed={selected}
                  className={`min-w-[170px] max-w-[230px] shrink-0 rounded-lg border px-3 py-3 text-left transition-smooth ${
                    selected
                      ? "border-surface-foreground bg-upload-zone"
                      : "border-border hover:border-border-darkest"
                  }`}
                >
                  <p className="truncate text-xs font-medium text-card-foreground">
                    {run.run?.engineId || run.metadata?.parserType || `Run ${index + 1}`}
                  </p>
                  <p className="mt-1 truncate text-2xs text-muted-foreground">
                    {role} · {summary}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {!showComparison && result?.metadata && (
        <section className="shrink-0 border-b border-border-subtle pb-6">
          <h3 className="mb-3 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
            Result summary
          </h3>
          <dl className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <div className="min-w-0">
              <dt className="text-2xs text-muted-foreground">File</dt>
              <dd className="mt-1 truncate text-xs font-medium text-card-foreground">
                {result.metadata.fileName}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-2xs text-muted-foreground">Engine</dt>
              <dd className="mt-1 truncate text-xs font-medium text-card-foreground">
                {result.run?.engineId || result.metadata.parserType}
                {result.run?.model ? ` · ${result.run.model}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-2xs text-muted-foreground">Processing</dt>
              <dd className="mt-1 text-xs font-medium text-card-foreground">
                {result.metadata.processingTime} ms
              </dd>
            </div>
            <div>
              <dt className="text-2xs text-muted-foreground">Document</dt>
              <dd className="mt-1 text-xs font-medium text-card-foreground">
                {result.metadata.pageCount ? `${result.metadata.pageCount} pages · ` : ""}
                {(result.metadata.fileSize / 1024).toFixed(1)} KB
              </dd>
            </div>
          </dl>
        </section>
      )}

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
            {showComparison ? "Compare results" : "Output"}
          </h3>

          {result && !showComparison && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex h-control-sm items-center gap-2 rounded-lg bg-surface-foreground px-3 text-xs
                         font-medium text-surface transition-smooth hover:opacity-hover
                         disabled:cursor-not-allowed disabled:opacity-disabled"
              >
                {saving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1} aria-hidden="true" />
                ) : saved ? (
                  <Check className="h-4 w-4" strokeWidth={1} aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" strokeWidth={1} aria-hidden="true" />
                )}
                {saving ? "Saving..." : saved ? "Saved" : "Save"}
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="flex h-control-sm items-center gap-2 rounded-lg border border-border px-3 text-xs
                         font-medium text-card-foreground transition-smooth hover:border-border-darkest"
              >
                {copied ? (
                  <Check className="h-4 w-4" strokeWidth={1} aria-hidden="true" />
                ) : (
                  <Clipboard className="h-4 w-4" strokeWidth={1} aria-hidden="true" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          )}
        </div>

        {!showComparison && availableTabs.length > 0 && (
          <div className="mb-3 overflow-x-auto">
            <div className="flex w-max gap-1 rounded-lg bg-muted p-1">
              {availableTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setViewMode(tab.key)}
                  className={`rounded-sm px-3 py-1 text-2xs font-medium transition-smooth ${
                    activeViewMode === tab.key
                      ? "bg-card text-card-foreground shadow-sm"
                      : "text-muted-foreground hover:text-surface-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={`min-h-0 flex-1 border-t border-border-subtle pt-4 ${
          showComparison ? "overflow-hidden" : "overflow-auto"
        }`}>
          {!result ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              {loading ? (
                <LoaderCircle
                  className="mb-3 h-icon-md w-icon-md animate-spin text-muted-foreground"
                  strokeWidth={1}
                  aria-hidden="true"
                />
              ) : (
                <FileText
                  className="mb-3 h-icon-md w-icon-md text-muted-foreground"
                  strokeWidth={1}
                  aria-hidden="true"
                />
              )}
              <p className="text-xs font-medium text-card-foreground">
                {loading ? "Processing document" : "No result yet"}
              </p>
              <p className="mt-1 text-2xs text-muted-foreground">
                {loading
                  ? "The result will appear when processing is complete."
                  : "Select a file and run a processing engine."}
              </p>
            </div>
          ) : showComparison ? (
            <ParseComparisonWorkbench
              runs={runs}
              selectedFile={selectedFile}
              onSelectRun={onSelectRun}
            />
          ) : availableTabs.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <FileText
                className="mb-3 h-icon-md w-icon-md text-muted-foreground"
                strokeWidth={1}
                aria-hidden="true"
              />
              <p className="text-xs font-medium text-card-foreground">No output returned</p>
              <p className="mt-1 text-2xs text-muted-foreground">
                This engine did not return a supported output format.
              </p>
            </div>
          ) : (
            <>
              {activeViewMode === "text" && result.text && (
                <pre className="whitespace-pre-wrap font-mono text-xs leading-5 text-card-foreground">
                  {result.text}
                </pre>
              )}
              {activeViewMode === "html" && result.html && (
                <pre className="whitespace-pre-wrap font-mono text-xs leading-5 text-card-foreground">
                  {result.html}
                </pre>
              )}
              {activeViewMode === "markdown" && result.markdown && (
                <pre className="whitespace-pre-wrap font-mono text-xs leading-5 text-card-foreground">
                  {result.markdown}
                </pre>
              )}
              {activeViewMode === "json" && result.json && (
                <div className="w-full">
                  <JsonView
                    value={typeof result.json === "string" ? JSON.parse(result.json) : result.json}
                    style={{
                      ...JSON_VIEW_THEME,
                      "--w-rjv-background-color": "transparent",
                    } as CSSProperties}
                    collapsed={2}
                    displayDataTypes={false}
                    enableClipboard
                  />
                </div>
              )}
              {activeViewMode === "document" && result.document && (
                <div className="w-full">
                  <JsonView
                    value={result.document}
                    style={{
                      ...JSON_VIEW_THEME,
                      "--w-rjv-background-color": "transparent",
                    } as CSSProperties}
                    collapsed={3}
                    displayDataTypes={false}
                    enableClipboard
                  />
                </div>
              )}
              {activeViewMode === "raw" && result.raw && (
                <div className="w-full">
                  {typeof result.raw === "object" ? (
                    <JsonView
                      value={result.raw}
                      style={{
                        ...JSON_VIEW_THEME,
                        "--w-rjv-background-color": "transparent",
                      } as CSSProperties}
                      collapsed={3}
                      displayDataTypes={false}
                      enableClipboard
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap font-mono text-xs leading-5 text-card-foreground">
                      {String(result.raw)}
                    </pre>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default memo(ParserRightPanel);
