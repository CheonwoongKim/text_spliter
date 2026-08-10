/**
 * Cost estimation for a RAG execution.
 *
 * A workbench that only reports quality cannot answer "is this 5% better answer
 * worth three times the money", so every run carries an estimated cost next to
 * its metrics.
 *
 * Rates are estimates, not billing. They are declared here as a versioned table
 * so a stored run keeps the rates it was priced with instead of silently
 * changing when a provider updates its price list.
 */

export const COST_RATE_VERSION = "openai-usd-2026-08";

export interface TokenRate {
  /** USD per one million input tokens. */
  inputPerMillion: number;
  /** USD per one million output tokens. Embedding models have no output. */
  outputPerMillion?: number;
}

export const EMBEDDING_RATES: Record<string, TokenRate> = {
  "text-embedding-3-small": { inputPerMillion: 0.02 },
  "text-embedding-3-large": { inputPerMillion: 0.13 },
};

export const GENERATION_RATES: Record<string, TokenRate> = {
  "gpt-5.6-sol": { inputPerMillion: 1.25, outputPerMillion: 10 },
  "gpt-5.6-terra": { inputPerMillion: 0.25, outputPerMillion: 2 },
  "gpt-5.6-luna": { inputPerMillion: 0.05, outputPerMillion: 0.4 },
};

export interface CostBreakdown {
  rateVersion: string;
  embeddingUsd: number | null;
  generationUsd: number | null;
  totalUsd: number | null;
  /** Models with no published rate here, so their cost is unknown, not zero. */
  unpricedModels: string[];
}

function tokenValue(usage: Record<string, unknown> | null | undefined, keys: string[]): number | null {
  if (!usage) return null;
  for (const key of keys) {
    const value = usage[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  }
  return null;
}

function round(value: number): number {
  return Number(value.toFixed(6));
}

function priceTokens(tokens: number | null, perMillion: number | undefined): number | null {
  if (tokens === null || perMillion === undefined) return null;
  return (tokens / 1_000_000) * perMillion;
}

/**
 * Price one run. An unknown model or missing usage yields `null` rather than a
 * zero, because a zero would read as "free" in a comparison table.
 */
export function estimateRunCost(input: {
  embeddingModel?: string;
  generationModel?: string;
  embeddingUsage?: Record<string, unknown> | null;
  generationUsage?: Record<string, unknown> | null;
}): CostBreakdown {
  const unpricedModels: string[] = [];

  const embeddingRate = input.embeddingModel ? EMBEDDING_RATES[input.embeddingModel] : undefined;
  if (input.embeddingModel && !embeddingRate) unpricedModels.push(input.embeddingModel);

  const generationRate = input.generationModel ? GENERATION_RATES[input.generationModel] : undefined;
  if (input.generationModel && !generationRate) unpricedModels.push(input.generationModel);

  const embeddingTokens = tokenValue(input.embeddingUsage, ["prompt_tokens", "total_tokens"]);
  const embeddingUsd = priceTokens(embeddingTokens, embeddingRate?.inputPerMillion);

  const inputTokens = tokenValue(input.generationUsage, ["input_tokens", "prompt_tokens"]);
  const outputTokens = tokenValue(input.generationUsage, ["output_tokens", "completion_tokens"]);
  const generationInputUsd = priceTokens(inputTokens, generationRate?.inputPerMillion);
  const generationOutputUsd = priceTokens(outputTokens, generationRate?.outputPerMillion);

  const generationUsd = generationInputUsd === null && generationOutputUsd === null
    ? null
    : (generationInputUsd || 0) + (generationOutputUsd || 0);

  const totalUsd = embeddingUsd === null && generationUsd === null
    ? null
    : (embeddingUsd || 0) + (generationUsd || 0);

  return {
    rateVersion: COST_RATE_VERSION,
    embeddingUsd: embeddingUsd === null ? null : round(embeddingUsd),
    generationUsd: generationUsd === null ? null : round(generationUsd),
    totalUsd: totalUsd === null ? null : round(totalUsd),
    unpricedModels,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readString(record: Record<string, unknown> | null, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === "string" && value ? value : undefined;
}

/**
 * Cost of a stored run. A run priced at execution time keeps that price, so
 * historical comparisons are not rewritten when the rate table changes; older
 * runs recorded before pricing existed are estimated at current rates.
 */
export function costFromStoredRun(
  usage: unknown,
  pipelineConfig: unknown,
): CostBreakdown | null {
  const usageRecord = asRecord(usage);
  if (!usageRecord) return null;

  const stored = asRecord(usageRecord.cost);
  if (stored && typeof stored.rateVersion === "string") {
    return {
      rateVersion: stored.rateVersion,
      embeddingUsd: typeof stored.embeddingUsd === "number" ? stored.embeddingUsd : null,
      generationUsd: typeof stored.generationUsd === "number" ? stored.generationUsd : null,
      totalUsd: typeof stored.totalUsd === "number" ? stored.totalUsd : null,
      unpricedModels: Array.isArray(stored.unpricedModels)
        ? stored.unpricedModels.filter((model): model is string => typeof model === "string")
        : [],
    };
  }

  const config = asRecord(pipelineConfig);
  const retrieval = asRecord(config?.retrieval);
  const embedding = asRecord(retrieval?.embedding);
  const generation = asRecord(config?.generation);

  return estimateRunCost({
    embeddingModel: readString(embedding, "resolvedModel") || readString(embedding, "model"),
    generationModel: readString(generation, "resolvedModel") || readString(generation, "model"),
    embeddingUsage: asRecord(usageRecord.embedding),
    generationUsage: asRecord(usageRecord.generation),
  });
}

/** Sums run costs, keeping `null` when nothing in the set could be priced. */
export function sumRunCosts(costs: Array<CostBreakdown | null | undefined>): number | null {
  const priced = costs
    .map((cost) => cost?.totalUsd)
    .filter((value): value is number => typeof value === "number");

  return priced.length === 0
    ? null
    : round(priced.reduce((total, value) => total + value, 0));
}

export function formatUsd(value: number | null): string {
  if (value === null) return "-";
  if (value === 0) return "$0";
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}
