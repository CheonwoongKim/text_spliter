import type { JsonValue } from "@/lib/types/json";

export interface DatabaseSchema {
  name: string;
  tables: TableInfo[];
}

export interface TableInfo {
  name: string;
  schema: string;
  rowCount: number;
  columns: ColumnInfo[];
  /** Model this collection was built with. Retrieval must reuse it. */
  embeddingModel?: string;
  vectorDimension?: number;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey?: boolean;
}

export interface TableRow {
  [key: string]: string | number | boolean | null | JsonValue;
}

export interface VectorStoreConfig {
  selectedSchema?: string;
  selectedTable?: string;
}

export interface TableDataResponse {
  rows: TableRow[];
  totalCount: number;
  columns: ColumnInfo[];
}

export type RagGenerationModel = "gpt-5.6-sol" | "gpt-5.6-terra" | "gpt-5.6-luna";
export type RagReasoningEffort = "none" | "low" | "medium" | "high";

export interface RagRetrievedContext {
  rank: number;
  chunkId: string;
  content: string;
  metadata: Record<string, JsonValue>;
  similarity: number;
}

export interface RagCitation extends RagRetrievedContext {
  reference: number;
}

export interface RagRunResult {
  id: string;
  status: "succeeded";
  question: string;
  answer: string;
  citations: RagCitation[];
  retrieval: {
    provider: "supabase-pgvector";
    schema: string;
    table: string;
    topK: number;
    embeddingModel: string;
    resolvedEmbeddingModel: string;
    embeddingDimensions: number;
    results: RagRetrievedContext[];
  };
  generation: {
    provider: "openai";
    model: RagGenerationModel;
    resolvedModel: string;
    reasoningEffort: RagReasoningEffort;
    promptVersion: string;
    responseId?: string;
  };
  usage: {
    embedding?: Record<string, JsonValue>;
    generation?: Record<string, JsonValue>;
  };
  timings: {
    embeddingMs: number;
    retrievalMs: number;
    generationMs: number;
    totalMs: number;
  };
  startedAt: string;
  completedAt: string;
}
