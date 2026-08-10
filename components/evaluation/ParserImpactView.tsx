"use client";

import { memo, useMemo, useState } from "react";

import type { MetricBreakdownRow } from "@/lib/evaluation-metrics";
import type { DeterministicMetricKey } from "@/lib/types";
import {
  compareParserRetrieval,
  describeParserDelta,
} from "@/lib/parser-retrieval-delta";

interface ParserImpactViewProps {
  parserBreakdown: MetricBreakdownRow[];
}

const COMPARABLE_METRICS: Array<{ key: DeterministicMetricKey; label: string }> = [
  { key: "recallAtK", label: "Recall@K" },
  { key: "precisionAtK", label: "Precision@K" },
  { key: "mrr", label: "MRR" },
  { key: "ndcgAtK", label: "nDCG@K" },
];

function formatAverage(value: number | null): string {
  return value === null ? "-" : value.toFixed(3);
}

function ParserImpactView({ parserBreakdown }: ParserImpactViewProps) {
  const [metricKey, setMetricKey] = useState<DeterministicMetricKey>("recallAtK");
  const [baseline, setBaseline] = useState<string | null>(null);
  const comparison = useMemo(
    () => compareParserRetrieval(parserBreakdown, baseline),
    [baseline, parserBreakdown],
  );

  if (comparison.parsers.length === 0) {
    return (
      <p className="text-2xs text-muted-foreground">
        No chunk in this run records the parser that produced it, so retrieval quality cannot be
        attributed to a parser yet.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-2xs text-muted-foreground">
          Retrieval quality grouped by the parser that produced the chunks. A delta is the change
          against the baseline parser, not a verdict.
        </p>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            <span className="text-2xs text-muted-foreground">Metric</span>
            <select
              value={metricKey}
              onChange={(event) => setMetricKey(event.target.value as DeterministicMetricKey)}
              className="h-control-sm rounded-lg border border-border bg-surface px-2 text-2xs text-card-foreground"
            >
              {COMPARABLE_METRICS.map((metric) => (
                <option key={metric.key} value={metric.key}>{metric.label}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-2xs text-muted-foreground">Baseline</span>
            <select
              value={comparison.baselineParser || ""}
              onChange={(event) => setBaseline(event.target.value || null)}
              className="h-control-sm rounded-lg border border-border bg-surface px-2 text-2xs text-card-foreground"
            >
              {comparison.parsers.map((entry) => (
                <option key={entry.parser} value={entry.parser}>{entry.parser}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-[minmax(160px,1.4fr)_92px_112px_120px_minmax(120px,1fr)] bg-upload-zone">
            <div className="px-3 py-2 text-2xs font-medium text-muted-foreground">Parser</div>
            <div className="border-l border-border-subtle px-3 py-2 text-2xs font-medium text-muted-foreground">Cases</div>
            <div className="border-l border-border-subtle px-3 py-2 text-2xs font-medium text-muted-foreground">Average</div>
            <div className="border-l border-border-subtle px-3 py-2 text-2xs font-medium text-muted-foreground">Baseline</div>
            <div className="border-l border-border-subtle px-3 py-2 text-2xs font-medium text-muted-foreground">Change</div>
          </div>

          {comparison.parsers.map((entry) => {
            const metric = entry.metrics.find((item) => item.key === metricKey);
            const change = describeParserDelta(entry, metricKey);
            const improved = !entry.isBaseline && (metric?.delta ?? 0) > 0;
            const regressed = !entry.isBaseline && (metric?.delta ?? 0) < 0;

            return (
              <div
                key={entry.parser}
                className={`grid grid-cols-[minmax(160px,1.4fr)_92px_112px_120px_minmax(120px,1fr)]
                           border-t border-border-subtle ${entry.isBaseline ? "bg-upload-zone" : "bg-card"}`}
              >
                <div className="min-w-0 px-3 py-3">
                  <p className="truncate text-xs font-medium text-card-foreground">{entry.parser}</p>
                </div>
                <div className="flex items-center border-l border-border-subtle px-3 py-3 text-2xs text-card-foreground">
                  {entry.succeededCount}
                </div>
                <div className="flex items-center border-l border-border-subtle px-3 py-3 text-2xs text-card-foreground">
                  {formatAverage(metric?.average ?? null)}
                </div>
                <div className="flex items-center border-l border-border-subtle px-3 py-3 text-2xs text-muted-foreground">
                  {formatAverage(metric?.baselineAverage ?? null)}
                </div>
                <div
                  className={`flex items-center border-l border-border-subtle px-3 py-3 text-2xs ${
                    entry.reliable && improved
                      ? "text-success"
                      : entry.reliable && regressed
                        ? "text-danger"
                        : "text-muted-foreground"
                  }`}
                >
                  {change}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {comparison.unscoredParsers.length > 0 && (
        <p className="mt-2 text-2xs text-muted-foreground">
          Some retrieved chunks carry no parser provenance and are excluded rather than merged into
          another parser&apos;s score.
        </p>
      )}
    </div>
  );
}

export default memo(ParserImpactView);
