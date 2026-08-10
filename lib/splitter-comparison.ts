import type { SplitResponse, SplitterConfig } from "@/lib/types";

/**
 * Deterministic comparison of chunking runs over the same source text.
 *
 * Every number here is computed locally from the chunks themselves, so
 * comparing strategies costs nothing and stays reproducible. As with parser
 * comparison, no run is declared the winner: the metrics expose trade-offs
 * (fewer, larger chunks vs. cleaner boundaries) and a person decides.
 */

export interface SplitterRun {
  id: string;
  config: SplitterConfig;
  result: SplitResponse;
}

export interface SplitterRunMetrics {
  id: string;
  splitterType: string;
  chunkSize: number;
  chunkOverlap: number;
  totalChunks: number;
  minLength: number;
  medianLength: number;
  p90Length: number;
  maxLength: number;
  lengthStdDev: number;
  /** Mean of the character overlap actually produced between adjacent chunks. */
  measuredOverlap: number;
  /** Chunks that end mid-sentence, as a share of all chunks. */
  brokenBoundaryRatio: number;
  /** Chunks carrying page provenance, as a share of all chunks. */
  provenanceCoverage: number;
  /** Chunks that cross a page boundary, as a share of all chunks. */
  pageSpanningRatio: number;
  processingTime: number;
}

const SENTENCE_TERMINATORS = /[.!?。？！:;,)\]}"'”’`]$/;

function percentile(sorted: number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.floor(fraction * (sorted.length - 1)));
  return sorted[index];
}

function standardDeviation(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  const variance = values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function round(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}

export function calculateSplitterRunMetrics(run: SplitterRun): SplitterRunMetrics {
  const chunks = run.result.chunks;
  const lengths = chunks.map((chunk) => chunk.metadata.length);
  const sorted = [...lengths].sort((left, right) => left - right);
  const mean = lengths.length
    ? lengths.reduce((total, value) => total + value, 0) / lengths.length
    : 0;

  let overlapTotal = 0;
  let overlapPairs = 0;
  for (let index = 1; index < chunks.length; index += 1) {
    const previous = chunks[index - 1].metadata;
    const current = chunks[index].metadata;
    const overlap = previous.endIndex - current.startIndex;
    if (overlap > 0) overlapTotal += overlap;
    overlapPairs += 1;
  }

  const brokenBoundaries = chunks.filter((chunk) => {
    const trimmed = chunk.content.trimEnd();
    return trimmed.length > 0 && !SENTENCE_TERMINATORS.test(trimmed);
  }).length;

  const withProvenance = chunks.filter(
    (chunk) => chunk.metadata.source?.pageNumber !== undefined,
  ).length;
  const pageSpanning = chunks.filter(
    (chunk) => (chunk.metadata.source?.pageNumbers?.length || 0) > 1,
  ).length;

  const total = chunks.length || 1;

  return {
    id: run.id,
    splitterType: run.result.splitterType,
    chunkSize: run.config.chunkSize,
    chunkOverlap: run.config.chunkOverlap,
    totalChunks: chunks.length,
    minLength: sorted[0] ?? 0,
    medianLength: percentile(sorted, 0.5),
    p90Length: percentile(sorted, 0.9),
    maxLength: sorted[sorted.length - 1] ?? 0,
    lengthStdDev: round(standardDeviation(lengths, mean)),
    measuredOverlap: overlapPairs ? round(overlapTotal / overlapPairs) : 0,
    brokenBoundaryRatio: round(brokenBoundaries / total, 4),
    provenanceCoverage: round(withProvenance / total, 4),
    pageSpanningRatio: round(pageSpanning / total, 4),
    processingTime: run.result.statistics.processingTime,
  };
}

export function compareSplitterRuns(runs: SplitterRun[]): SplitterRunMetrics[] {
  return runs.map(calculateSplitterRunMetrics);
}

export type SplitterMetricKey =
  | "totalChunks"
  | "lengthStdDev"
  | "brokenBoundaryRatio"
  | "provenanceCoverage"
  | "processingTime";

/**
 * Runs whose value is best for a metric. A metric can tie, and a single run is
 * never highlighted as best because there is nothing to compare it against.
 */
export function bestRunIds(
  metrics: SplitterRunMetrics[],
  key: SplitterMetricKey,
  direction: "lower" | "higher",
): string[] {
  if (metrics.length < 2) return [];

  const values = metrics.map((metric) => metric[key]);
  const target = direction === "lower" ? Math.min(...values) : Math.max(...values);
  const allEqual = values.every((value) => value === target);
  if (allEqual) return [];

  return metrics.filter((metric) => metric[key] === target).map((metric) => metric.id);
}

export function describeSplitterRun(run: SplitterRun): string {
  const { splitterType, chunkSize, chunkOverlap } = run.config;
  return `${splitterType} · ${chunkSize}/${chunkOverlap}`;
}

/** A repeated configuration produces an identical run, so it is not queued twice. */
export function splitterRunSignature(config: SplitterConfig): string {
  return JSON.stringify([
    config.splitterType,
    config.chunkSize,
    config.chunkOverlap,
    config.separator ?? null,
    config.separators ?? null,
    config.encodingName ?? null,
    config.language ?? null,
    config.breakpointType ?? null,
  ]);
}
