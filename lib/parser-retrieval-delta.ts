import type { MetricBreakdownRow } from "@/lib/evaluation-metrics";
import type { DeterministicMetricKey } from "@/lib/types";

/**
 * Connects parser choice to downstream retrieval quality.
 *
 * Parser evaluation says how faithfully an engine reproduced a document.
 * Retrieval evaluation says how well answers were grounded. Neither alone
 * answers the question this workbench exists for: *does a better parse actually
 * retrieve better?* This compares the retrieval metrics of chunks grouped by the
 * parser that produced them.
 *
 * Everything here is derived from stored run metrics, so it costs nothing and
 * is reproducible. As elsewhere, no parser is declared the winner: a delta is
 * reported with the sample size behind it, and thin samples are marked.
 */

/** Below this many scored cases a delta is noise, not a signal. */
export const MIN_RELIABLE_SAMPLE = 5;

export interface ParserRetrievalDelta {
  parser: string;
  succeededCount: number;
  /** Metric averages for this parser, and the change against the baseline. */
  metrics: Array<{
    key: DeterministicMetricKey;
    average: number | null;
    baselineAverage: number | null;
    delta: number | null;
    sampleCount: number;
  }>;
  /** True when both this parser and the baseline have enough scored cases. */
  reliable: boolean;
  isBaseline: boolean;
}

export interface ParserRetrievalComparison {
  baselineParser: string | null;
  parsers: ParserRetrievalDelta[];
  /** Parsers present in the run but with no scored retrieval metric at all. */
  unscoredParsers: string[];
}

function metricEntries(row: MetricBreakdownRow): Map<string, { average: number | null; sampleCount: number }> {
  const entries = new Map<string, { average: number | null; sampleCount: number }>();

  for (const [key, value] of Object.entries(row)) {
    if (key === "key" || key === "succeededCount" || key === "successRate") continue;
    const metric = value as { average?: unknown; sampleCount?: unknown } | null;
    if (!metric || typeof metric !== "object") continue;

    entries.set(key, {
      average: typeof metric.average === "number" ? metric.average : null,
      sampleCount: typeof metric.sampleCount === "number" ? metric.sampleCount : 0,
    });
  }

  return entries;
}

function round(value: number): number {
  return Number(value.toFixed(6));
}

/**
 * Choose the baseline. An explicit choice wins; otherwise the parser with the
 * most scored cases is used, because it is the most trustworthy reference.
 */
function resolveBaseline(rows: MetricBreakdownRow[], requested?: string | null): string | null {
  if (requested && rows.some((row) => row.key === requested)) return requested;

  return rows.reduce<MetricBreakdownRow | null>(
    (best, row) => !best || row.succeededCount > best.succeededCount ? row : best,
    null,
  )?.key ?? null;
}

export function compareParserRetrieval(
  parserBreakdown: MetricBreakdownRow[],
  baselineParser?: string | null,
): ParserRetrievalComparison {
  const scored = parserBreakdown.filter((row) => row.key && row.key !== "unknown");
  const baseline = resolveBaseline(scored, baselineParser);
  const baselineMetrics = baseline
    ? metricEntries(scored.find((row) => row.key === baseline) as MetricBreakdownRow)
    : new Map();
  const baselineCount = scored.find((row) => row.key === baseline)?.succeededCount ?? 0;

  const parsers = scored.map((row) => {
    const own = metricEntries(row);
    const keys = [...new Set([...own.keys(), ...baselineMetrics.keys()])].sort();

    return {
      parser: row.key,
      succeededCount: row.succeededCount,
      isBaseline: row.key === baseline,
      reliable: row.succeededCount >= MIN_RELIABLE_SAMPLE
        && baselineCount >= MIN_RELIABLE_SAMPLE,
      metrics: keys.map((key) => {
        const mine = own.get(key);
        const theirs = baselineMetrics.get(key);
        const delta = mine?.average !== null && mine?.average !== undefined
          && theirs?.average !== null && theirs?.average !== undefined
          ? round(mine.average - theirs.average)
          : null;

        return {
          key: key as DeterministicMetricKey,
          average: mine?.average ?? null,
          baselineAverage: theirs?.average ?? null,
          delta: row.key === baseline ? 0 : delta,
          sampleCount: mine?.sampleCount ?? 0,
        };
      }),
    };
  });

  return {
    baselineParser: baseline,
    // Baseline first, then the largest improvement, so the comparison reads
    // top-down without implying a winner.
    parsers: parsers.sort((left, right) => {
      if (left.isBaseline !== right.isBaseline) return left.isBaseline ? -1 : 1;
      return right.succeededCount - left.succeededCount;
    }),
    unscoredParsers: parserBreakdown
      .filter((row) => row.key === "unknown" || !row.key)
      .map((row) => row.key || "unknown"),
  };
}

/**
 * Summarize a parser's effect in one sentence, or say plainly that there is not
 * enough evidence yet.
 */
export function describeParserDelta(
  entry: ParserRetrievalDelta,
  metricKey: DeterministicMetricKey,
): string {
  if (entry.isBaseline) return "Baseline";

  const metric = entry.metrics.find((item) => item.key === metricKey);
  if (!metric || metric.delta === null) return "Not scored";
  if (!entry.reliable) {
    return `${metric.delta >= 0 ? "+" : ""}${(metric.delta * 100).toFixed(1)}pp · too few cases`;
  }

  return `${metric.delta >= 0 ? "+" : ""}${(metric.delta * 100).toFixed(1)}pp`;
}
