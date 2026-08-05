"use client";

import { evaluationControlStyles as styles } from "@/components/evaluation/controlStyles";
import type { EvaluationRun, RagGenerationModel, RagasMetricKey } from "@/lib/types";

const METRICS: Array<{ key: RagasMetricKey; label: string; description: string }> = [
  { key: "faithfulness", label: "Faithfulness", description: "답변의 주장이 검색 문맥으로 뒷받침되는지 평가합니다." },
  { key: "answerRelevancy", label: "Answer relevancy", description: "답변이 질문의 의도에 직접 대응하는지 평가합니다." },
  { key: "contextPrecision", label: "Context precision", description: "검색 상위 문맥이 기준 답변에 얼마나 유용한지 평가합니다." },
  { key: "contextRecall", label: "Context recall", description: "기준 답변의 정보를 검색 문맥이 얼마나 포함하는지 평가합니다." },
];

interface WorkerHealth {
  frameworkVersion: string;
  workerVersion: string;
  allowedModels: string[];
  supportedMetrics: string[];
}

interface RagasEvaluationModalProps {
  open: boolean;
  run: EvaluationRun | null;
  model: RagGenerationModel;
  metrics: RagasMetricKey[];
  health: WorkerHealth | null;
  healthError: string | null;
  executionError: string | null;
  checking: boolean;
  executing: boolean;
  progress: { completed: number; total: number };
  onModelChange: (model: RagGenerationModel) => void;
  onToggleMetric: (metric: RagasMetricKey) => void;
  onClose: () => void;
  onRun: () => void;
}

export default function RagasEvaluationModal({
  open,
  run,
  model,
  metrics,
  health,
  healthError,
  executionError,
  checking,
  executing,
  progress,
  onModelChange,
  onToggleMetric,
  onClose,
  onRun,
}: RagasEvaluationModalProps) {
  if (!open || !run) return null;
  const available = Boolean(health) && !healthError;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-xl shadow-2xl p-6">
        <div className="flex items-start justify-between gap-5">
          <div>
            <h3 className="text-lg font-semibold text-card-foreground">Run Ragas evaluation</h3>
            <p className="text-xs text-muted-foreground mt-1">완료된 RAG 결과를 별도의 모델 판정 배치로 평가합니다.</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[11px] ${available ? "bg-green-500/10 text-green-500" : healthError ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground"}`}>
            {checking ? "Checking worker" : available ? `Ragas ${health?.frameworkVersion}` : "Worker unavailable"}
          </span>
        </div>

        <div className="mt-5 py-3 border-y border-border">
          <p className="text-xs font-medium text-card-foreground truncate">{run.name}</p>
          <p className="text-[11px] text-muted-foreground mt-1">성공한 {run.succeeded_count}개 케이스 · 이전 RAG 응답과 검색 문맥은 변경하지 않습니다.</p>
        </div>

        <label className="block mt-5">
          <span className="block text-xs font-medium text-muted-foreground mb-2">Evaluator model</span>
          <select value={model} onChange={(event) => onModelChange(event.target.value as RagGenerationModel)} disabled={executing} className={styles.field}>
            <option value="gpt-5.6-terra" disabled={health ? !health.allowedModels.includes("gpt-5.6-terra") : false}>GPT-5.6 Terra · balanced</option>
            <option value="gpt-5.6-sol" disabled={health ? !health.allowedModels.includes("gpt-5.6-sol") : false}>GPT-5.6 Sol · strongest</option>
            <option value="gpt-5.6-luna" disabled={health ? !health.allowedModels.includes("gpt-5.6-luna") : false}>GPT-5.6 Luna · fastest</option>
          </select>
        </label>

        <fieldset className="mt-5" disabled={executing}>
          <legend className="text-xs font-medium text-muted-foreground mb-2">Metrics</legend>
          <div className="border-t border-border">
            {METRICS.map((metric) => {
              const supported = health?.supportedMetrics.includes(metric.key) !== false;
              return (
                <label key={metric.key} className={`flex items-start gap-3 py-3 border-b border-border ${supported ? "cursor-pointer" : "opacity-50"}`}>
                  <input
                    type="checkbox"
                    checked={metrics.includes(metric.key)}
                    onChange={() => onToggleMetric(metric.key)}
                    disabled={!supported || executing}
                    className="mt-0.5 rounded border-border text-accent focus:ring-accent"
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-card-foreground">{metric.label}</span>
                    <span className="block text-[11px] leading-5 text-muted-foreground mt-0.5">{metric.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-5 px-4 py-3 bg-muted/50 border-l-2 border-accent text-xs leading-5 text-muted-foreground">
          선택한 지표는 케이스마다 여러 OpenAI 호출을 만들 수 있으며 Answer relevancy는 text-embedding-3-small도 사용합니다. 기준 답변이 없는 케이스의 Context 지표는 0점 대신 unavailable로 기록됩니다.
        </div>
        {healthError && <p className="mt-4 text-xs text-red-500">{healthError}</p>}
        {executionError && (
          <div role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {executionError}
          </div>
        )}

        {executing && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2"><span>Evaluating cases</span><span>{progress.completed}/{progress.total}</span></div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-accent transition-all duration-300" style={{ width: `${progress.total ? (progress.completed / progress.total) * 100 : 0}%` }} /></div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={onClose} disabled={executing} className={styles.textButton}>Cancel</button>
          <button type="button" onClick={onRun} disabled={checking || executing || !available || !health?.allowedModels.includes(model) || !metrics.length || run.succeeded_count === 0} className={styles.primaryButton}>
            {executing ? "Evaluating..." : `Evaluate ${run.succeeded_count} cases`}
          </button>
        </div>
      </div>
    </div>
  );
}
