"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/shared/Button";

import ParserImpactView from "@/components/evaluation/ParserImpactView";
import { costFromStoredRun, formatUsd, sumRunCosts } from "@/lib/cost-estimate";
import type { MetricBreakdownRow } from "@/lib/evaluation-metrics";
import type {
  EvaluationCaseRun,
  EvaluationJudgeBatch,
  EvaluationJudgeCaseRun,
  EvaluationRun,
  RagasMetricKey,
  ReviewerDecision,
} from "@/lib/types";

interface ReviewPayload {
  manualScore: {
    correctness?: number;
    faithfulness?: number;
    citationQuality?: number;
  };
  decision: ReviewerDecision;
  notes: string;
}

interface EvaluationRunsViewProps {
  runs: EvaluationRun[];
  caseRuns: EvaluationCaseRun[];
  judgeBatches: EvaluationJudgeBatch[];
  judgeCaseRuns: EvaluationJudgeCaseRun[];
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
  onReview: (caseRunId: string, payload: ReviewPayload) => Promise<void>;
  onRunRagas: (run: EvaluationRun) => void;
  ragasExecuting: boolean;
  reviewSaving: boolean;
}

function statusClass(status: string): string {
  if (status === "completed" || status === "succeeded" || status === "pass" || status === "passed") return "text-success bg-success-surface";
  if (status === "failed" || status === "fail") return "text-danger bg-danger-surface";
  if (status === "running") return "text-card-foreground bg-upload-zone";
  return "text-muted-foreground bg-muted";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function signedPercent(value: unknown): string {
  if (typeof value !== "number") return "—";
  const roundedValue = Math.round(value * 1000) / 10;
  return `${roundedValue > 0 ? "+" : ""}${roundedValue}%p`;
}

const METRIC_COLUMNS = [
  ["recallAtK", "Recall@K"],
  ["precisionAtK", "Precision@K"],
  ["hitRate", "Hit rate"],
  ["mrr", "MRR"],
  ["ndcgAtK", "nDCG@K"],
  ["citationPrecision", "Citation precision"],
  ["citationRecall", "Citation recall"],
] as const;

const RAGAS_METRIC_COLUMNS: Array<[RagasMetricKey, string]> = [
  ["faithfulness", "Faithfulness"],
  ["answerRelevancy", "Answer relevancy"],
  ["contextPrecision", "Context precision"],
  ["contextRecall", "Context recall"],
];

const BREAKDOWN_LABELS = {
  documentType: "Document type",
  language: "Language",
  difficulty: "Difficulty",
  answerable: "Answerability",
  tags: "Tags",
  parser: "Parser",
  chunker: "Chunker",
  embeddingModel: "Embedding",
  generator: "Generator",
} as const;

type BreakdownDimension = keyof typeof BREAKDOWN_LABELS;

function percent(value: unknown): string {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "—";
}

function numberMetric(value: unknown): string {
  return typeof value === "number" ? value.toFixed(2) : "—";
}

function ScoreSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <label className="block">
      <span className="block text-2xs font-medium text-muted-foreground mb-2">{label}</span>
      <select
        value={value || ""}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : undefined)}
        className="w-full h-10 px-3 border border-border rounded-lg bg-surface text-xs text-card-foreground"
      >
        <option value="">Not scored</option>
        <option value="1">1 · Poor</option>
        <option value="2">2</option>
        <option value="3">3 · Acceptable</option>
        <option value="4">4</option>
        <option value="5">5 · Excellent</option>
      </select>
    </label>
  );
}

export default function EvaluationRunsView({
  runs,
  caseRuns,
  judgeBatches,
  judgeCaseRuns,
  selectedRunId,
  onSelectRun,
  onReview,
  onRunRagas,
  ragasExecuting,
  reviewSaving,
}: EvaluationRunsViewProps) {
  const selectedRun = runs.find((run) => run.id === selectedRunId) || runs[0] || null;
  const selectedRunCases = useMemo(
    () => caseRuns.filter((caseRun) => caseRun.evaluation_run_id === selectedRun?.id),
    [caseRuns, selectedRun?.id]
  );
  const [selectedCaseRunId, setSelectedCaseRunId] = useState<string | null>(null);
  const selectedCaseRun = selectedRunCases.find((caseRun) => caseRun.id === selectedCaseRunId)
    || selectedRunCases[0]
    || null;
  const [correctness, setCorrectness] = useState<number | undefined>();
  const [faithfulness, setFaithfulness] = useState<number | undefined>();
  const [citationQuality, setCitationQuality] = useState<number | undefined>();
  const [decision, setDecision] = useState<ReviewerDecision>("pending");
  const [notes, setNotes] = useState("");
  const [breakdownDimension, setBreakdownDimension] = useState<BreakdownDimension>("documentType");
  const selectedRunJudgeBatches = useMemo(
    () => judgeBatches.filter((batch) => batch.evaluation_run_id === selectedRun?.id),
    [judgeBatches, selectedRun?.id]
  );
  const [selectedJudgeBatchId, setSelectedJudgeBatchId] = useState<string | null>(null);
  const selectedJudgeBatch = selectedRunJudgeBatches.find((batch) => batch.id === selectedJudgeBatchId)
    || selectedRunJudgeBatches[0]
    || null;
  const selectedJudgeCaseRun = judgeCaseRuns.find((caseRun) =>
    caseRun.judge_batch_id === selectedJudgeBatch?.id
    && caseRun.evaluation_case_run_id === selectedCaseRun?.id
  ) || null;

  useEffect(() => {
    setSelectedCaseRunId((current) =>
      current && selectedRunCases.some((caseRun) => caseRun.id === current)
        ? current
        : selectedRunCases[0]?.id || null
    );
  }, [selectedRunCases]);

  useEffect(() => {
    setCorrectness(selectedCaseRun?.manual_score.correctness);
    setFaithfulness(selectedCaseRun?.manual_score.faithfulness);
    setCitationQuality(selectedCaseRun?.manual_score.citationQuality);
    setDecision(selectedCaseRun?.reviewer_decision || "pending");
    setNotes(selectedCaseRun?.reviewer_notes || "");
  }, [selectedCaseRun]);

  useEffect(() => {
    setSelectedJudgeBatchId((current) =>
      current && selectedRunJudgeBatches.some((batch) => batch.id === current)
        ? current
        : selectedRunJudgeBatches[0]?.id || null
    );
  }, [selectedRunJudgeBatches]);

  if (!runs.length) {
    return (
      <div className="h-full flex items-center justify-center text-center px-8">
        <div>
          <p className="text-xs font-medium text-card-foreground">아직 평가 실행이 없습니다</p>
          <p className="text-2xs text-muted-foreground mt-2">Golden set에서 케이스를 선택해 첫 실행을 만드세요.</p>
        </div>
      </div>
    );
  }

  const metrics = (selectedRun?.aggregate_metrics || {}) as Record<string, unknown>;
  const manualAverages = (metrics.manualAverages || {}) as Record<string, unknown>;
  const deterministic = asRecord(metrics.deterministic);
  const breakdowns = asRecord(metrics.breakdowns);
  // Parser attribution answers whether a better parse actually retrieves better,
  // which neither parser evaluation nor RAG evaluation shows on its own.
  const parserBreakdownRows = (Array.isArray(breakdowns.parser)
    ? breakdowns.parser
    : []) as MetricBreakdownRow[];
  const breakdownRows = Array.isArray(breakdowns[breakdownDimension])
    ? breakdowns[breakdownDimension].map(asRecord)
    : [];
  const comparison = asRecord(metrics.comparison);
  const comparisonDeltas = asRecord(comparison.deltas);
  const selectedCaseMetrics = asRecord(selectedCaseRun?.deterministic_metrics);
  const relevanceByRank = Array.isArray(selectedCaseMetrics.relevanceByRank)
    ? selectedCaseMetrics.relevanceByRank.map(asRecord)
    : [];
  const judgeAggregate = asRecord(selectedJudgeBatch?.aggregate_metrics);
  const judgeMetricAverages = asRecord(judgeAggregate.metrics);
  const judgeUsage = asRecord(judgeAggregate.usage);
  const judgeModel = selectedJudgeBatch?.evaluator_config.model || "—";
  // Summed across the cases actually executed, so an unpriced or partial run
  // reports what is known instead of an invented total.
  const runCostUsd = sumRunCosts(
    selectedRunCases.map((caseRun) =>
      costFromStoredRun(caseRun.rag_usage, caseRun.rag_pipeline_config)),
  );
  const activeJudgeBatch = selectedRunJudgeBatches.some((batch) => batch.status === "running");

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="h-full overflow-y-auto border-r border-border-subtle">
        <div className="px-4 py-4 border-b border-border-subtle sticky top-0 bg-card z-navigation">
          <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Run history</p>
        </div>
        <div>
          {runs.map((run) => (
            <button
              key={run.id}
              type="button"
              onClick={() => onSelectRun(run.id)}
              className={`w-full text-left px-4 py-4 border-b border-border transition-colors ${
                selectedRun?.id === run.id ? "bg-upload-zone" : "hover:bg-muted"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-card-foreground truncate">{run.name}</span>
                <span className={`px-2 py-1 rounded-full text-2xs font-medium ${statusClass(run.status)}`}>{run.status}</span>
              </div>
              <div className="flex items-center justify-between mt-2 text-2xs text-muted-foreground">
                <span>{run.completed_count}/{run.case_count} cases</span>
                <span>{new Date(run.created_at).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="h-full min-w-0 flex flex-col overflow-hidden">
        {selectedRun && (
          <div className="px-8 py-4 border-b border-border bg-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-card-foreground">{selectedRun.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-2xs font-medium ${statusClass(selectedRun.status)}`}>{selectedRun.status}</span>
                </div>
                <p className="text-2xs text-muted-foreground mt-1 font-mono">{selectedRun.id}</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-3 text-center">
                <div>
                  <p className="text-2xs uppercase tracking-wide text-muted-foreground">Success</p>
                  <p className="text-xs font-semibold text-card-foreground mt-1">{percent(metrics.successRate)}</p>
                </div>
                <div>
                  <p className="text-2xs uppercase tracking-wide text-muted-foreground">Recall@K</p>
                  <p className="text-xs font-semibold text-card-foreground mt-1">{percent(deterministic.recallAtK)}</p>
                </div>
                <div>
                  <p className="text-2xs uppercase tracking-wide text-muted-foreground">MRR</p>
                  <p className="text-xs font-semibold text-card-foreground mt-1">{numberMetric(deterministic.mrr)}</p>
                </div>
                <div>
                  <p className="text-2xs uppercase tracking-wide text-muted-foreground">nDCG@K</p>
                  <p className="text-xs font-semibold text-card-foreground mt-1">{numberMetric(deterministic.ndcgAtK)}</p>
                </div>
                <div>
                  <p className="text-2xs uppercase tracking-wide text-muted-foreground">Citation recall</p>
                  <p className="text-xs font-semibold text-card-foreground mt-1">{percent(deterministic.citationRecall)}</p>
                </div>
                <div>
                  <p className="text-2xs uppercase tracking-wide text-muted-foreground">Reviewed</p>
                  <p className="text-xs font-semibold text-card-foreground mt-1">{String(metrics.reviewedCount ?? 0)}</p>
                </div>
                <div>
                  <p className="text-2xs uppercase tracking-wide text-muted-foreground">Correctness</p>
                  <p className="text-xs font-semibold text-card-foreground mt-1">{numberMetric(manualAverages.correctness)}</p>
                </div>
              </div>
            </div>
            {!!comparison.baselineRunId && (
              <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`px-2 py-1 rounded-full text-2xs font-medium ${statusClass(String(comparison.status || "pending"))}`}>{String(comparison.status || "pending")}</span>
                  <p className="text-2xs text-muted-foreground truncate">{String(comparison.baselineRunName || comparison.baselineRunId)}</p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-2xs text-muted-foreground">
                  {METRIC_COLUMNS.filter(([key]) => ["recallAtK", "mrr", "ndcgAtK", "citationRecall"].includes(key)).map(([key, label]) => (
                    <span key={key}>{label} <strong className={typeof comparisonDeltas[key] === "number" && Number(comparisonDeltas[key]) < 0 ? "text-danger" : "text-card-foreground"}>{signedPercent(comparisonDeltas[key])}</strong></span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-border">
              <div className="flex flex-wrap items-center gap-3 min-w-0">
                <div>
                  <p className="text-2xs font-medium text-card-foreground">Model evaluation</p>
                  <p className="text-2xs text-muted-foreground mt-1">
                    {selectedJudgeBatch
                      ? `Ragas ${selectedJudgeBatch.framework_version || "—"} · ${judgeModel} · ${selectedJudgeBatch.completed_count}/${selectedJudgeBatch.case_count}`
                      : "Ragas 평가 배치가 없습니다."}
                  </p>
                </div>
                {selectedRunJudgeBatches.length > 0 && (
                  <select
                    value={selectedJudgeBatch?.id || ""}
                    onChange={(event) => setSelectedJudgeBatchId(event.target.value)}
                    className="h-control-md max-w-64 px-3 border border-border rounded-lg bg-surface text-2xs text-card-foreground focus-ring"
                  >
                    {selectedRunJudgeBatches.map((batch) => (
                      <option key={batch.id} value={batch.id}>{new Date(batch.created_at).toLocaleString()} · {batch.status}</option>
                    ))}
                  </select>
                )}
              </div>
              <Button variant="primary" size="sm" onClick={() => selectedRun && onRunRagas(selectedRun)} disabled={!selectedRun || selectedRun.status !== "completed" || !selectedRun.succeeded_count || ragasExecuting}>
                {ragasExecuting ? "Ragas running..." : activeJudgeBatch ? "Resume Ragas" : "Run Ragas"}
              </Button>
              {selectedJudgeBatch && (
                <div className="basis-full flex flex-wrap border-y border-border">
                  {RAGAS_METRIC_COLUMNS.map(([key, label]) => {
                    const metric = asRecord(judgeMetricAverages[key]);
                    return (
                      <div key={key} className="flex-[1_1_130px] min-w-[130px] py-3 pr-4">
                        <p className="text-2xs uppercase tracking-wide text-muted-foreground">{label}</p>
                        <p className="text-2xs font-semibold text-card-foreground mt-1">{numberMetric(metric.average)} <span className="font-normal text-muted-foreground">n={String(metric.sampleCount ?? 0)}</span></p>
                      </div>
                    );
                  })}
                  <div className="flex-[1_1_130px] min-w-[130px] py-3 pr-4">
                    <p className="text-2xs uppercase tracking-wide text-muted-foreground">Judge usage</p>
                    <p className="text-2xs font-semibold text-card-foreground mt-1">{Number(judgeUsage.totalTokens || 0).toLocaleString()} <span className="font-normal text-muted-foreground">tokens</span></p>
                  </div>
                  <div className="flex-[1_1_130px] min-w-[130px] py-3 pr-4">
                    <p className="text-2xs uppercase tracking-wide text-muted-foreground">Retrieval cost</p>
                    <p className="text-2xs font-semibold text-card-foreground mt-1" title="Estimated embedding and answer cost for this run">{formatUsd(runCostUsd)} <span className="font-normal text-muted-foreground">est.</span></p>
                  </div>
                </div>
              )}
            </div>
            <details className="mt-4 pt-4 border-t border-border group">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-2xs font-medium text-card-foreground">
                <span>Parser impact on retrieval</span>
                <span className="text-2xs font-normal text-muted-foreground group-open:hidden">파서별 검색 품질 비교</span>
              </summary>
              <div className="mt-4">
                <ParserImpactView parserBreakdown={parserBreakdownRows} />
              </div>
            </details>
            <details className="mt-4 pt-4 border-t border-border group">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-2xs font-medium text-card-foreground">
                <span>Metric breakdown</span>
                <span className="text-2xs font-normal text-muted-foreground group-open:hidden">문서·파서·모델별 결과 보기</span>
              </summary>
              <div className="mt-4">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <select value={breakdownDimension} onChange={(event) => setBreakdownDimension(event.target.value as BreakdownDimension)} className="h-control-md min-w-44 px-3 border border-border rounded-lg bg-surface text-2xs text-card-foreground focus-ring">
                    {Object.entries(BREAKDOWN_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                  <span className="text-2xs text-muted-foreground">점수 없는 케이스는 평균에서 제외됩니다.</span>
                </div>
                <div className="overflow-x-auto border border-border rounded-lg">
                  <table className="w-full min-w-[680px] text-2xs">
                    <thead className="bg-upload-zone text-muted-foreground">
                      <tr><th className="px-3 py-2 text-left font-medium">{BREAKDOWN_LABELS[breakdownDimension]}</th><th className="px-3 py-2 text-right font-medium">Cases</th><th className="px-3 py-2 text-right font-medium">Success</th><th className="px-3 py-2 text-right font-medium">Recall@K</th><th className="px-3 py-2 text-right font-medium">MRR</th><th className="px-3 py-2 text-right font-medium">nDCG@K</th><th className="px-3 py-2 text-right font-medium">Citation recall</th></tr>
                    </thead>
                    <tbody>
                      {breakdownRows.map((row) => (
                        <tr key={String(row.key)} className="border-t border-border">
                          <td className="px-3 py-2 text-card-foreground font-medium">{String(row.key)}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">{String(row.caseCount ?? 0)}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">{percent(row.successRate)}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">{percent(row.recallAtK)}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">{numberMetric(row.mrr)}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">{numberMetric(row.ndcgAtK)}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">{percent(row.citationRecall)}</td>
                        </tr>
                      ))}
                      {!breakdownRows.length && <tr><td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">분류 가능한 실행 데이터가 없습니다.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          </div>
        )}

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="overflow-y-auto border-r border-border">
            {selectedRunCases.map((caseRun, index) => (
              <button
                key={caseRun.id}
                type="button"
                onClick={() => setSelectedCaseRunId(caseRun.id)}
                className={`w-full text-left px-4 py-4 border-b border-border transition-colors ${
                  selectedCaseRun?.id === caseRun.id ? "bg-upload-zone" : "hover:bg-muted"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 flex-shrink-0 rounded-full bg-muted text-2xs text-muted-foreground flex items-center justify-center">{index + 1}</span>
                  <div className="min-w-0">
                    <p className="text-2xs leading-5 text-card-foreground line-clamp-3">{caseRun.question_snapshot}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-1 rounded-sm text-2xs ${statusClass(caseRun.status)}`}>{caseRun.status}</span>
                      {caseRun.reviewer_decision !== "pending" && (
                        <span className={`px-2 py-1 rounded-sm text-2xs ${statusClass(caseRun.reviewer_decision)}`}>{caseRun.reviewer_decision}</span>
                      )}
                      {selectedJudgeBatch && (() => {
                        const judgeCase = judgeCaseRuns.find((item) => item.judge_batch_id === selectedJudgeBatch.id && item.evaluation_case_run_id === caseRun.id);
                        return judgeCase
                          ? <span className={`px-2 py-1 rounded-sm text-2xs ${statusClass(judgeCase.status)}`}>Ragas {judgeCase.status}</span>
                          : null;
                      })()}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="overflow-y-auto">
            {!selectedCaseRun ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">케이스 실행을 선택하세요.</div>
            ) : (
              <div className="max-w-5xl mx-auto px-8 py-8 space-y-8">
                <section>
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <h4 className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Question</h4>
                    <span className={`px-2 py-1 rounded-full text-2xs font-medium ${statusClass(selectedCaseRun.status)}`}>{selectedCaseRun.status}</span>
                  </div>
                  <p className="text-xs leading-7 text-card-foreground">{selectedCaseRun.question_snapshot}</p>
                  {selectedCaseRun.error && (
                    <pre className="mt-4 p-3 border border-danger-border bg-danger-surface rounded-lg text-2xs text-danger whitespace-pre-wrap">{JSON.stringify(selectedCaseRun.error, null, 2)}</pre>
                  )}
                </section>

                <section className="grid grid-cols-1 2xl:grid-cols-2 gap-8 border-t border-border pt-8">
                  <div>
                    <h4 className="text-2xs font-medium uppercase tracking-wide text-muted-foreground mb-3">Reference answer</h4>
                    <p className="text-xs leading-6 text-card-foreground whitespace-pre-wrap">{selectedCaseRun.reference_answer_snapshot || "기준 답변 없음"}</p>
                    {!!selectedCaseRun.reference_facts_snapshot.length && (
                      <ul className="mt-4 space-y-2">
                        {selectedCaseRun.reference_facts_snapshot.map((fact, index) => (
                          <li key={`${index}-${fact}`} className="flex gap-2 text-2xs leading-5 text-muted-foreground">
                            <span className="text-card-foreground">•</span><span>{fact}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h4 className="text-2xs font-medium uppercase tracking-wide text-muted-foreground mb-3">Actual answer</h4>
                    <p className="text-xs leading-6 text-card-foreground whitespace-pre-wrap">{selectedCaseRun.actual_answer || "생성된 답변 없음"}</p>
                  </div>
                </section>

                <section className="border-t border-border pt-8">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-xs font-medium text-card-foreground">Evidence review</h4>
                      <p className="text-2xs text-muted-foreground mt-1">기대 근거와 실제 검색 근거를 나란히 검토합니다.</p>
                    </div>
                    <span className="text-2xs text-muted-foreground">{selectedCaseRun.retrieved_contexts?.length || 0} retrieved</span>
                  </div>
                  <div className="flex flex-wrap mb-4 border border-border rounded-lg overflow-hidden">
                    {METRIC_COLUMNS.map(([key, label]) => (
                      <div key={key} className="flex-[1_1_120px] min-w-[120px] px-3 py-3 border-r border-b border-border last:border-r-0">
                        <p className="text-2xs uppercase tracking-wide text-muted-foreground">{label}</p>
                        <p className="text-2xs font-semibold text-card-foreground mt-1">{key === "mrr" || key === "ndcgAtK" ? numberMetric(selectedCaseMetrics[key]) : percent(selectedCaseMetrics[key])}</p>
                      </div>
                    ))}
                  </div>
                  {!!selectedCaseRun.expected_evidence_snapshot.length && (
                    <div className="mb-4">
                      <p className="text-2xs font-medium text-muted-foreground mb-2">Expected</p>
                      <div className="space-y-2">
                        {selectedCaseRun.expected_evidence_snapshot.map((evidence, index) => (
                          <div key={index} className="px-3 py-2 border-l-2 border-surface-foreground bg-upload-zone text-2xs text-card-foreground font-mono break-all">
                            {JSON.stringify(evidence)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-3">
                    {(selectedCaseRun.retrieved_contexts || []).map((context) => {
                      const relevance = relevanceByRank.find((item) => Number(item.rank) === context.rank);
                      return (
                        <details key={`${context.rank}-${context.chunkId}`} className={`border-b pb-3 ${relevance?.relevant ? "border-success-border" : "border-border"}`}>
                          <summary className="cursor-pointer list-none flex items-center justify-between gap-3 text-2xs">
                            <span className="text-card-foreground"><strong className="text-card-foreground mr-2">[{context.rank}]</strong>chunk {context.chunkId}</span>
                            <span className="flex items-center gap-2 text-muted-foreground">{Boolean(relevance?.relevant) && <span className="text-success">matched</span>}{Boolean(relevance?.cited) && <span className="text-card-foreground">cited</span>}<span>cosine {context.similarity.toFixed(4)}</span></span>
                          </summary>
                          <p className="mt-3 text-2xs leading-5 text-card-foreground whitespace-pre-wrap max-h-56 overflow-y-auto">{context.content}</p>
                          <pre className="mt-3 text-2xs text-muted-foreground whitespace-pre-wrap break-all">{JSON.stringify(context.metadata, null, 2)}</pre>
                        </details>
                      );
                    })}
                  </div>
                </section>

                {selectedJudgeBatch && (
                  <section className="border-t border-border pt-8">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div>
                        <h4 className="text-xs font-medium text-card-foreground">Ragas model evaluation</h4>
                        <p className="text-2xs text-muted-foreground mt-1">{judgeModel} 판정 점수와 지표별 근거입니다.</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-2xs font-medium ${statusClass(selectedJudgeCaseRun?.status || "pending")}`}>{selectedJudgeCaseRun?.status || "not evaluated"}</span>
                    </div>
                    {selectedJudgeCaseRun?.status === "failed" && (
                      <pre className="mb-4 p-3 border border-danger-border bg-danger-surface rounded-lg text-2xs text-danger whitespace-pre-wrap">{JSON.stringify(selectedJudgeCaseRun.error, null, 2)}</pre>
                    )}
                    <div className="border-t border-border">
                      {RAGAS_METRIC_COLUMNS.map(([key, label]) => {
                        const detail = selectedJudgeCaseRun?.metric_details[key];
                        const score = selectedJudgeCaseRun?.scores[key];
                        return (
                          <div key={key} className="grid grid-cols-1 sm:grid-cols-[140px_70px_minmax(0,1fr)] gap-2 sm:gap-4 py-3 border-b border-border text-2xs">
                            <div>
                              <p className="font-medium text-card-foreground">{label}</p>
                              <p className={`text-2xs mt-1 ${detail?.status === "failed" ? "text-danger" : "text-muted-foreground"}`}>{detail?.status || "not selected"}</p>
                            </div>
                            <p className="font-semibold text-card-foreground tabular-nums">{numberMetric(score)}</p>
                            <p className="leading-5 text-muted-foreground whitespace-pre-wrap">{detail?.reason || detail?.error || "판정 근거가 없습니다."}</p>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                <section className="border-t border-border pt-8 pb-8">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <h4 className="text-xs font-medium text-card-foreground">Human review</h4>
                      <p className="text-2xs text-muted-foreground mt-1">각 항목은 1점부터 5점까지 독립적으로 기록합니다.</p>
                    </div>
                    {selectedCaseRun.reviewed_at && <span className="text-2xs text-muted-foreground">Reviewed {new Date(selectedCaseRun.reviewed_at).toLocaleString()}</span>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ScoreSelect label="Correctness" value={correctness} onChange={setCorrectness} />
                    <ScoreSelect label="Faithfulness" value={faithfulness} onChange={setFaithfulness} />
                    <ScoreSelect label="Citation quality" value={citationQuality} onChange={setCitationQuality} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)] gap-4 mt-4">
                    <label className="block">
                      <span className="block text-2xs font-medium text-muted-foreground mb-2">Decision</span>
                      <select value={decision} onChange={(event) => setDecision(event.target.value as ReviewerDecision)} className="w-full h-10 px-3 border border-border rounded-lg bg-surface text-xs text-card-foreground">
                        <option value="pending">Pending</option>
                        <option value="pass">Pass</option>
                        <option value="fail">Fail</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="block text-2xs font-medium text-muted-foreground mb-2">Notes</span>
                      <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="w-full px-3 py-3 border border-border rounded-lg bg-surface text-xs text-card-foreground" placeholder="판정 근거와 발견한 오류를 기록하세요." />
                    </label>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button variant="primary" size="md" onClick={() => onReview(selectedCaseRun.id, { manualScore: { correctness, faithfulness, citationQuality }, decision, notes, })} disabled={reviewSaving || selectedCaseRun.status === "pending" || selectedCaseRun.status === "running"}>
                      {reviewSaving ? "Saving..." : "Save review"}
                    </Button>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
