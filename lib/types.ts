import type { NormalizedDocument } from "@/lib/document-ir";
import type { DocumentEvaluationIssue, DocumentEvaluationMetrics } from "@/lib/document-evaluation";

// JSON value types for better type safety
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export interface JsonObject {
  [key: string]: JsonValue;
}
export type JsonArray = JsonValue[];

// Splitter types
export type SplitterType =
  | "CharacterTextSplitter"
  | "RecursiveCharacterTextSplitter"
  | "TokenTextSplitter"
  | "MarkdownTextSplitter"
  | "LatexTextSplitter"
  | "CodeSplitter"
  | "SemanticChunker";

// Encoding names for TokenTextSplitter
export type EncodingName = "cl100k_base" | "p50k_base" | "r50k_base";

// Programming languages for CodeSplitter
export type ProgrammingLanguage =
  | "python" | "js" | "ts" | "java" | "cpp" | "go"
  | "rust" | "php" | "ruby" | "swift" | "kotlin"
  | "csharp" | "html" | "markdown" | "latex";

// Breakpoint types for SemanticChunker
export type BreakpointType = "percentile" | "standard_deviation" | "interquartile" | "gradient";

// Splitter configuration
export interface SplitterConfig {
  splitterType: SplitterType;
  chunkSize: number;
  chunkOverlap: number;
  separator?: string;
  separators?: string[];
  encodingName?: EncodingName;
  modelName?: string;
  language?: ProgrammingLanguage;
  breakpointType?: BreakpointType;
}

// Source document metadata (from parsing)
export interface SourceMetadata {
  fileName?: string;
  parserType?: string;
  parseRunId?: string;
  documentHash?: string;
  engineId?: string;
  pageNumber?: number;
  bBox?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  originalJson?: any; // Full original page JSON for reference
}

// Chunk metadata
export interface ChunkMetadata {
  startIndex: number;
  endIndex: number;
  length: number;
  chunkSize: number;
  chunkOverlap: number;
  tokenCount?: number;
  // Source document metadata
  source?: SourceMetadata;
}

// Individual chunk result
export interface ChunkResult {
  index: number;
  content: string;
  metadata: ChunkMetadata;
}

// API response
export interface SplitResponse {
  chunks: ChunkResult[];
  totalChunks: number;
  splitterType: SplitterType;
  parameters: SplitterConfig;
  statistics: {
    averageChunkSize: number;
    minChunkSize: number;
    maxChunkSize: number;
    processingTime: number;
  };
}

// API request
export interface SplitRequest {
  text: string;
  config: SplitterConfig;
  sourceMetadata?: SourceMetadata; // Optional metadata from parsing
}

// View mode
export type ViewMode = "json" | "card";

// Input mode
export type InputMode = "upload" | "plaintext" | "storage";

// Splitter description
export interface SplitterDescription {
  name: string;
  description: string;
  useCases: string[];
  parameters: {
    name: string;
    description: string;
    type: string;
    default?: string | number;
    required: boolean;
  }[];
}

// Parser types
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

// Parser configuration
export interface ParserConfig {
  parserType: ParserType;

  // Common parser settings
  language?: string; // OCR language (e.g., 'ko', 'en', 'ja')
  extractImages?: boolean;
  extractTables?: boolean;
  pageRange?: string; // e.g., "1-5" or "1,3,5-10"

  // Upstage specific settings
  upstageOutputFormat?: 'text' | 'html' | 'markdown';

  // LlamaIndex specific settings
  llamaTier?: LlamaParseTier;
  llamaVersion?: string;

  // Azure specific settings
  azureModelId?: string; // e.g., 'prebuilt-layout', 'prebuilt-read', 'prebuilt-document'
  azureOutputFormat?: 'text' | 'markdown'; // outputContentFormat parameter

  // Google specific settings (JSON only - no output format option)
  googleProcessorId?: string;
  googleLocation?: string;

  // Docling specific settings
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

// Parse request
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

// Parse response
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

// Parser view mode - now dynamic based on available content
export type ParserViewMode = "text" | "html" | "markdown" | "json" | "document" | "raw";

// VectorStore types
export interface DatabaseSchema {
  name: string;
  tables: TableInfo[];
}

export interface TableInfo {
  name: string;
  schema: string;
  rowCount: number;
  columns: ColumnInfo[];
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

export type EvaluationVersionStatus = "draft" | "frozen" | "archived";
export type EvaluationRunStatus = "running" | "completed" | "failed";
export type EvaluationCaseRunStatus = "pending" | "running" | "succeeded" | "failed";
export type EvaluationJudgeBatchStatus = "running" | "completed" | "failed";
export type EvaluationJudgeCaseRunStatus = "pending" | "running" | "succeeded" | "failed";
export type RagasMetricKey = "faithfulness" | "answerRelevancy" | "contextPrecision" | "contextRecall";
export type ReviewerDecision = "pending" | "pass" | "fail";

export interface ExpectedEvidence {
  documentHash?: string;
  pageNumber?: number;
  blockId?: string;
  chunkKey?: string;
  note?: string;
}

export type DeterministicMetricKey =
  | "recallAtK"
  | "precisionAtK"
  | "hitRate"
  | "mrr"
  | "ndcgAtK"
  | "citationPrecision"
  | "citationRecall";

export interface DeterministicEvaluationMetrics {
  version: "retrieval-v1";
  k: number;
  scorableEvidenceCount: number;
  matchedEvidenceCount: number;
  relevantRetrievedCount: number;
  retrievedCount: number;
  citationCount: number;
  recallAtK: number | null;
  precisionAtK: number | null;
  hitRate: number | null;
  mrr: number | null;
  ndcgAtK: number | null;
  citationPrecision: number | null;
  citationRecall: number | null;
  relevanceByRank: Array<{
    rank: number;
    relevant: boolean;
    matchedEvidenceIndices: number[];
    cited: boolean;
  }>;
}

export interface EvaluationDataset {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface EvaluationDatasetVersion {
  id: string;
  dataset_id: string;
  owner_id: string;
  version_number: number;
  status: EvaluationVersionStatus;
  change_note: string | null;
  frozen_at: string | null;
  created_at: string;
}

export interface EvaluationCase {
  id: string;
  dataset_version_id: string;
  owner_id: string;
  case_key: string;
  question: string;
  reference_answer: string | null;
  reference_facts: string[];
  expected_evidence: ExpectedEvidence[];
  answerable: boolean;
  tags: string[];
  language: string | null;
  difficulty: "easy" | "medium" | "hard";
  rubric: Record<string, JsonValue>;
  notes: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface EvaluationRun {
  id: string;
  owner_id: string;
  dataset_version_id: string;
  name: string;
  status: EvaluationRunStatus;
  pipeline_config: Record<string, JsonValue>;
  case_count: number;
  completed_count: number;
  succeeded_count: number;
  failed_count: number;
  aggregate_metrics: Record<string, JsonValue>;
  baseline_run_id: string | null;
  regression_thresholds: Partial<Record<DeterministicMetricKey, number>>;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface EvaluationCaseRun {
  id: string;
  owner_id: string;
  evaluation_run_id: string;
  evaluation_case_id: string;
  rag_run_id: string | null;
  status: EvaluationCaseRunStatus;
  question_snapshot: string;
  reference_answer_snapshot: string | null;
  reference_facts_snapshot: string[];
  expected_evidence_snapshot: ExpectedEvidence[];
  rubric_snapshot: Record<string, JsonValue>;
  actual_answer: string | null;
  retrieved_contexts: RagRetrievedContext[] | null;
  citations: RagCitation[] | null;
  rag_usage: Record<string, JsonValue> | null;
  rag_timings: Record<string, JsonValue> | null;
  rag_pipeline_config: Record<string, JsonValue> | null;
  deterministic_metrics: DeterministicEvaluationMetrics | Record<string, never>;
  case_attributes_snapshot: {
    caseKey?: string;
    answerable?: boolean;
    tags?: string[];
    language?: string | null;
    difficulty?: "easy" | "medium" | "hard";
  };
  error: Record<string, JsonValue> | null;
  manual_score: {
    correctness?: number;
    faithfulness?: number;
    citationQuality?: number;
  };
  reviewer_decision: ReviewerDecision;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EvaluationJudgeBatch {
  id: string;
  owner_id: string;
  evaluation_run_id: string;
  name: string;
  status: EvaluationJudgeBatchStatus;
  framework: "ragas";
  framework_version: string | null;
  evaluator_config: {
    provider?: "openai";
    model?: RagGenerationModel;
    embeddingModel?: string;
  };
  metric_config: {
    metrics?: RagasMetricKey[];
    contractVersion?: string;
  };
  case_count: number;
  completed_count: number;
  succeeded_count: number;
  failed_count: number;
  aggregate_metrics: {
    metrics?: Partial<Record<RagasMetricKey, {
      average: number | null;
      sampleCount: number;
      unavailableCount: number;
    }>>;
    usage?: {
      requests?: number;
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
    };
  };
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface EvaluationJudgeCaseRun {
  id: string;
  owner_id: string;
  judge_batch_id: string;
  evaluation_case_run_id: string;
  status: EvaluationJudgeCaseRunStatus;
  scores: Partial<Record<RagasMetricKey, number>>;
  metric_details: Partial<Record<RagasMetricKey, {
    score?: number | null;
    reason?: string | null;
    status: "succeeded" | "failed" | "unavailable";
    error?: string | null;
  }>>;
  prompt_manifest: Record<string, JsonValue>;
  usage: Record<string, JsonValue>;
  error: Record<string, JsonValue> | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EvaluationWorkspace {
  datasets: EvaluationDataset[];
  versions: EvaluationDatasetVersion[];
  cases: EvaluationCase[];
  runs: EvaluationRun[];
  caseRuns: EvaluationCaseRun[];
  judgeBatches: EvaluationJudgeBatch[];
  judgeCaseRuns: EvaluationJudgeCaseRun[];
}

export type DocumentGroundTruthStatus = "draft" | "frozen" | "archived";

export interface DocumentEvaluationBenchmark {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  document_hash: string | null;
  file_name: string;
  mime_type: string;
  source_storage_key: string | null;
  attributes: {
    documentType?: string;
    language?: string;
    layout?: string;
    quality?: string;
    tags?: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface DocumentEvaluationGroundTruth {
  id: string;
  benchmark_id: string;
  owner_id: string;
  version_number: number;
  status: DocumentGroundTruthStatus;
  source_parse_result_id: number | null;
  normalized_document: NormalizedDocument;
  notes: string | null;
  frozen_at: string | null;
  created_at: string;
  updated_at: string;
}

export type DocumentEvaluationGroundTruthSummary = Omit<
  DocumentEvaluationGroundTruth,
  "normalized_document"
>;

export interface DocumentEvaluationRun {
  id: string;
  benchmark_id: string;
  ground_truth_id: string;
  owner_id: string;
  parse_result_id: number | null;
  status: "completed" | "failed";
  framework_version: string;
  reference_snapshot: NormalizedDocument;
  candidate_snapshot: NormalizedDocument;
  candidate_metadata: {
    runId?: string | null;
    engineId?: string | null;
    parserType?: string;
    model?: string | null;
    version?: string | null;
    config?: Record<string, JsonValue> | null;
    processingTime?: number | null;
  };
  metrics: DocumentEvaluationMetrics;
  issues: DocumentEvaluationIssue[];
  issue_count: number;
  error: Record<string, JsonValue> | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export type DocumentEvaluationRunSummary = Omit<
  DocumentEvaluationRun,
  "reference_snapshot" | "candidate_snapshot" | "issues"
>;

export interface DocumentEvaluationCandidate {
  id: number;
  run_id: string | null;
  document_hash: string | null;
  parser_type: string;
  engine_id: string | null;
  parser_model: string | null;
  parser_version: string | null;
  run_status: string;
  file_name: string;
  mime_type: string;
  processing_time: number | null;
  created_at: string;
}

export interface DocumentEvaluationWorkspace {
  benchmarks: DocumentEvaluationBenchmark[];
  groundTruths: DocumentEvaluationGroundTruthSummary[];
  runs: DocumentEvaluationRunSummary[];
  candidates: DocumentEvaluationCandidate[];
}

// Splitter information map
export const SPLITTER_INFO: Record<SplitterType, SplitterDescription> = {
  CharacterTextSplitter: {
    name: "Character Text Splitter",
    description:
      "특정 구분자를 기준으로 텍스트를 분할합니다. 가장 단순한 형태의 스플리터입니다.",
    useCases: [
      "단순한 텍스트 분할이 필요할 때",
      "특정 구분자(예: 줄바꿈, 마침표)를 기준으로 나누고 싶을 때",
      "구조가 일정한 문서를 처리할 때",
    ],
    parameters: [
      {
        name: "chunkSize",
        description: "각 청크의 최대 문자 수",
        type: "number",
        default: 1000,
        required: true,
      },
      {
        name: "chunkOverlap",
        description: "연속된 청크 간 중복되는 문자 수",
        type: "number",
        default: 200,
        required: true,
      },
      {
        name: "separator",
        description: "텍스트를 나누는 기준 구분자",
        type: "string",
        default: "\n\n",
        required: false,
      },
    ],
  },
  RecursiveCharacterTextSplitter: {
    name: "Recursive Character Text Splitter",
    description:
      "여러 구분자를 계층적으로 시도하여 텍스트를 분할합니다. 가장 권장되는 범용 스플리터입니다.",
    useCases: [
      "일반적인 텍스트 문서 처리 (권장)",
      "단락, 문장 구조를 유지하면서 분할하고 싶을 때",
      "자연스러운 경계에서 텍스트를 나누고 싶을 때",
    ],
    parameters: [
      {
        name: "chunkSize",
        description: "각 청크의 최대 문자 수",
        type: "number",
        default: 1000,
        required: true,
      },
      {
        name: "chunkOverlap",
        description: "연속된 청크 간 중복되는 문자 수",
        type: "number",
        default: 200,
        required: true,
      },
      {
        name: "separators",
        description: "계층적으로 시도할 구분자 목록 (우선순위 순)",
        type: "string[]",
        default: '["\\n\\n", "\\n", " ", ""]',
        required: false,
      },
    ],
  },
  TokenTextSplitter: {
    name: "Token Text Splitter",
    description:
      "토큰 단위로 텍스트를 정확하게 분할합니다. OpenAI 모델 사용 시 유용합니다.",
    useCases: [
      "LLM의 토큰 제한을 정확하게 맞춰야 할 때",
      "OpenAI API를 사용하는 경우",
      "토큰 수를 기준으로 비용을 계산해야 할 때",
    ],
    parameters: [
      {
        name: "chunkSize",
        description: "각 청크의 최대 토큰 수",
        type: "number",
        default: 1000,
        required: true,
      },
      {
        name: "chunkOverlap",
        description: "연속된 청크 간 중복되는 토큰 수",
        type: "number",
        default: 200,
        required: true,
      },
      {
        name: "encodingName",
        description: "사용할 인코딩 방식 (예: cl100k_base, p50k_base)",
        type: "string",
        default: "cl100k_base",
        required: false,
      },
    ],
  },
  MarkdownTextSplitter: {
    name: "Markdown Text Splitter",
    description:
      "Markdown 문서의 구조(헤더, 리스트 등)를 유지하면서 텍스트를 분할합니다.",
    useCases: [
      "Markdown 문서를 처리할 때",
      "기술 문서나 README 파일 분할 시",
      "블로그 포스트나 문서 구조를 유지하고 싶을 때",
    ],
    parameters: [
      {
        name: "chunkSize",
        description: "각 청크의 최대 문자 수",
        type: "number",
        default: 1000,
        required: true,
      },
      {
        name: "chunkOverlap",
        description: "연속된 청크 간 중복되는 문자 수",
        type: "number",
        default: 200,
        required: true,
      },
    ],
  },
  LatexTextSplitter: {
    name: "LaTeX Text Splitter",
    description:
      "LaTeX 문서의 구조(섹션, 서브섹션 등)를 유지하면서 텍스트를 분할합니다.",
    useCases: [
      "LaTeX 논문이나 문서를 처리할 때",
      "학술 문서를 분할할 때",
      "수식과 텍스트가 혼합된 문서를 처리할 때",
    ],
    parameters: [
      {
        name: "chunkSize",
        description: "각 청크의 최대 문자 수",
        type: "number",
        default: 1000,
        required: true,
      },
      {
        name: "chunkOverlap",
        description: "연속된 청크 간 중복되는 문자 수",
        type: "number",
        default: 200,
        required: true,
      },
    ],
  },
  CodeSplitter: {
    name: "Code Splitter",
    description:
      "프로그래밍 언어의 구조(함수, 클래스 등)를 유지하면서 코드를 분할합니다.",
    useCases: [
      "소스 코드를 처리할 때",
      "코드 문서화나 분석 시",
      "함수나 클래스 단위로 코드를 나누고 싶을 때",
    ],
    parameters: [
      {
        name: "chunkSize",
        description: "각 청크의 최대 문자 수",
        type: "number",
        default: 1000,
        required: true,
      },
      {
        name: "chunkOverlap",
        description: "연속된 청크 간 중복되는 문자 수",
        type: "number",
        default: 200,
        required: true,
      },
      {
        name: "language",
        description: "프로그래밍 언어 (예: python, javascript, typescript)",
        type: "string",
        default: "python",
        required: true,
      },
    ],
  },
  SemanticChunker: {
    name: "Semantic Chunker",
    description:
      "임베딩을 사용하여 의미적으로 유사한 문장들을 그룹화하여 분할합니다. OpenAI API가 필요합니다.",
    useCases: [
      "의미적으로 관련된 내용을 함께 유지하고 싶을 때",
      "문맥을 최대한 보존하면서 분할하고 싶을 때",
      "고품질의 의미 기반 청킹이 필요할 때",
    ],
    parameters: [
      {
        name: "breakpointType",
        description: "문장 경계를 결정하는 방식 (percentile, standard_deviation, interquartile, gradient)",
        type: "string",
        default: "percentile",
        required: false,
      },
    ],
  },
};
