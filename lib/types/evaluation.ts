import type { NormalizedDocument } from "@/lib/document-ir";
import type {
  DocumentEvaluationIssue,
  DocumentEvaluationMetrics,
} from "@/lib/document-evaluation";
import type { JsonValue } from "@/lib/types/json";
import type {
  RagCitation,
  RagGenerationModel,
  RagRetrievedContext,
} from "@/lib/types/vectorstore";

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
