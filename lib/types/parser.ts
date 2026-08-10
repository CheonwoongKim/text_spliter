import type { NormalizedDocument } from "@/lib/document-ir";
import type { JsonObject, JsonValue } from "@/lib/types/json";

export type ParserType = "Upstage" | "LlamaIndex" | "Azure" | "Google" | "Docling";
export type VisionEngineType =
  | "OpenAI Vision"
  | "Gemini Vision"
  | "Claude Vision"
  | "Qwen Vision";
export type DocumentEngineType = ParserType | VisionEngineType;
export type DocumentEngineKind = "parser" | "vision";
export type VisionInputPreference = "auto" | "native-document" | "page-images";
export type VisionInputMode =
  | "native-document"
  | "native-page-capture"
  | "rasterized-fallback"
  | "original-image";
export type VisionPdfDetail = "auto" | "low" | "high";
export type LlamaParseTier = "fast" | "cost_effective" | "agentic" | "agentic_plus";
export type DoclingOutputFormat = "markdown" | "html" | "json";
export type DoclingOcrMode = "disabled" | "auto" | "force";
export type DoclingPipeline = "standard" | "vlm";
export type DoclingTableMode = "fast" | "accurate";

export interface ParserConfig {
  parserType: ParserType;
  language?: string;
  extractImages?: boolean;
  extractTables?: boolean;
  pageRange?: string;
  upstageOutputFormat?: "text" | "html" | "markdown";
  llamaTier?: LlamaParseTier;
  llamaVersion?: string;
  azureModelId?: string;
  azureOutputFormat?: "text" | "markdown";
  googleProcessorId?: string;
  googleLocation?: string;
  doclingOutputFormat?: DoclingOutputFormat;
  doclingOcrMode?: DoclingOcrMode;
  doclingPipeline?: DoclingPipeline;
  doclingTableMode?: DoclingTableMode;
}

export type ParserEngineConfig = Omit<ParserConfig, "parserType">;
export type ParserEngineConfigMap = Record<ParserType, ParserEngineConfig>;

export interface VisionEngineConfig {
  modelId?: string;
  inputPreference?: VisionInputPreference;
  pdfDetail?: VisionPdfDetail;
  maxOutputTokens?: number;
  prompt?: string;
}

export type DocumentEngineConfig = ParserEngineConfig & VisionEngineConfig;
export type DocumentEngineConfigMap = Record<DocumentEngineType, DocumentEngineConfig>;

export interface ParserExperimentEngine {
  parserType: DocumentEngineType;
  config: DocumentEngineConfig;
}

export interface ParserExperimentPlan {
  primaryEngine: DocumentEngineType;
  engines: ParserExperimentEngine[];
}

export interface ParseRequest {
  file: File;
  config: ParserConfig;
}

export type ParseRunStatus = "queued" | "running" | "succeeded" | "failed";

export interface ParseRunMetadata {
  id: string;
  engineId: string;
  provider: string;
  model?: string;
  version?: string;
  status: ParseRunStatus;
  config: JsonObject;
  settingsSchemaVersion?: number;
  experimentId?: string;
  role?: "primary" | "additional";
  engineKind?: DocumentEngineKind;
  inputMode?: VisionInputMode;
  renderer?: {
    name: string;
    version?: string;
  };
  startedAt: string;
  completedAt?: string;
}

export interface ParseResponse {
  text?: string;
  html?: string;
  markdown?: string;
  json?: JsonValue;
  pages?: Array<{
    pageNumber: number;
    text?: string;
    markdown?: string;
    width?: number;
    height?: number;
    items?: JsonValue[];
  }>;
  /** Provider-independent, page/block-level document representation. */
  document?: NormalizedDocument;
  /** Immutable provider response. `json` remains for the legacy result tab. */
  raw?: JsonValue;
  run?: ParseRunMetadata;
  metadata?: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    pageCount?: number;
    processingTime: number;
    parserType: DocumentEngineType;
    engineKind?: DocumentEngineKind;
    inputMode?: VisionInputMode;
    parserVersion?: string;
    documentHash?: string;
  };
}

export type ParserViewMode = "text" | "html" | "markdown" | "json" | "document" | "raw";
