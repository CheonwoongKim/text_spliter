"use client";

import { ArrowRight, Trash2 } from "lucide-react";
import { memo, useMemo } from "react";
import {
  bestRunIds,
  compareSplitterRuns,
  describeSplitterRun,
  type SplitterRun,
} from "@/lib/splitter-comparison";

interface SplitterResultsOverviewProps {
  runs: SplitterRun[];
  selectedRunId?: string;
  onOpenRun: (runId: string) => void;
  onClearRuns: () => void;
}

const GRID_COLUMNS =
  "grid-cols-[minmax(190px,1.4fr)_84px_minmax(150px,1fr)_96px_104px_112px_92px]";

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatDuration(milliseconds: number): string {
  return milliseconds < 1000 ? `${milliseconds} ms` : `${(milliseconds / 1000).toFixed(2)} s`;
}

function SplitterResultsOverview({
  runs,
  selectedRunId,
  onOpenRun,
  onClearRuns,
}: SplitterResultsOverviewProps) {
  const metrics = useMemo(() => compareSplitterRuns(runs), [runs]);
  const fewestChunks = useMemo(() => bestRunIds(metrics, "totalChunks", "lower"), [metrics]);
  const mostEven = useMemo(() => bestRunIds(metrics, "lengthStdDev", "lower"), [metrics]);
  const cleanestBoundaries = useMemo(
    () => bestRunIds(metrics, "brokenBoundaryRatio", "lower"),
    [metrics],
  );
  const anyProvenance = metrics.some((metric) => metric.provenanceCoverage > 0);

  return (
    <div className="h-full overflow-auto pb-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-medium text-card-foreground">Chunking runs</h3>
          <p className="mt-1 text-2xs text-muted-foreground">
            Every run uses the same source text. Split again with different settings to add a row.
            {anyProvenance
              ? " Provenance shows how many chunks can be scored against page evidence."
              : " Chunk a parser result to compare page provenance as well."}
          </p>
        </div>
        <button
          type="button"
          onClick={onClearRuns}
          className="flex h-control-sm items-center gap-2 rounded-lg border border-border px-3 text-2xs
                   font-medium text-card-foreground transition-smooth hover:border-border-darkest"
        >
          <Trash2 className="h-4 w-4" strokeWidth={1} aria-hidden="true" />
          Clear runs
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <div className="min-w-[840px]">
          <div className={`grid ${GRID_COLUMNS} bg-upload-zone`}>
            <div className="px-3 py-2 text-2xs font-medium text-muted-foreground">Configuration</div>
            <div className="border-l border-border-subtle px-3 py-2 text-2xs font-medium text-muted-foreground">Chunks</div>
            <div className="border-l border-border-subtle px-3 py-2 text-2xs font-medium text-muted-foreground">Length min/med/max</div>
            <div className="border-l border-border-subtle px-3 py-2 text-2xs font-medium text-muted-foreground">Evenness</div>
            <div className="border-l border-border-subtle px-3 py-2 text-2xs font-medium text-muted-foreground">Cut mid-text</div>
            <div className="border-l border-border-subtle px-3 py-2 text-2xs font-medium text-muted-foreground">Provenance</div>
            <div className="border-l border-border-subtle px-3 py-2 text-2xs font-medium text-muted-foreground">Result</div>
          </div>

          {runs.map((run, index) => {
            const metric = metrics[index];
            const selected = selectedRunId === run.id;
            const badges = [
              fewestChunks.includes(run.id) ? "Fewest chunks" : null,
              mostEven.includes(run.id) ? "Most even" : null,
              cleanestBoundaries.includes(run.id) ? "Cleanest cuts" : null,
            ].filter((badge): badge is string => Boolean(badge));

            return (
              <div
                key={run.id}
                className={`grid ${GRID_COLUMNS} border-t border-border-subtle
                           ${selected ? "bg-upload-zone" : "bg-card"}`}
              >
                <div className="min-w-0 px-3 py-3">
                  <p className="truncate text-xs font-medium text-card-foreground">
                    {describeSplitterRun(run)}
                  </p>
                  <p className="mt-1 truncate text-2xs text-muted-foreground">
                    {badges.length > 0 ? badges.join(" · ") : formatDuration(metric.processingTime)}
                  </p>
                </div>
                <div className="flex items-center border-l border-border-subtle px-3 py-3 text-2xs text-card-foreground">
                  {metric.totalChunks}
                </div>
                <div className="flex items-center border-l border-border-subtle px-3 py-3 text-2xs text-card-foreground">
                  {metric.minLength} / {metric.medianLength} / {metric.maxLength}
                </div>
                <div
                  className="flex items-center border-l border-border-subtle px-3 py-3 text-2xs text-card-foreground"
                  title="Standard deviation of chunk length. Lower is more uniform."
                >
                  ±{metric.lengthStdDev}
                </div>
                <div
                  className="flex items-center border-l border-border-subtle px-3 py-3 text-2xs text-card-foreground"
                  title="Chunks that end mid-sentence"
                >
                  {percent(metric.brokenBoundaryRatio)}
                </div>
                <div
                  className="flex items-center border-l border-border-subtle px-3 py-3 text-2xs text-card-foreground"
                  title="Chunks carrying page provenance for retrieval scoring"
                >
                  {metric.provenanceCoverage > 0 ? percent(metric.provenanceCoverage) : "-"}
                </div>
                <div className="flex items-center border-l border-border-subtle px-3 py-3">
                  <button
                    type="button"
                    onClick={() => onOpenRun(run.id)}
                    className="flex items-center gap-1 text-2xs font-medium text-card-foreground transition-smooth
                             hover:opacity-hover"
                  >
                    Detail
                    <ArrowRight className="h-4 w-4" strokeWidth={1} aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default memo(SplitterResultsOverview);
