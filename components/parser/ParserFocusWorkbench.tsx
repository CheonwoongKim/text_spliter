"use client";

import { AlertTriangle, Check, ChevronRight, FileText, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  buildParserFocusAreas,
  differenceSegments,
  selectParserSpotCheckAreas,
  type ParserFocusArea,
  type ParserFocusVariantGroup,
} from "@/lib/parser-focus-analysis";
import type { DocumentTable } from "@/lib/document-ir";
import type { ParseResponse } from "@/lib/types";

interface ParserFocusWorkbenchProps {
  runs: ParseResponse[];
  selectedFile: File | null;
  initialAreaId?: string;
  sampleMode?: boolean;
  onOpenFullCompare?: () => void;
  reviews: Record<string, ParserAreaReview>;
  onReviewChange: (areaId: string, review: ParserAreaReview) => void;
}

type FocusFilter = "issues" | "spot-check" | "all";
export type ParserReviewOutcome = "pass" | "partial" | "fail" | "unclear";

export interface ParserAreaReview {
  outcome?: ParserReviewOutcome;
  groupId?: string;
  note: string;
}

const REVIEW_OUTCOMES: Array<{
  id: ParserReviewOutcome;
  label: string;
  description: string;
}> = [
  { id: "pass", label: "Pass", description: "Matches the original" },
  { id: "partial", label: "Partial", description: "Requires correction" },
  { id: "fail", label: "Fail", description: "Missing or incorrect" },
  { id: "unclear", label: "Unclear", description: "Cannot confirm" },
];

function severityLabel(area: ParserFocusArea): string {
  if (!area.hasDisagreement) return "Spot check";
  return area.severity === "error" ? "High attention" : "Review";
}

function alignmentMethodLabel(area: ParserFocusArea): string {
  if (area.alignmentMethod === "source-region") return "Source position";
  if (area.alignmentMethod === "content") return "Content similarity";
  return "Reading order";
}

function reviewCriteria(area: ParserFocusArea): string {
  if (area.blockType === "table") {
    return "Check rows, columns, merged cells, headers, numeric values, and units.";
  }
  if (["figure", "chart", "diagram"].includes(area.blockType)) {
    return "Check visual meaning, labels, values, captions, and nearby text relationships.";
  }
  if (area.blockType === "formula") {
    return "Check symbols, superscripts, subscripts, operators, and reading order.";
  }
  if (["title", "section-header", "list", "list-item"].includes(area.blockType)) {
    return "Check text fidelity, hierarchy, list structure, and reading order.";
  }
  return "Check missing text, characters, numbers, units, punctuation, and reading context.";
}

function sourcePosition(area: ParserFocusArea): string | null {
  const box = area.region?.boundingBox;
  if (!box) return null;
  const values = [box.x, box.y, box.width, box.height].map((value) => (
    Number.isInteger(value) ? String(value) : value.toFixed(3)
  ));
  return `x ${values[0]} · y ${values[1]} · w ${values[2]} · h ${values[3]}`;
}

function TableComparison({ table, fallback }: { table?: DocumentTable; fallback: string }) {
  if (!table?.cells.length || (table.rowCount || 0) > 30 || (table.columnCount || 0) > 20) {
    return (
      <pre className="whitespace-pre-wrap font-mono text-2xs leading-5 text-card-foreground">
        {fallback}
      </pre>
    );
  }

  const rowCount = table.rowCount
    ?? Math.max(0, ...table.cells.map((cell) => cell.rowIndex + (cell.rowSpan || 1)));
  const rows = Array.from({ length: rowCount }, (_, rowIndex) => (
    table.cells
      .filter((cell) => cell.rowIndex === rowIndex)
      .sort((left, right) => left.columnIndex - right.columnIndex)
  ));

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-2xs">
        <tbody>
          {rows.map((cells, rowIndex) => (
            <tr key={rowIndex}>
              {cells.map((cell) => (
                <td
                  key={`${cell.rowIndex}-${cell.columnIndex}`}
                  rowSpan={cell.rowSpan}
                  colSpan={cell.columnSpan}
                  className={`border border-border px-2 py-2 align-top text-card-foreground ${
                    cell.isHeader ? "bg-upload-zone font-medium" : "bg-card"
                  }`}
                >
                  {cell.text || ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResultGroupContent({
  area,
  group,
}: {
  area: ParserFocusArea;
  group: ParserFocusVariantGroup;
}) {
  if (group.missing) {
    return <p className="text-2xs font-medium text-danger">These engines omitted the selected area.</p>;
  }
  if (area.blockType === "table") {
    return <TableComparison table={group.table} fallback={group.content} />;
  }
  const segments = differenceSegments(area.consensusContent, group.content);
  return (
    <pre className="whitespace-pre-wrap font-mono text-2xs leading-5 text-card-foreground">
      {segments.map((segment, index) => segment.changed ? (
        <mark key={`${group.id}-${index}`} className="bg-warning-surface text-card-foreground">
          {segment.text}
        </mark>
      ) : segment.text)}
    </pre>
  );
}

export default function ParserFocusWorkbench({
  runs,
  selectedFile,
  initialAreaId,
  sampleMode = false,
  onOpenFullCompare,
  reviews,
  onReviewChange,
}: ParserFocusWorkbenchProps) {
  const areas = useMemo(() => buildParserFocusAreas(runs), [runs]);
  const issueAreas = useMemo(() => areas.filter((area) => area.hasDisagreement), [areas]);
  const spotCheckAreas = useMemo(() => selectParserSpotCheckAreas(areas), [areas]);
  const pageNumbers = useMemo(
    () => [...new Set(areas.map((area) => area.pageNumber))].sort((left, right) => left - right),
    [areas],
  );
  const [focusFilter, setFocusFilter] = useState<FocusFilter>("issues");
  const [pageFilter, setPageFilter] = useState<number | "all">("all");
  const [selectedAreaId, setSelectedAreaId] = useState(initialAreaId || issueAreas[0]?.id || areas[0]?.id || "");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const baseAreas = focusFilter === "issues"
    ? issueAreas
    : focusFilter === "spot-check"
      ? spotCheckAreas
      : areas;
  const visibleAreas = pageFilter === "all"
    ? baseAreas
    : baseAreas.filter((area) => area.pageNumber === pageFilter);
  const selectedArea = visibleAreas.find((area) => area.id === selectedAreaId)
    || visibleAreas[0]
    || areas.find((area) => area.id === selectedAreaId)
    || areas[0];
  const selectedReview = selectedArea
    ? reviews[selectedArea.id] || { note: "" }
    : { note: "" };
  const reviewedIssueCount = issueAreas.filter((area) => reviews[area.id]?.outcome).length;
  const reviewedAreaCount = areas.filter((area) => reviews[area.id]?.outcome).length;

  useEffect(() => {
    if (initialAreaId && areas.some((area) => area.id === initialAreaId)) {
      setSelectedAreaId(initialAreaId);
    } else if (!areas.some((area) => area.id === selectedAreaId)) {
      setSelectedAreaId(issueAreas[0]?.id || areas[0]?.id || "");
    }
  }, [areas, initialAreaId, issueAreas, selectedAreaId]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const updateReview = (updates: Partial<ParserAreaReview>) => {
    if (!selectedArea) return;
    const existing = reviews[selectedArea.id] || { note: "" };
    onReviewChange(selectedArea.id, { ...existing, ...updates });
  };

  if (areas.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <FileText className="mb-3 h-icon-md w-icon-md text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
        <p className="text-xs font-medium text-card-foreground">No comparable document areas</p>
        <p className="mt-1 text-2xs text-muted-foreground">
          The selected engines did not return block-level or text output.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden pb-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-2xs text-muted-foreground">Issue review</p>
          <p className="mt-1 text-base font-semibold text-card-foreground">
            {reviewedIssueCount}<span className="text-2xs font-normal text-muted-foreground"> / {issueAreas.length}</span>
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-2xs text-muted-foreground">Agreement spot checks</p>
          <p className="mt-1 text-base font-semibold text-card-foreground">{spotCheckAreas.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-2xs text-muted-foreground">Total reviewed</p>
          <p className="mt-1 text-base font-semibold text-card-foreground">
            {reviewedAreaCount}<span className="text-2xs font-normal text-muted-foreground"> / {areas.length}</span>
          </p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-lg border border-border bg-card lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
          <div className="border-b border-border p-3">
            <p className="text-xs font-medium text-card-foreground">Evidence queue</p>
            <p className="mt-1 text-2xs text-muted-foreground">
              Review disagreements first, then sample agreed areas to catch shared errors.
            </p>
            <div className="mt-3 grid grid-cols-3 rounded-lg bg-muted p-1">
              {([
                ["issues", "Issues"],
                ["spot-check", "Spot check"],
                ["all", "All"],
              ] as Array<[FocusFilter, string]>).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFocusFilter(id)}
                  className={`rounded-sm px-1 py-1 text-2xs font-medium transition-smooth ${
                    focusFilter === id ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="mt-3 block">
              <span className="mb-2 block text-2xs text-muted-foreground">Page</span>
              <select
                value={pageFilter}
                onChange={(event) => setPageFilter(event.target.value === "all" ? "all" : Number(event.target.value))}
                className="h-control-sm w-full rounded-lg border border-border bg-card px-2 text-2xs text-card-foreground focus-ring"
              >
                <option value="all">All pages</option>
                {pageNumbers.map((pageNumber) => (
                  <option key={pageNumber} value={pageNumber}>Page {pageNumber}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            {visibleAreas.length > 0 ? visibleAreas.map((area) => {
              const selected = area.id === selectedArea?.id;
              const reviewed = Boolean(reviews[area.id]?.outcome);
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => setSelectedAreaId(area.id)}
                  className={`flex w-full items-start gap-2 border-b border-border-subtle px-3 py-3 text-left transition-smooth ${
                    selected ? "bg-upload-zone" : "hover:bg-upload-zone"
                  }`}
                >
                  {reviewed ? (
                    <Check className="mt-1 h-4 w-4 shrink-0 text-success" strokeWidth={1.5} aria-hidden="true" />
                  ) : area.hasDisagreement ? (
                    <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-warning" strokeWidth={1.5} aria-hidden="true" />
                  ) : (
                    <FileText className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-2xs font-medium text-card-foreground">
                      Page {area.pageNumber} · {area.label}
                    </span>
                    <span className="mt-1 block truncate text-2xs text-muted-foreground">
                      {reviewed
                        ? `${reviews[area.id]?.outcome?.toUpperCase()} · Reviewed`
                        : `${area.groups.length} result group${area.groups.length === 1 ? "" : "s"}`}
                    </span>
                  </span>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                </button>
              );
            }) : (
              <div className="p-4 text-center">
                <p className="text-2xs text-muted-foreground">No areas match this filter.</p>
                <button
                  type="button"
                  onClick={() => setFocusFilter("all")}
                  className="mt-2 text-2xs font-medium text-card-foreground"
                >
                  Show all areas
                </button>
              </div>
            )}
          </div>
        </aside>

        {selectedArea && (
          <section className="scrollbar-thin min-h-0 overflow-y-auto">
            <div className="sticky top-0 border-b border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xs font-medium text-card-foreground">
                      Page {selectedArea.pageNumber} · {selectedArea.label}
                    </h3>
                    <span className={`rounded-sm px-2 py-1 text-2xs ${
                      selectedArea.hasDisagreement
                        ? "bg-warning-surface text-warning"
                        : "bg-success-surface text-success"
                    }`}>
                      {severityLabel(selectedArea)}
                    </span>
                  </div>
                  <p className="mt-1 text-2xs text-muted-foreground">
                    {selectedArea.reasons.join(" · ")}
                  </p>
                  <p className="mt-1 text-2xs text-muted-foreground">
                    Aligned by {alignmentMethodLabel(selectedArea)} · {Math.round(selectedArea.alignmentConfidence * 100)}% alignment confidence
                  </p>
                </div>
                {onOpenFullCompare && (
                  <button
                    type="button"
                    onClick={onOpenFullCompare}
                    className="h-control-sm rounded-lg border border-border px-3 text-2xs font-medium text-card-foreground
                             transition-smooth hover:border-border-darkest"
                  >
                    Open full comparison
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-4 p-4 xl:grid-cols-[minmax(220px,0.8fr)_minmax(0,2fr)]">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                  <h4 className="text-2xs font-medium text-card-foreground">Original evidence</h4>
                </div>
                <div className="overflow-hidden rounded-lg border border-border bg-upload-zone">
                  <div className="border-b border-border px-3 py-2">
                    <p className="truncate text-2xs font-medium text-card-foreground">
                      {selectedFile?.name || (sampleMode ? "product-brief.pdf" : "Original document")}
                    </p>
                    <p className="mt-1 text-2xs text-muted-foreground">
                      Page {selectedArea.pageNumber}
                      {sourcePosition(selectedArea) ? ` · ${sourcePosition(selectedArea)}` : " · Detected block position"}
                    </p>
                  </div>
                  {previewUrl && selectedFile?.type === "application/pdf" ? (
                    <iframe
                      src={`${previewUrl}#page=${selectedArea.pageNumber}`}
                      className="h-[440px] w-full"
                      title={`Original PDF page ${selectedArea.pageNumber}`}
                    />
                  ) : previewUrl && selectedFile?.type.startsWith("image/") ? (
                    <div className="flex min-h-[360px] items-center justify-center p-3">
                      <img src={previewUrl} alt={selectedFile.name} className="max-h-[440px] max-w-full object-contain" />
                    </div>
                  ) : (
                    <div className="min-h-[280px] p-4">
                      {sampleMode ? (
                        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                          <p className="text-xs font-medium text-card-foreground">2026 Product Brief</p>
                          <p className="mt-3 whitespace-pre-wrap text-2xs leading-5 text-card-foreground">
                            {selectedArea.consensusContent || "Select a document area to inspect."}
                          </p>
                        </div>
                      ) : (
                        <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
                          <FileText className="mb-3 h-icon-md w-icon-md text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                          <p className="text-2xs font-medium text-card-foreground">Original preview unavailable</p>
                          <p className="mt-1 text-2xs text-muted-foreground">
                            Verify this page and detected block position in the source file.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="min-w-0">
                <div className="mb-2">
                  <h4 className="text-2xs font-medium text-card-foreground">Distinct result groups</h4>
                  <p className="mt-1 text-2xs text-muted-foreground">
                    Engines with the same normalized content are grouped. Highlighting shows differences from the largest group.
                  </p>
                </div>
                <div className={`mb-3 rounded-lg border p-3 ${
                  selectedArea.majorityGroupId
                    ? "border-success-border bg-success-surface"
                    : "border-warning-border bg-warning-surface"
                }`}>
                  <p className="text-2xs font-medium text-card-foreground">Triage finding</p>
                  <p className="mt-1 text-2xs leading-4 text-muted-foreground">
                    {selectedArea.majorityGroupId
                      ? `${selectedArea.agreementCount} of ${selectedArea.engineCount} engines returned the same normalized result. This is not proof of correctness; verify it against the original.`
                      : "No majority result exists. Automated comparison cannot determine correctness, so original evidence review is required."}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
                  {selectedArea.groups.map((group) => {
                    const selected = selectedReview.groupId === group.id;
                    const isMajority = selectedArea.majorityGroupId === group.id;
                    return (
                      <article
                        key={group.id}
                        className={`overflow-hidden rounded-lg border bg-card ${
                          selected ? "border-surface-foreground" : "border-border"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 border-b border-border bg-upload-zone p-3">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-card-foreground">
                              {group.missing ? "Omitted result" : `Result group · ${group.engineCount} engine${group.engineCount === 1 ? "" : "s"}`}
                            </p>
                            <p className="mt-1 text-2xs text-muted-foreground">
                              {group.engines.join(" · ")}{isMajority ? " · Majority" : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={group.missing}
                            onClick={() => updateReview({ groupId: group.id })}
                            className={`h-control-sm shrink-0 rounded-lg px-3 text-2xs font-medium transition-smooth ${
                              selected
                                ? "bg-surface-foreground text-surface"
                                : "border border-border text-card-foreground hover:border-border-darkest"
                            } disabled:cursor-not-allowed disabled:opacity-disabled`}
                          >
                            {selected ? "Selected" : "Select result"}
                          </button>
                        </div>
                        <div className={`min-h-[160px] p-3 ${group.missing ? "bg-danger-surface" : ""}`}>
                          <ResultGroupContent area={selectedArea} group={group} />
                        </div>
                      </article>
                    );
                  })}
                </div>

                <section className="mt-4 rounded-lg border border-border bg-card p-4">
                  <h4 className="text-xs font-medium text-card-foreground">Your assessment</h4>
                  <p className="mt-1 text-2xs text-muted-foreground">
                    Judge only against the original. Engine agreement alone is not a quality score.
                  </p>
                  <p className="mt-2 rounded-lg bg-upload-zone px-3 py-2 text-2xs text-card-foreground">
                    {reviewCriteria(selectedArea)}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 2xl:grid-cols-4">
                    {REVIEW_OUTCOMES.map((outcome) => {
                      const selected = selectedReview.outcome === outcome.id;
                      return (
                        <button
                          key={outcome.id}
                          type="button"
                          onClick={() => updateReview({ outcome: outcome.id })}
                          className={`rounded-lg border p-3 text-left transition-smooth ${
                            selected
                              ? "border-surface-foreground bg-upload-zone"
                              : "border-border hover:border-border-darkest"
                          }`}
                        >
                          <span className="block text-2xs font-medium text-card-foreground">{outcome.label}</span>
                          <span className="mt-1 block text-2xs text-muted-foreground">{outcome.description}</span>
                        </button>
                      );
                    })}
                  </div>
                  <label className="mt-3 block">
                    <span className="mb-2 block text-2xs text-muted-foreground">Review note</span>
                    <textarea
                      value={selectedReview.note}
                      onChange={(event) => updateReview({ note: event.target.value })}
                      placeholder="Describe the error or correction needed"
                      rows={3}
                      className="w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-xs
                               text-card-foreground placeholder-light focus-ring"
                    />
                  </label>
                </section>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
