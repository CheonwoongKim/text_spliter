import type {
  DeterministicEvaluationMetrics,
  DeterministicMetricKey,
  ExpectedEvidence,
} from "@/lib/types";

export const DETERMINISTIC_METRICS_VERSION = "retrieval-v1";

export const DETERMINISTIC_METRIC_KEYS = [
  "recallAtK",
  "precisionAtK",
  "hitRate",
  "mrr",
  "ndcgAtK",
  "citationPrecision",
  "citationRecall",
] as const satisfies readonly DeterministicMetricKey[];

type MetricSampleCountKey = `${DeterministicMetricKey}CaseCount`;

export type DeterministicMetricAggregate = {
  caseCount: number;
} & Record<DeterministicMetricKey, number | null>
  & Record<MetricSampleCountKey, number>;

export interface EvaluationMetricRow {
  status: string;
  deterministicMetrics: DeterministicEvaluationMetrics | null;
  attributes: Record<string, unknown>;
  pipelineConfig: Record<string, unknown> | null;
  retrievedContexts: unknown[];
}

export type MetricBreakdownRow = DeterministicMetricAggregate & {
  key: string;
  succeededCount: number;
  successRate: number;
};

export type MetricBreakdowns = Record<
  "documentType" | "language" | "difficulty" | "answerable" | "tags" | "parser" | "chunker" | "embeddingModel" | "generator",
  MetricBreakdownRow[]
>;

interface ContextIdentity {
  documentHash?: string;
  pageNumber?: number;
  blockId?: string;
  chunkKey?: string;
}

interface ContextLike {
  rank?: unknown;
  chunkId?: unknown;
  metadata?: unknown;
}

interface CitationLike extends ContextLike {
  reference?: unknown;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function firstValue(records: Array<Record<string, unknown>>, keys: string[]): unknown {
  for (const record of records) {
    for (const key of keys) {
      const value = record[key];
      if (value !== undefined && value !== null && value !== "") return value;
    }
  }
  return undefined;
}

function optionalString(value: unknown, lowercase = false): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const normalized = String(value).trim();
  if (!normalized) return undefined;
  return lowercase ? normalized.toLowerCase() : normalized;
}

function optionalPage(value: unknown): number | undefined {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : undefined;
}

function contextIdentity(context: ContextLike): ContextIdentity {
  const metadata = asRecord(context.metadata);
  const sourceMetadata = asRecord(metadata.source_metadata || metadata.sourceMetadata);
  const provenance = asRecord(metadata.provenance);
  const records = [metadata, sourceMetadata, provenance];
  return {
    documentHash: optionalString(
      firstValue(records, ["document_hash", "documentHash", "doc_hash", "docHash"]),
      true
    ),
    pageNumber: optionalPage(firstValue(records, ["page_number", "pageNumber", "page"])),
    blockId: optionalString(firstValue(records, ["block_id", "blockId"])),
    chunkKey: optionalString(
      firstValue(records, ["chunk_key", "chunkKey", "chunk_id", "chunkId"]) ?? context.chunkId
    ),
  };
}

function evidenceIdentity(evidence: ExpectedEvidence): ContextIdentity {
  return {
    documentHash: optionalString(evidence.documentHash, true),
    pageNumber: optionalPage(evidence.pageNumber),
    blockId: optionalString(evidence.blockId),
    chunkKey: optionalString(evidence.chunkKey),
  };
}

function isScorable(identity: ContextIdentity): boolean {
  return Object.values(identity).some((value) => value !== undefined);
}

function matches(expected: ContextIdentity, actual: ContextIdentity): boolean {
  return (Object.keys(expected) as Array<keyof ContextIdentity>)
    .filter((key) => expected[key] !== undefined)
    .every((key) => expected[key] === actual[key]);
}

function normalizedRank(context: ContextLike, index: number): number {
  const rank = Number(context.rank);
  return Number.isInteger(rank) && rank > 0 ? rank : index + 1;
}

function roundMetric(value: number): number {
  return Number(value.toFixed(6));
}

function citationKey(citation: CitationLike, index: number): string {
  const rank = Number(citation.rank ?? citation.reference);
  if (Number.isInteger(rank) && rank > 0) return `rank:${rank}`;
  const chunkId = optionalString(citation.chunkId);
  return chunkId ? `chunk:${chunkId}` : `citation:${index}`;
}

export function calculateDeterministicMetrics(input: {
  expectedEvidence: ExpectedEvidence[];
  retrievedContexts: unknown[] | null | undefined;
  citations: unknown[] | null | undefined;
  topK: number;
}): DeterministicEvaluationMetrics {
  const k = Number.isInteger(input.topK) && input.topK > 0 ? input.topK : 1;
  const expected = input.expectedEvidence
    .map(evidenceIdentity)
    .filter(isScorable);
  const contexts = (Array.isArray(input.retrievedContexts) ? input.retrievedContexts : [])
    .map((value) => value as ContextLike)
    .map((context, index) => ({ context, rank: normalizedRank(context, index) }))
    .filter(({ rank }) => rank <= k)
    .sort((left, right) => left.rank - right.rank);
  const citations = (Array.isArray(input.citations) ? input.citations : [])
    .map((value) => value as CitationLike)
    .filter((citation, index, values) =>
      values.findIndex((candidate, candidateIndex) => citationKey(candidate, candidateIndex) === citationKey(citation, index)) === index
    );
  const citedRanks = new Set(
    citations
      .map((citation) => Number(citation.rank ?? citation.reference))
      .filter((rank) => Number.isInteger(rank) && rank > 0)
  );
  const citedChunkIds = new Set(citations.map((citation) => optionalString(citation.chunkId)).filter(Boolean));
  const matchedEvidenceIndices = new Set<number>();
  const relevanceByRank = contexts.map(({ context, rank }) => {
    const identity = contextIdentity(context);
    const matched = expected
      .map((item, index) => matches(item, identity) ? index : -1)
      .filter((index) => index >= 0);
    matched.forEach((index) => matchedEvidenceIndices.add(index));
    return {
      rank,
      relevant: matched.length > 0,
      matchedEvidenceIndices: matched,
      cited: citedRanks.has(rank) || citedChunkIds.has(optionalString(context.chunkId)),
    };
  });
  const relevantRetrievedCount = relevanceByRank.filter((item) => item.relevant).length;
  const firstRelevant = relevanceByRank.find((item) => item.relevant)?.rank;
  const dcg = relevanceByRank.reduce(
    (sum, item) => sum + (item.relevant ? 1 / Math.log2(item.rank + 1) : 0),
    0
  );
  const idealRelevantCount = Math.min(expected.length, k);
  const idealDcg = Array.from({ length: idealRelevantCount }, (_, index) => 1 / Math.log2(index + 2))
    .reduce((sum, value) => sum + value, 0);
  const citedRows = relevanceByRank.filter((item) => item.cited);
  const citedMatchedEvidence = new Set(citedRows.flatMap((item) => item.matchedEvidenceIndices));
  const hasExpected = expected.length > 0;

  return {
    version: DETERMINISTIC_METRICS_VERSION,
    k,
    scorableEvidenceCount: expected.length,
    matchedEvidenceCount: matchedEvidenceIndices.size,
    relevantRetrievedCount,
    retrievedCount: contexts.length,
    citationCount: citations.length,
    recallAtK: hasExpected ? roundMetric(matchedEvidenceIndices.size / expected.length) : null,
    precisionAtK: hasExpected ? roundMetric(relevantRetrievedCount / k) : null,
    hitRate: hasExpected ? Number(relevantRetrievedCount > 0) : null,
    mrr: hasExpected ? roundMetric(firstRelevant ? 1 / firstRelevant : 0) : null,
    ndcgAtK: hasExpected ? roundMetric(idealDcg ? dcg / idealDcg : 0) : null,
    citationPrecision: hasExpected && citations.length
      ? roundMetric(citedRows.filter((item) => item.relevant).length / citations.length)
      : null,
    citationRecall: hasExpected ? roundMetric(citedMatchedEvidence.size / expected.length) : null,
    relevanceByRank,
  };
}

export function aggregateDeterministicMetrics(
  metrics: Array<DeterministicEvaluationMetrics | null>
): DeterministicMetricAggregate {
  const aggregate = { caseCount: metrics.filter(Boolean).length } as DeterministicMetricAggregate;
  for (const key of DETERMINISTIC_METRIC_KEYS) {
    const values = metrics
      .map((item) => item?.[key])
      .filter((value): value is number => typeof value === "number");
    aggregate[key] = values.length
      ? roundMetric(values.reduce((sum, value) => sum + value, 0) / values.length)
      : null;
    aggregate[`${key}CaseCount` as MetricSampleCountKey] = values.length;
  }
  return aggregate;
}

function nestedValue(value: unknown, paths: string[][]): unknown {
  for (const path of paths) {
    let current: unknown = value;
    for (const segment of path) current = asRecord(current)[segment];
    if (current !== undefined && current !== null && current !== "") return current;
  }
  return undefined;
}

function contextMetadata(row: EvaluationMetricRow): Record<string, unknown>[] {
  return row.retrievedContexts.map((context) => asRecord(asRecord(context).metadata));
}

function uniqueText(values: unknown[], fallback = "unknown"): string[] {
  const normalized = values
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .map((value) => optionalString(value))
    .filter((value): value is string => Boolean(value));
  return normalized.length ? [...new Set(normalized)] : [fallback];
}

function documentType(row: EvaluationMetricRow): string[] {
  const metadata = contextMetadata(row);
  const explicit = metadata.map((item) => firstValue([
    item,
    asRecord(item.source_metadata || item.sourceMetadata),
  ], ["document_type", "documentType", "mime_type", "mimeType", "file_type", "fileType"]));
  const explicitValues = uniqueText(explicit, "").filter(Boolean);
  if (explicitValues.length) return explicitValues;
  const fileNames = metadata.map((item) => firstValue([
    item,
    asRecord(item.source_metadata || item.sourceMetadata),
  ], ["file_name", "fileName"]));
  const extensions = fileNames
    .map((value) => optionalString(value))
    .map((value) => value?.includes(".") ? value.split(".").pop()?.toLowerCase() : undefined)
    .filter((value): value is string => Boolean(value));
  return extensions.length ? [...new Set(extensions)] : ["unknown"];
}

function breakdownValues(row: EvaluationMetricRow, dimension: keyof MetricBreakdowns): string[] {
  const metadata = contextMetadata(row);
  if (dimension === "documentType") return documentType(row);
  if (dimension === "language") return uniqueText([row.attributes.language]);
  if (dimension === "difficulty") return uniqueText([row.attributes.difficulty]);
  if (dimension === "answerable") return [row.attributes.answerable === false ? "unanswerable" : "answerable"];
  if (dimension === "tags") return uniqueText([row.attributes.tags], "untagged");
  if (dimension === "parser") {
    return uniqueText(metadata.map((item) => firstValue([
      item,
      asRecord(item.source_metadata || item.sourceMetadata),
    ], ["parser_type", "parserType", "engine_id", "engineId"])));
  }
  if (dimension === "chunker") {
    return uniqueText(metadata.map((item) => firstValue([item], ["splitter_type", "splitterType"])));
  }
  if (dimension === "embeddingModel") {
    return uniqueText([nestedValue(row.pipelineConfig, [
      ["retrieval", "embedding", "resolvedModel"],
      ["retrieval", "embedding", "model"],
      ["embeddingModel"],
    ])]);
  }
  return uniqueText([nestedValue(row.pipelineConfig, [
    ["generation", "resolvedModel"],
    ["generation", "model"],
    ["generationModel"],
  ])]);
}

export function buildMetricBreakdowns(rows: EvaluationMetricRow[]): MetricBreakdowns {
  const dimensions = [
    "documentType", "language", "difficulty", "answerable", "tags",
    "parser", "chunker", "embeddingModel", "generator",
  ] as const;
  return Object.fromEntries(dimensions.map((dimension) => {
    const groups = new Map<string, EvaluationMetricRow[]>();
    for (const row of rows) {
      for (const value of breakdownValues(row, dimension)) {
        groups.set(value, [...(groups.get(value) || []), row]);
      }
    }
    const result = [...groups.entries()].map(([key, groupRows]) => {
      const aggregate = aggregateDeterministicMetrics(groupRows.map((row) => row.deterministicMetrics));
      const succeededCount = groupRows.filter((row) => row.status === "succeeded").length;
      return {
        key,
        ...aggregate,
        evaluatedCaseCount: aggregate.caseCount,
        caseCount: groupRows.length,
        succeededCount,
        successRate: groupRows.length ? roundMetric(succeededCount / groupRows.length) : 0,
      };
    }).sort((left, right) => right.caseCount - left.caseCount || left.key.localeCompare(right.key));
    return [dimension, result];
  })) as unknown as MetricBreakdowns;
}
