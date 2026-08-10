"use client";

import { AlertTriangle, ArrowRight, Check, GitCompare, ListTree } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { memo, useMemo } from "react";
import { buildParserFocusAreas } from "@/lib/parser-focus-analysis";
import { resolveHandoffText } from "@/lib/workbench-handoff";
import type { ParseResponse } from "@/lib/types";

interface ParserResultsOverviewProps {
  runs: ParseResponse[];
  loading: boolean;
  selectedRunId?: string;
  onOpenRun: (runId: string) => void;
  onCompare: () => void;
  onOpenFocus: (areaId?: string) => void;
  onUseInSplitter?: (runIndex: number) => void;
}

export function parserRunId(run: ParseResponse, index: number): string {
  return run.run?.id || `legacy-run-${index}`;
}

export function parserRunFormats(run: ParseResponse): string[] {
  return [
    run.text ? "Text" : null,
    run.html ? "HTML" : null,
    run.markdown ? "Markdown" : null,
    run.json ? "JSON" : null,
    run.document ? "Document IR" : null,
    run.raw ? "Raw" : null,
  ].filter((format): format is string => Boolean(format));
}

function formatProcessingTime(milliseconds?: number): string {
  if (milliseconds === undefined) return "-";
  if (milliseconds < 1000) return `${milliseconds} ms`;
  return `${(milliseconds / 1000).toFixed(2)} s`;
}

function ParserResultsOverview({
  runs,
  loading,
  selectedRunId,
  onOpenRun,
  onCompare,
  onOpenFocus,
  onUseInSplitter,
}: ParserResultsOverviewProps) {
  const focusAreas = useMemo(
    () => buildParserFocusAreas(runs).filter((area) => area.hasDisagreement),
    [runs],
  );
  const fastestRunId = useMemo(() => {
    const timedRuns = runs
      .map((run, index) => ({
        id: parserRunId(run, index),
        time: run.metadata?.processingTime,
      }))
      .filter((entry): entry is { id: string; time: number } => entry.time !== undefined);

    return timedRuns.reduce<{ id: string; time: number } | null>(
      (fastest, entry) => !fastest || entry.time < fastest.time ? entry : fastest,
      null,
    )?.id;
  }, [runs]);

  return (
    <div className="h-full overflow-auto pb-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-medium text-card-foreground">Areas that need review</h3>
          <p className="mt-1 text-2xs text-muted-foreground">
            Start with document areas where engines omitted content or returned different results.
          </p>
        </div>
        {runs.length >= 2 && (
          <Button variant="primary" size="sm" onClick={() => onOpenFocus(focusAreas[0]?.id)}>
            {focusAreas.length > 0 ? (
              <AlertTriangle className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <Check className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            )}
            {focusAreas.length > 0
              ? `Review ${focusAreas.length} area${focusAreas.length === 1 ? "" : "s"}`
              : "Inspect document areas"}
          </Button>
        )}
      </div>

      <div className="mb-6 overflow-hidden rounded-lg border border-border">
        {focusAreas.length > 0 ? focusAreas.slice(0, 5).map((area) => (
          <button
            key={area.id}
            type="button"
            onClick={() => onOpenFocus(area.id)}
            className="flex w-full items-center gap-3 border-b border-border-subtle bg-card px-3 py-3 text-left
                     transition-smooth last:border-b-0 hover:bg-upload-zone"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning" strokeWidth={1.5} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-card-foreground">
                Page {area.pageNumber} · {area.label}
              </span>
              <span className="mt-1 block truncate text-2xs text-muted-foreground">
                {area.reasons.join(" · ")} · {area.agreementCount}/{area.engineCount} normalized agreement
              </span>
            </span>
            <span className="text-2xs font-medium text-card-foreground">Review</span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
          </button>
        )) : (
          <div className="flex items-start gap-3 bg-card p-4">
            <Check className="h-4 w-4 shrink-0 text-success" strokeWidth={1.5} aria-hidden="true" />
            <div>
              <p className="text-xs font-medium text-card-foreground">No exact block-level differences found</p>
              <p className="mt-1 text-2xs text-muted-foreground">
                You can still open Focus review and inspect any page or document area manually.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-medium text-card-foreground">Engine results</h3>
          <p className="mt-1 text-2xs text-muted-foreground">
            Open a complete result only when you need to inspect one engine in full.
          </p>
        </div>
        {runs.length >= 2 && (
          <Button variant="outline" size="sm" onClick={onCompare}>
            <GitCompare className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            Full comparison
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <div className="min-w-[892px]">
          <div className="grid grid-cols-[minmax(200px,1.5fr)_minmax(92px,0.6fr)_minmax(180px,1.2fr)_80px_100px_96px_132px] bg-upload-zone">
            <div className="px-3 py-2 text-2xs font-medium text-muted-foreground">엔진</div>
            <div className="border-l border-border-subtle px-3 py-2 text-2xs font-medium text-muted-foreground">Role</div>
            <div className="border-l border-border-subtle px-3 py-2 text-2xs font-medium text-muted-foreground">출력</div>
            <div className="border-l border-border-subtle px-3 py-2 text-2xs font-medium text-muted-foreground">페이지</div>
            <div className="border-l border-border-subtle px-3 py-2 text-2xs font-medium text-muted-foreground">처리 중</div>
            <div className="border-l border-border-subtle px-3 py-2 text-2xs font-medium text-muted-foreground">결과</div>
            <div className="border-l border-border-subtle px-3 py-2 text-2xs font-medium text-muted-foreground">Next step</div>
          </div>

          {runs.map((run, index) => {
            const id = parserRunId(run, index);
            const formats = parserRunFormats(run);
            const role = run.run?.role === "primary" ? "Primary" : "Additional";
            const engine = run.run?.engineId || run.metadata?.parserType || `Run ${index + 1}`;
            const model = run.run?.model || run.run?.version;
            const pageCount = run.document?.statistics?.pageCount || run.metadata?.pageCount;
            const selected = selectedRunId === id;
            const chunkable = Boolean(resolveHandoffText(run).trim());

            return (
              <div
                key={id}
                className={`grid grid-cols-[minmax(200px,1.5fr)_minmax(92px,0.6fr)_minmax(180px,1.2fr)_80px_100px_96px_132px]
                           border-t border-border-subtle ${selected ? "bg-upload-zone" : "bg-card"}`}
              >
                <div className="min-w-0 px-3 py-3">
                  <p className="truncate text-xs font-medium text-card-foreground">{engine}</p>
                  <p className="mt-1 truncate text-2xs text-muted-foreground">
                    {model || (id === fastestRunId ? "Fastest completed result" : "Completed")}
                    {model && id === fastestRunId ? " · Fastest" : ""}
                  </p>
                </div>
                <div className="flex items-center border-l border-border-subtle px-3 py-3">
                  <span className="rounded-sm bg-muted px-2 py-1 text-2xs text-muted-foreground">
                    {role}
                  </span>
                </div>
                <div className="flex min-w-0 items-center border-l border-border-subtle px-3 py-3">
                  <p className="truncate text-2xs text-card-foreground">
                    {formats.length > 0 ? formats.join(" · ") : "No supported output"}
                  </p>
                </div>
                <div className="flex items-center border-l border-border-subtle px-3 py-3 text-2xs text-card-foreground">
                  {pageCount || "-"}
                </div>
                <div className="flex items-center border-l border-border-subtle px-3 py-3 text-2xs text-card-foreground">
                  {formatProcessingTime(run.metadata?.processingTime)}
                </div>
                <div className="flex items-center border-l border-border-subtle px-3 py-3">
                  <button
                    type="button"
                    onClick={() => onOpenRun(id)}
                    className="flex items-center gap-1 text-2xs font-medium text-card-foreground transition-smooth
                             hover:opacity-hover"
                  >
                    상세
                    <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </div>
                <div className="flex items-center border-l border-border-subtle px-3 py-3">
                  <button
                    type="button"
                    onClick={() => onUseInSplitter?.(index)}
                    disabled={!onUseInSplitter || !chunkable}
                    title={chunkable
                      ? `Chunk the ${engine} result in the splitter`
                      : "This engine returned no text to chunk"}
                    className="flex items-center gap-1 text-2xs font-medium text-card-foreground transition-smooth
                             hover:opacity-hover disabled:cursor-not-allowed disabled:opacity-disabled"
                  >
                    <ListTree className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                    Split text
                  </button>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="border-t border-border-subtle bg-card px-3 py-3">
              <p className="text-2xs text-muted-foreground">
                Other selected engines are still processing. Completed results appear here automatically.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ParserResultsOverview);
