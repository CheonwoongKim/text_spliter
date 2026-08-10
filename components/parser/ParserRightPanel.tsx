"use client";

import { Check, Clipboard, FileText, LoaderCircle, Save } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import JsonViewer from "@/components/parser/JsonViewer";
import MarkdownViewer from "@/components/parser/MarkdownViewer";
import ParseComparisonWorkbench from "@/components/parser/ParseComparisonWorkbench";
import ParserFocusWorkbench, {
  type ParserAreaReview,
} from "@/components/parser/ParserFocusWorkbench";
import ParserResultsOverview, { parserRunId } from "@/components/parser/ParserResultsOverview";
import { useCopyToClipboard } from "@/lib/hooks/useCopyToClipboard";
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

type ResultWorkspaceMode = "overview" | "focus" | "detail" | "compare";

const SAMPLE_TEXT = `2026 Product Brief

Document processing converts the source file into structured text while preserving headings, paragraphs, and tables.

Metric          Result
Text accuracy   98.4%
Pages           12
Tables          3`;

const SAMPLE_MARKDOWN = `# 2026 Product Brief

Document processing converts the source file into structured text while preserving headings, paragraphs, and tables.

| Metric | Result |
| --- | ---: |
| Text accuracy | 98.4% |
| Pages | 12 |
| Tables | 3 |`;

const SAMPLE_HTML = `<article>
  <h1>2026 Product Brief</h1>
  <p>Document processing converts the source file into structured content.</p>
  <table>
    <thead><tr><th>Metric</th><th>Result</th></tr></thead>
    <tbody><tr><td>Text accuracy</td><td>98.4%</td></tr></tbody>
  </table>
</article>`;

function sampleRegion(y: number, height: number) {
  return {
    coordinateSystem: "normalized" as const,
    polygon: [
      { x: 0.08, y },
      { x: 0.92, y },
      { x: 0.92, y: y + height },
      { x: 0.08, y: y + height },
    ],
    boundingBox: { x: 0.08, y, width: 0.84, height },
  };
}

const SAMPLE_RESULT: ParseResponse = {
  text: SAMPLE_TEXT,
  html: SAMPLE_HTML,
  markdown: SAMPLE_MARKDOWN,
  json: {
    title: "2026 Product Brief",
    summary: "Structured document extraction preview",
    metrics: {
      textAccuracy: 0.984,
      pages: 12,
      tables: 3,
    },
  },
  document: {
    schemaVersion: "1.0",
    text: SAMPLE_TEXT,
    html: SAMPLE_HTML,
    markdown: SAMPLE_MARKDOWN,
    pages: [
      {
        pageNumber: 1,
        text: SAMPLE_TEXT,
        markdown: SAMPLE_MARKDOWN,
        blocks: [
          {
            id: "sample-title",
            type: "title",
            pageNumber: 1,
            readingOrder: 0,
            text: "2026 Product Brief",
            region: sampleRegion(0.08, 0.08),
          },
          {
            id: "sample-paragraph",
            type: "paragraph",
            pageNumber: 1,
            readingOrder: 1,
            text: "Document processing converts the source file into structured text.",
            region: sampleRegion(0.22, 0.12),
          },
          {
            id: "sample-table",
            type: "table",
            pageNumber: 1,
            readingOrder: 2,
            text: "Metric Result\nText accuracy 98.4%\nPages 12",
            region: sampleRegion(0.42, 0.24),
            table: {
              rowCount: 3,
              columnCount: 2,
              cells: [
                { rowIndex: 0, columnIndex: 0, text: "Metric", isHeader: true },
                { rowIndex: 0, columnIndex: 1, text: "Result", isHeader: true },
                { rowIndex: 1, columnIndex: 0, text: "Text accuracy" },
                { rowIndex: 1, columnIndex: 1, text: "98.4%" },
                { rowIndex: 2, columnIndex: 0, text: "Pages" },
                { rowIndex: 2, columnIndex: 1, text: "12" },
              ],
            },
          },
        ],
      },
    ],
    statistics: {
      pageCount: 12,
      blockCount: 42,
      tableCount: 3,
      figureCount: 2,
      formulaCount: 0,
    },
  },
  metadata: {
    fileName: "product-brief.pdf",
    fileSize: 2_457_600,
    mimeType: "application/pdf",
    pageCount: 12,
    processingTime: 1240,
    parserType: "LlamaIndex",
  },
};

function sampleDocumentVariant(
  accuracy: string,
  options: { omitTable?: boolean; paragraph?: string } = {},
): NonNullable<ParseResponse["document"]> {
  const document = SAMPLE_RESULT.document!;
  return {
    ...document,
    text: document.text?.replace("98.4%", accuracy),
    markdown: document.markdown?.replace("98.4%", accuracy),
    html: document.html?.replace("98.4%", accuracy),
    pages: document.pages.map((page) => ({
      ...page,
      text: page.text?.replace("98.4%", accuracy),
      markdown: page.markdown?.replace("98.4%", accuracy),
      blocks: page.blocks
        .filter((block) => !(options.omitTable && block.type === "table"))
        .map((block) => ({
          ...block,
          text: block.id === "sample-paragraph"
            ? options.paragraph || block.text
            : block.text?.replace("98.4%", accuracy),
          table: block.table ? {
            ...block.table,
            cells: block.table.cells.map((cell) => ({
              ...cell,
              text: cell.text?.replace("98.4%", accuracy),
            })),
          } : undefined,
        })),
    })),
  };
}

const SAMPLE_RUNS: ParseResponse[] = [
  {
    ...SAMPLE_RESULT,
    run: {
      id: "sample-llamaparse",
      engineId: "LlamaParse v2",
      provider: "LlamaIndex",
      version: "v2",
      status: "succeeded",
      config: {},
      experimentId: "sample-experiment",
      role: "primary",
      engineKind: "parser",
      startedAt: "2026-08-07T00:00:00.000Z",
      completedAt: "2026-08-07T00:00:01.240Z",
    },
  },
  {
    ...SAMPLE_RESULT,
    text: SAMPLE_TEXT.replace("98.4%", "97.9%"),
    html: SAMPLE_HTML.replace("98.4%", "97.9%"),
    json: {
      engine: "Azure Document Intelligence",
      textAccuracy: 0.979,
      pages: 12,
      tables: 3,
    },
    markdown: undefined,
    document: sampleDocumentVariant("97.9%", {
      paragraph: "Document processing converts source files into structured content while preserving layout.",
    }),
    metadata: {
      ...SAMPLE_RESULT.metadata!,
      processingTime: 1680,
      parserType: "Azure",
    },
    run: {
      id: "sample-azure",
      engineId: "Azure Document Intelligence",
      provider: "Microsoft Azure",
      model: "prebuilt-layout",
      status: "succeeded",
      config: {},
      experimentId: "sample-experiment",
      role: "additional",
      engineKind: "parser",
      startedAt: "2026-08-07T00:00:01.240Z",
      completedAt: "2026-08-07T00:00:02.920Z",
    },
  },
  {
    ...SAMPLE_RESULT,
    text: SAMPLE_TEXT.replace("98.4%", "98.1%"),
    html: undefined,
    markdown: SAMPLE_MARKDOWN.replace("98.4%", "98.1%"),
    json: {
      engine: "Qwen Vision",
      textAccuracy: 0.981,
      pages: 12,
      tables: 3,
    },
    document: sampleDocumentVariant("98.1%", { omitTable: true }),
    metadata: {
      ...SAMPLE_RESULT.metadata!,
      processingTime: 2310,
      parserType: "Qwen Vision",
      engineKind: "vision",
      inputMode: "native-document",
    },
    run: {
      id: "sample-qwen",
      engineId: "Qwen Vision",
      provider: "Alibaba Cloud",
      model: "Qwen2.5-VL",
      status: "succeeded",
      config: {},
      experimentId: "sample-experiment",
      role: "additional",
      engineKind: "vision",
      inputMode: "native-document",
      startedAt: "2026-08-07T00:00:02.920Z",
      completedAt: "2026-08-07T00:00:05.230Z",
    },
  },
];

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
  const [workspaceMode, setWorkspaceMode] = useState<ResultWorkspaceMode>("overview");
  const [focusAreaId, setFocusAreaId] = useState<string | undefined>();
  const [focusReviews, setFocusReviews] = useState<Record<string, ParserAreaReview>>({});
  const [previewRunId, setPreviewRunId] = useState(SAMPLE_RUNS[0].run?.id || "");
  const previousRunCount = useRef(runs.length);
  const previousLoading = useRef(loading);
  const isPreview = !result && !loading && runs.length === 0;
  const workspaceRuns = isPreview ? SAMPLE_RUNS : runs;
  const previewResult = isPreview
    ? SAMPLE_RUNS.find((run) => run.run?.id === previewRunId) || SAMPLE_RUNS[0]
    : null;
  const displayResult = result || previewResult;

  const expectedTabs = useMemo<ViewTab[]>(() => [
    { key: "text", label: "Text", hasData: Boolean(displayResult?.text) },
    { key: "html", label: "HTML", hasData: Boolean(displayResult?.html) },
    { key: "markdown", label: "Markdown", hasData: Boolean(displayResult?.markdown) },
    { key: "json", label: "JSON", hasData: Boolean(displayResult?.json) },
    { key: "document", label: "Document IR", hasData: Boolean(displayResult?.document) },
    { key: "raw", label: "Raw", hasData: Boolean(displayResult?.raw) },
  ], [displayResult]);
  const availableTabs = expectedTabs.filter((tab) => tab.hasData);
  const activeViewMode = availableTabs.some((tab) => tab.key === viewMode)
    ? viewMode
    : availableTabs[0]?.key || "text";
  const showOverview = workspaceMode === "overview" && workspaceRuns.length > 0;
  const showFocus = workspaceMode === "focus" && workspaceRuns.length >= 2;
  const showDetail = workspaceMode === "detail" || workspaceRuns.length === 0;
  const showComparison = workspaceMode === "compare" && workspaceRuns.length >= 2;
  const selectedRunId = useMemo(() => {
    const selectedIndex = workspaceRuns.findIndex((run) => run === displayResult || (
      Boolean(run.run?.id) && run.run?.id === displayResult?.run?.id
    ));
    return selectedIndex >= 0
      ? parserRunId(workspaceRuns[selectedIndex], selectedIndex)
      : undefined;
  }, [displayResult, workspaceRuns]);

  const handleSelectRun = useCallback((runId: string) => {
    if (isPreview) {
      setPreviewRunId(runId);
      return;
    }
    onSelectRun?.(runId);
  }, [isPreview, onSelectRun]);

  const handleOpenRun = useCallback((runId: string) => {
    handleSelectRun(runId);
    setWorkspaceMode("detail");
  }, [handleSelectRun]);

  const handleOpenFocus = useCallback((areaId?: string) => {
    setFocusAreaId(areaId);
    setWorkspaceMode("focus");
  }, []);

  const handleFocusReviewChange = useCallback((areaId: string, review: ParserAreaReview) => {
    setFocusReviews((current) => ({ ...current, [areaId]: review }));
  }, []);

  useEffect(() => {
    if (loading && !previousLoading.current) {
      setWorkspaceMode("overview");
      setFocusReviews({});
    } else if (runs.length === 0 && previousRunCount.current > 0) {
      setWorkspaceMode("overview");
      setFocusReviews({});
    } else if (!isPreview && runs.length < 2 && (workspaceMode === "compare" || workspaceMode === "focus")) {
      setWorkspaceMode("overview");
    }
    previousRunCount.current = runs.length;
    previousLoading.current = loading;
  }, [isPreview, loading, runs.length, workspaceMode]);

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
      {workspaceRuns.length > 0 && (
        <section className="shrink-0 border-b border-border-subtle pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-card-foreground">Multi-engine analysis</h2>
              <p className="mt-1 text-2xs text-muted-foreground">
                {isPreview ? "Sample experiment" : `${workspaceRuns.length} engine result${workspaceRuns.length === 1 ? "" : "s"} completed`}
                {isPreview
                  ? " · Explore the comparison workflow before processing"
                  : loading
                    ? " · Processing remaining engines"
                    : " · Ready to review"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg bg-muted p-1" aria-label="Result workspace view">
                <button
                  type="button"
                  onClick={() => setWorkspaceMode("overview")}
                  className={`rounded-sm px-3 py-1 text-2xs font-medium transition-smooth ${
                    showOverview
                      ? "bg-card text-card-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenFocus()}
                  disabled={workspaceRuns.length < 2}
                  className={`rounded-sm px-3 py-1 text-2xs font-medium transition-smooth ${
                    showFocus
                      ? "bg-card text-card-foreground shadow-sm"
                      : "text-muted-foreground"
                  } disabled:cursor-not-allowed disabled:opacity-disabled`}
                >
                  Focus review
                </button>
                <button
                  type="button"
                  onClick={() => setWorkspaceMode("detail")}
                  disabled={!displayResult}
                  className={`rounded-sm px-3 py-1 text-2xs font-medium transition-smooth ${
                    showDetail
                      ? "bg-card text-card-foreground shadow-sm"
                      : "text-muted-foreground"
                  } disabled:cursor-not-allowed disabled:opacity-disabled`}
                >
                  Full result
                </button>
                <button
                  type="button"
                  onClick={() => workspaceRuns.length >= 2 && setWorkspaceMode("compare")}
                  disabled={workspaceRuns.length < 2}
                  className={`rounded-sm px-3 py-1 text-2xs font-medium transition-smooth ${
                    showComparison
                      ? "bg-card text-card-foreground shadow-sm"
                      : "text-muted-foreground"
                  } disabled:cursor-not-allowed disabled:opacity-disabled`}
                >
                  Full compare
                </button>
              </div>
              {!isPreview && (
                <button
                  type="button"
                  onClick={() => {
                    setWorkspaceMode("overview");
                    onClearRuns?.();
                  }}
                  className="px-2 py-2 text-2xs text-muted-foreground transition-smooth hover:text-card-foreground"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {showDetail && displayResult?.metadata && (
        <section className="shrink-0 border-b border-border-subtle pb-6">
          <h3 className="mb-3 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
            {isPreview ? "Example result" : "Result summary"}
          </h3>
          <dl className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <div className="min-w-0">
              <dt className="text-2xs text-muted-foreground">File</dt>
              <dd className="mt-1 truncate text-xs font-medium text-card-foreground">
                {displayResult.metadata.fileName}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-2xs text-muted-foreground">Engine</dt>
              <dd className="mt-1 truncate text-xs font-medium text-card-foreground">
                {displayResult.run?.engineId || displayResult.metadata.parserType}
                {displayResult.run?.model ? ` · ${displayResult.run.model}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-2xs text-muted-foreground">Processing</dt>
              <dd className="mt-1 text-xs font-medium text-card-foreground">
                {displayResult.metadata.processingTime} ms
              </dd>
            </div>
            <div>
              <dt className="text-2xs text-muted-foreground">Document</dt>
              <dd className="mt-1 text-xs font-medium text-card-foreground">
                {displayResult.metadata.pageCount ? `${displayResult.metadata.pageCount} pages · ` : ""}
                {(displayResult.metadata.fileSize / 1024).toFixed(1)} KB
              </dd>
            </div>
          </dl>
        </section>
      )}

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {!showOverview && (
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                {showFocus ? "Focused comparison" : showComparison ? "Full pairwise comparison" : "Engine output"}
              </h3>
              {isPreview && !showComparison && (
                <span className="rounded-sm bg-muted px-2 py-1 text-2xs text-muted-foreground">
                  Preview
                </span>
              )}
            </div>

            {result && showDetail && (
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
        )}

        {showDetail && availableTabs.length > 0 && (
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
          showComparison || showOverview || showFocus ? "overflow-hidden" : "overflow-auto"
        }`}>
          {showOverview ? (
            <ParserResultsOverview
              runs={workspaceRuns}
              loading={loading && !isPreview}
              selectedRunId={selectedRunId}
              onOpenRun={handleOpenRun}
              onCompare={() => setWorkspaceMode("compare")}
              onOpenFocus={handleOpenFocus}
            />
          ) : showFocus ? (
            <ParserFocusWorkbench
              runs={workspaceRuns}
              selectedFile={selectedFile}
              initialAreaId={focusAreaId}
              sampleMode={isPreview}
              onOpenFullCompare={() => setWorkspaceMode("compare")}
              reviews={focusReviews}
              onReviewChange={handleFocusReviewChange}
            />
          ) : loading && !result ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <LoaderCircle
                className="mb-3 h-icon-md w-icon-md animate-spin text-muted-foreground"
                strokeWidth={1}
                aria-hidden="true"
              />
              <p className="text-xs font-medium text-card-foreground">Processing document</p>
              <p className="mt-1 text-2xs text-muted-foreground">
                The result will appear when processing is complete.
              </p>
            </div>
          ) : showComparison ? (
            <ParseComparisonWorkbench
              runs={workspaceRuns}
              selectedFile={selectedFile}
              onSelectRun={handleSelectRun}
              sampleMode={isPreview}
            />
          ) : !displayResult || availableTabs.length === 0 ? (
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
              {activeViewMode === "text" && displayResult.text && (
                <pre className="whitespace-pre-wrap font-mono text-xs leading-5 text-card-foreground">
                  {displayResult.text}
                </pre>
              )}
              {activeViewMode === "html" && displayResult.html && (
                <pre className="whitespace-pre-wrap font-mono text-xs leading-5 text-card-foreground">
                  {displayResult.html}
                </pre>
              )}
              {activeViewMode === "markdown" && displayResult.markdown && (
                <MarkdownViewer content={displayResult.markdown} />
              )}
              {activeViewMode === "json" && displayResult.json && (
                <JsonViewer value={displayResult.json} />
              )}
              {activeViewMode === "document" && displayResult.document && (
                <JsonViewer value={displayResult.document} collapsed={3} />
              )}
              {activeViewMode === "raw" && displayResult.raw && (
                <div className="w-full">
                  {typeof displayResult.raw === "object" ? (
                    <JsonViewer value={displayResult.raw} collapsed={3} />
                  ) : (
                    <pre className="whitespace-pre-wrap font-mono text-xs leading-5 text-card-foreground">
                      {String(displayResult.raw)}
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
