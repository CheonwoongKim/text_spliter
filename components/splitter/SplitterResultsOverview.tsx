"use client";

import { ArrowRight, Trash2 } from "lucide-react";
import { Button } from "@/components/shared/Button";
import DataTable from "@/components/shared/DataTable";
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
          <p className="mt-1 text-xs text-muted-foreground">
            Every run uses the same source text. Split again with different settings to add a row.
            {anyProvenance
              ? " Provenance shows how many chunks can be scored against page evidence."
              : " Chunk a parser result to compare page provenance as well."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onClearRuns}>
          <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          Clear runs
        </Button>
      </div>

      <DataTable
        caption="청킹 실행 비교"
        minWidth={840}
        rows={runs}
        rowKey={(run) => run.id}
        isSelected={(run) => run.id === selectedRunId}
        columns={[
          {
            key: "config",
            header: "Configuration",
            width: "minmax(190px,1.4fr)",
            render: (run, index) => {
              const metric = metrics[index];
              const badges = [
                fewestChunks.includes(run.id) ? "Fewest chunks" : null,
                mostEven.includes(run.id) ? "Most even" : null,
                cleanestBoundaries.includes(run.id) ? "Cleanest cuts" : null,
              ].filter((badge): badge is string => Boolean(badge));
              return (
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-card-foreground">
                    {describeSplitterRun(run)}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {badges.length > 0 ? badges.join(" · ") : formatDuration(metric.processingTime)}
                  </p>
                </div>
              );
            },
          },
          { key: "chunks", header: "Chunks", width: "84px",
            render: (_run, index) => metrics[index].totalChunks },
          { key: "length", header: "Length min/med/max", width: "minmax(150px,1fr)",
            render: (_run, index) =>
              `${metrics[index].minLength} / ${metrics[index].medianLength} / ${metrics[index].maxLength}` },
          { key: "evenness", header: "Evenness", width: "96px",
            title: "Standard deviation of chunk length. Lower is more uniform.",
            render: (_run, index) => `±${metrics[index].lengthStdDev}` },
          { key: "cuts", header: "Cut mid-text", width: "104px",
            title: "Chunks that end mid-sentence",
            render: (_run, index) => percent(metrics[index].brokenBoundaryRatio) },
          { key: "provenance", header: "Provenance", width: "112px",
            title: "Chunks carrying page provenance for retrieval scoring",
            render: (_run, index) => metrics[index].provenanceCoverage > 0
              ? percent(metrics[index].provenanceCoverage) : "-" },
          {
            key: "detail",
            header: "Result",
            width: "92px",
            render: (run) => (
              <Button variant="ghost" size="sm" className="px-0"
                onClick={() => onOpenRun(run.id)}
                rightIcon={<ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />}>
                상세
              </Button>
            ),
          },
        ]}
      />
    </div>
  );
}

export default memo(SplitterResultsOverview);
