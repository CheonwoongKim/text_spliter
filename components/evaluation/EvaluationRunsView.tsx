"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  EvaluationCaseRun,
  EvaluationRun,
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
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
  onReview: (caseRunId: string, payload: ReviewPayload) => Promise<void>;
  reviewSaving: boolean;
}

function statusClass(status: string): string {
  if (status === "completed" || status === "succeeded" || status === "pass") return "text-green-500 bg-green-500/10";
  if (status === "failed" || status === "fail") return "text-red-500 bg-red-500/10";
  if (status === "running") return "text-blue-500 bg-blue-500/10";
  return "text-muted-foreground bg-muted";
}

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
      <span className="block text-xs font-medium text-muted-foreground mb-2">{label}</span>
      <select
        value={value || ""}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : undefined)}
        className="w-full h-10 px-3 border border-border rounded-lg bg-surface text-sm text-card-foreground"
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
  selectedRunId,
  onSelectRun,
  onReview,
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

  if (!runs.length) {
    return (
      <div className="h-full flex items-center justify-center text-center px-8">
        <div>
          <p className="text-sm font-medium text-card-foreground">아직 평가 실행이 없습니다</p>
          <p className="text-xs text-muted-foreground mt-2">Golden set에서 케이스를 선택해 첫 실행을 만드세요.</p>
        </div>
      </div>
    );
  }

  const metrics = (selectedRun?.aggregate_metrics || {}) as Record<string, unknown>;
  const manualAverages = (metrics.manualAverages || {}) as Record<string, unknown>;

  return (
    <div className="h-full grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="h-full overflow-y-auto border-r border-border bg-card/30">
        <div className="px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Run history</p>
        </div>
        <div>
          {runs.map((run) => (
            <button
              key={run.id}
              type="button"
              onClick={() => onSelectRun(run.id)}
              className={`w-full text-left px-5 py-4 border-b border-border transition-colors ${
                selectedRun?.id === run.id ? "bg-accent/10" : "hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-card-foreground truncate">{run.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusClass(run.status)}`}>{run.status}</span>
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>{run.completed_count}/{run.case_count} cases</span>
                <span>{new Date(run.created_at).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="h-full min-w-0 flex flex-col overflow-hidden">
        {selectedRun && (
          <div className="px-7 py-5 border-b border-border bg-card/40">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-card-foreground">{selectedRun.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusClass(selectedRun.status)}`}>{selectedRun.status}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-mono">{selectedRun.id}</p>
              </div>
              <div className="flex items-center gap-5 text-center">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Success</p>
                  <p className="text-sm font-semibold text-card-foreground mt-1">{percent(metrics.successRate)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Reviewed</p>
                  <p className="text-sm font-semibold text-card-foreground mt-1">{String(metrics.reviewedCount ?? 0)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pass</p>
                  <p className="text-sm font-semibold text-card-foreground mt-1">{percent(metrics.passRate)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Correctness</p>
                  <p className="text-sm font-semibold text-card-foreground mt-1">{numberMetric(manualAverages.correctness)}</p>
                </div>
              </div>
            </div>
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
                  selectedCaseRun?.id === caseRun.id ? "bg-muted/70" : "hover:bg-muted/30"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 flex-shrink-0 rounded-full bg-muted text-xs text-muted-foreground flex items-center justify-center">{index + 1}</span>
                  <div className="min-w-0">
                    <p className="text-xs leading-5 text-card-foreground line-clamp-3">{caseRun.question_snapshot}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${statusClass(caseRun.status)}`}>{caseRun.status}</span>
                      {caseRun.reviewer_decision !== "pending" && (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${statusClass(caseRun.reviewer_decision)}`}>{caseRun.reviewer_decision}</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="overflow-y-auto">
            {!selectedCaseRun ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">케이스 실행을 선택하세요.</div>
            ) : (
              <div className="max-w-5xl mx-auto px-7 py-7 space-y-8">
                <section>
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Question</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusClass(selectedCaseRun.status)}`}>{selectedCaseRun.status}</span>
                  </div>
                  <p className="text-base leading-7 text-card-foreground">{selectedCaseRun.question_snapshot}</p>
                  {selectedCaseRun.error && (
                    <pre className="mt-4 p-3 border border-red-500/20 bg-red-500/10 rounded-lg text-xs text-red-500 whitespace-pre-wrap">{JSON.stringify(selectedCaseRun.error, null, 2)}</pre>
                  )}
                </section>

                <section className="grid grid-cols-1 2xl:grid-cols-2 gap-7 border-t border-border pt-7">
                  <div>
                    <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Reference answer</h4>
                    <p className="text-sm leading-6 text-card-foreground whitespace-pre-wrap">{selectedCaseRun.reference_answer_snapshot || "기준 답변 없음"}</p>
                    {!!selectedCaseRun.reference_facts_snapshot.length && (
                      <ul className="mt-4 space-y-2">
                        {selectedCaseRun.reference_facts_snapshot.map((fact, index) => (
                          <li key={`${index}-${fact}`} className="flex gap-2 text-xs leading-5 text-muted-foreground">
                            <span className="text-accent">•</span><span>{fact}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Actual answer</h4>
                    <p className="text-sm leading-6 text-card-foreground whitespace-pre-wrap">{selectedCaseRun.actual_answer || "생성된 답변 없음"}</p>
                  </div>
                </section>

                <section className="border-t border-border pt-7">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-medium text-card-foreground">Evidence review</h4>
                      <p className="text-xs text-muted-foreground mt-1">기대 근거와 실제 검색 근거를 나란히 검토합니다.</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{selectedCaseRun.retrieved_contexts?.length || 0} retrieved</span>
                  </div>
                  {!!selectedCaseRun.expected_evidence_snapshot.length && (
                    <div className="mb-5">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Expected</p>
                      <div className="space-y-2">
                        {selectedCaseRun.expected_evidence_snapshot.map((evidence, index) => (
                          <div key={index} className="px-3 py-2 border-l-2 border-accent bg-accent/5 text-xs text-card-foreground font-mono break-all">
                            {JSON.stringify(evidence)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-3">
                    {(selectedCaseRun.retrieved_contexts || []).map((context) => (
                      <details key={`${context.rank}-${context.chunkId}`} className="border-b border-border pb-3">
                        <summary className="cursor-pointer list-none flex items-center justify-between gap-3 text-xs">
                          <span className="text-card-foreground"><strong className="text-accent mr-2">[{context.rank}]</strong>chunk {context.chunkId}</span>
                          <span className="text-muted-foreground">cosine {context.similarity.toFixed(4)}</span>
                        </summary>
                        <p className="mt-3 text-xs leading-5 text-card-foreground whitespace-pre-wrap max-h-56 overflow-y-auto">{context.content}</p>
                        <pre className="mt-3 text-[10px] text-muted-foreground whitespace-pre-wrap break-all">{JSON.stringify(context.metadata, null, 2)}</pre>
                      </details>
                    ))}
                  </div>
                </section>

                <section className="border-t border-border pt-7 pb-8">
                  <div className="flex items-center justify-between gap-4 mb-5">
                    <div>
                      <h4 className="text-sm font-medium text-card-foreground">Human review</h4>
                      <p className="text-xs text-muted-foreground mt-1">각 항목은 1점부터 5점까지 독립적으로 기록합니다.</p>
                    </div>
                    {selectedCaseRun.reviewed_at && <span className="text-[11px] text-muted-foreground">Reviewed {new Date(selectedCaseRun.reviewed_at).toLocaleString()}</span>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ScoreSelect label="Correctness" value={correctness} onChange={setCorrectness} />
                    <ScoreSelect label="Faithfulness" value={faithfulness} onChange={setFaithfulness} />
                    <ScoreSelect label="Citation quality" value={citationQuality} onChange={setCitationQuality} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)] gap-4 mt-4">
                    <label className="block">
                      <span className="block text-xs font-medium text-muted-foreground mb-2">Decision</span>
                      <select value={decision} onChange={(event) => setDecision(event.target.value as ReviewerDecision)} className="w-full h-10 px-3 border border-border rounded-lg bg-surface text-sm text-card-foreground">
                        <option value="pending">Pending</option>
                        <option value="pass">Pass</option>
                        <option value="fail">Fail</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="block text-xs font-medium text-muted-foreground mb-2">Notes</span>
                      <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="w-full px-3 py-2.5 border border-border rounded-lg bg-surface text-sm text-card-foreground" placeholder="판정 근거와 발견한 오류를 기록하세요." />
                    </label>
                  </div>
                  <div className="flex justify-end mt-4">
                    <button
                      type="button"
                      onClick={() => onReview(selectedCaseRun.id, {
                        manualScore: { correctness, faithfulness, citationQuality },
                        decision,
                        notes,
                      })}
                      disabled={reviewSaving || selectedCaseRun.status === "pending" || selectedCaseRun.status === "running"}
                      className="px-5 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50"
                    >
                      {reviewSaving ? "Saving..." : "Save review"}
                    </button>
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
