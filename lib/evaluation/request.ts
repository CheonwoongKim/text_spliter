/**
 * Request validation for the evaluation API.
 *
 * Evaluation rows are immutable once frozen, so malformed input has to be
 * rejected at the boundary rather than repaired later.
 */
import { DETERMINISTIC_METRIC_KEYS } from "@/lib/evaluation-metrics";
import type { DeterministicMetricKey } from "@/lib/types";


export class EvaluationRequestError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "EvaluationRequestError";
  }
}

interface ExpectedEvidenceInput {
  documentHash?: unknown;
  pageNumber?: unknown;
  blockId?: unknown;
  chunkKey?: unknown;
  note?: unknown;
}

export const DEFAULT_REGRESSION_THRESHOLD = 0.05;

export function requiredText(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new EvaluationRequestError(`${label} is required.`);
  }
  if (value.trim().length > maxLength) {
    throw new EvaluationRequestError(`${label} must be at most ${maxLength} characters.`);
  }
  return value.trim();
}

export function optionalText(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new EvaluationRequestError("Invalid text value.");
  if (value.trim().length > maxLength) {
    throw new EvaluationRequestError(`Text must be at most ${maxLength} characters.`);
  }
  return value.trim() || null;
}

export function textArray(value: unknown, label: string, maxItems = 100): string[] {
  if (!Array.isArray(value)) throw new EvaluationRequestError(`${label} must be an array.`);
  if (value.length > maxItems) {
    throw new EvaluationRequestError(`${label} must contain at most ${maxItems} items.`);
  }
  return value.map((item) => requiredText(item, label, 1000));
}

export function expectedEvidenceArray(value: unknown): Array<Record<string, string | number>> {
  if (!Array.isArray(value)) {
    throw new EvaluationRequestError("Expected evidence must be an array.");
  }
  if (value.length > 100) {
    throw new EvaluationRequestError("Expected evidence must contain at most 100 items.");
  }

  return value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new EvaluationRequestError("Each evidence item must be an object.");
    }
    const evidence = item as ExpectedEvidenceInput;
    const normalized: Record<string, string | number> = {};
    const documentHash = optionalText(evidence.documentHash, 128);
    const blockId = optionalText(evidence.blockId, 200);
    const chunkKey = optionalText(evidence.chunkKey, 200);
    const note = optionalText(evidence.note, 1000);
    if (documentHash) normalized.documentHash = documentHash;
    if (blockId) normalized.blockId = blockId;
    if (chunkKey) normalized.chunkKey = chunkKey;
    if (note) normalized.note = note;
    if (evidence.pageNumber !== undefined && evidence.pageNumber !== null && evidence.pageNumber !== "") {
      const pageNumber = Number(evidence.pageNumber);
      if (!Number.isInteger(pageNumber) || pageNumber < 1) {
        throw new EvaluationRequestError("Evidence page number must be a positive integer.");
      }
      normalized.pageNumber = pageNumber;
    }
    if (Object.keys(normalized).length === 0) {
      throw new EvaluationRequestError("An evidence item must contain at least one reference field.");
    }
    return normalized;
  });
}

export function jsonObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new EvaluationRequestError(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

export function regressionThresholds(value: unknown, enabled: boolean): Partial<Record<DeterministicMetricKey, number>> {
  if (!enabled) return {};
  const raw = value === undefined || value === null ? {} : jsonObject(value, "Regression thresholds");
  return Object.fromEntries(DETERMINISTIC_METRIC_KEYS.map((key) => {
    const threshold = raw[key] === undefined ? DEFAULT_REGRESSION_THRESHOLD : Number(raw[key]);
    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
      throw new EvaluationRequestError(`${key} regression threshold must be between 0 and 1.`);
    }
    return [key, threshold];
  })) as Partial<Record<DeterministicMetricKey, number>>;
}

export function runTopK(
  casePipelineConfig: Record<string, unknown> | null,
  runPipelineConfig: Record<string, unknown>
): number {
  const retrieval = casePipelineConfig?.retrieval;
  const nestedTopK = retrieval && typeof retrieval === "object" && !Array.isArray(retrieval)
    ? Number((retrieval as Record<string, unknown>).topK)
    : NaN;
  const flatTopK = Number(runPipelineConfig.topK);
  return Number.isInteger(nestedTopK) && nestedTopK > 0
    ? nestedTopK
    : Number.isInteger(flatTopK) && flatTopK > 0 ? flatTopK : 1;
}

