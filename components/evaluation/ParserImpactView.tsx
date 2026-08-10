"use client";

import { memo, useMemo, useState } from "react";
import { Select } from "@/components/shared/FormFields";

import DataTable from "@/components/shared/DataTable";
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
            <span className="text-2xs text-muted-foreground">지표</span>
            <Select fieldSize="sm" className="text-2xs" value={metricKey} onChange={(event) => setMetricKey(event.target.value as DeterministicMetricKey)}>
              {COMPARABLE_METRICS.map((metric) => (
                <option key={metric.key} value={metric.key}>{metric.label}</option>
              ))}
            </Select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-2xs text-muted-foreground">Baseline</span>
            <Select fieldSize="sm" className="text-2xs" value={comparison.baselineParser || ""} onChange={(event) => setBaseline(event.target.value || null)}>
              {comparison.parsers.map((entry) => (
                <option key={entry.parser} value={entry.parser}>{entry.parser}</option>
              ))}
            </Select>
          </label>
        </div>
      </div>

      <DataTable
        caption="파서별 검색 품질"
        minWidth={560}
        rows={comparison.parsers}
        rowKey={(entry) => entry.parser}
        isSelected={(entry) => entry.isBaseline}
        columns={[
          {
            key: "parser",
            header: "Parser",
            width: "minmax(160px,1.4fr)",
            render: (entry) => (
              <p className="truncate text-xs font-medium text-card-foreground">{entry.parser}</p>
            ),
          },
          {
            key: "cases",
            header: "Cases",
            width: "92px",
            render: (entry) => entry.succeededCount,
          },
          {
            key: "average",
            header: "Average",
            width: "112px",
            render: (entry) => formatAverage(
              entry.metrics.find((item) => item.key === metricKey)?.average ?? null,
            ),
          },
          {
            key: "baseline",
            header: "Baseline",
            width: "120px",
            render: (entry) => (
              <span className="text-muted-foreground">
                {formatAverage(
                  entry.metrics.find((item) => item.key === metricKey)?.baselineAverage ?? null,
                )}
              </span>
            ),
          },
          {
            key: "change",
            header: "Change",
            width: "minmax(120px,1fr)",
            render: (entry) => {
              const metric = entry.metrics.find((item) => item.key === metricKey);
              const improved = !entry.isBaseline && (metric?.delta ?? 0) > 0;
              const regressed = !entry.isBaseline && (metric?.delta ?? 0) < 0;
              return (
                <span className={
                  entry.reliable && improved
                    ? "text-success"
                    : entry.reliable && regressed
                      ? "text-danger"
                      : "text-muted-foreground"
                }>
                  {describeParserDelta(entry, metricKey)}
                </span>
              );
            },
          },
        ]}
      />

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
