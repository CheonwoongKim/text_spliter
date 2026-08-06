import { DOCUMENT_ENGINE_TYPES, PARSER_TYPES, VISION_ENGINE_TYPES } from "@/lib/constants";
import { getDocumentEngine, isVisionEngine } from "@/lib/document-engines";
import {
  getDefaultParserEngineConfig,
  normalizeParserEngineConfig,
  summarizeParserEngineConfig,
} from "@/lib/parser-engine-settings";
import type {
  DocumentEngineConfig,
  DocumentEngineConfigMap,
  DocumentEngineType,
  ParserType,
  VisionEngineType,
} from "@/lib/types";

export const DOCUMENT_ENGINE_SETTINGS_SCHEMA_VERSION = 2;

export const DEFAULT_VISION_DOCUMENT_PROMPT = [
  "Transcribe this document into faithful Markdown.",
  "Preserve headings, reading order, lists, tables, formulas, captions, and visible labels.",
  "Describe meaningful diagrams or charts briefly without inventing content.",
  "Do not summarize. Return only the document content.",
].join(" ");

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function trimmedString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().slice(0, maxLength);
  return normalized || undefined;
}

function boundedInteger(value: unknown, fallback: number, min: number, max: number): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

export function getDefaultDocumentEngineConfig(
  engineType: DocumentEngineType
): DocumentEngineConfig {
  if (!isVisionEngine(engineType)) {
    return getDefaultParserEngineConfig(engineType as ParserType);
  }

  const engine = getDocumentEngine(engineType);
  return {
    modelId: engine.defaultModel,
    inputPreference: "auto",
    pdfDetail: "high",
    maxOutputTokens: 16000,
    prompt: DEFAULT_VISION_DOCUMENT_PROMPT,
  };
}

export function createDefaultDocumentEngineConfigMap(): DocumentEngineConfigMap {
  return Object.fromEntries(
    DOCUMENT_ENGINE_TYPES.map((engineType) => [
      engineType,
      getDefaultDocumentEngineConfig(engineType),
    ])
  ) as DocumentEngineConfigMap;
}

export function normalizeDocumentEngineConfig(
  engineType: DocumentEngineType,
  value: unknown
): DocumentEngineConfig {
  if (!isVisionEngine(engineType)) {
    return normalizeParserEngineConfig(engineType as ParserType, value);
  }

  const source = asRecord(value);
  const defaults = getDefaultDocumentEngineConfig(engineType);
  const requestedInputPreference = source.inputPreference === "native-document"
    || source.inputPreference === "page-images"
    ? source.inputPreference
    : "auto";
  const inputPreference = engineType === "Qwen Vision"
    && requestedInputPreference === "native-document"
    ? "auto"
    : requestedInputPreference;
  const pdfDetail = source.pdfDetail === "low" || source.pdfDetail === "auto"
    ? source.pdfDetail
    : "high";

  return {
    modelId: trimmedString(source.modelId, 160) || defaults.modelId,
    inputPreference,
    pdfDetail,
    maxOutputTokens: boundedInteger(source.maxOutputTokens, 16000, 512, 64000),
    prompt: trimmedString(source.prompt, 8000) || DEFAULT_VISION_DOCUMENT_PROMPT,
  };
}

export function summarizeDocumentEngineConfig(
  engineType: DocumentEngineType,
  config: unknown
): string {
  if (!isVisionEngine(engineType)) {
    return summarizeParserEngineConfig(engineType as ParserType, config);
  }

  const normalized = normalizeDocumentEngineConfig(engineType, config);
  const inputLabel = normalized.inputPreference === "page-images"
    ? "Page images"
    : normalized.inputPreference === "native-document"
      ? "Native document"
      : "Automatic input";
  return `${normalized.modelId} · ${inputLabel}`;
}

export function isParserDocumentEngine(
  engineType: DocumentEngineType
): engineType is ParserType {
  return (PARSER_TYPES as readonly string[]).includes(engineType);
}

export function isVisionDocumentEngine(
  engineType: DocumentEngineType
): engineType is VisionEngineType {
  return (VISION_ENGINE_TYPES as readonly string[]).includes(engineType);
}
