"use client";

import { History } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";

import { Button } from "@/components/shared/Button";
import PanelPlaceholder from "@/components/shared/PanelPlaceholder";
import StatusMessage from "@/components/shared/StatusMessage";
import { getAuthToken } from "@/lib/auth";
import { costFromStoredRun, formatUsd } from "@/lib/cost-estimate";
import type { JsonValue } from "@/lib/types";

/**
 * Past RAG executions.
 *
 * Every run already stores its retrieval configuration, evidence, answer,
 * citations, usage, and timings so a result can be reproduced and compared.
 * Without this view that record existed only in the database.
 */

interface StoredRagRun {
  id: string;
  question: string;
  status: "running" | "succeeded" | "failed";
  answer: string | null;
  pipeline_config: Record<string, JsonValue> | null;
  usage: Record<string, JsonValue> | null;
  timings: Record<string, JsonValue> | null;
  error: Record<string, JsonValue> | null;
  created_at: string;
}

interface RagRunHistoryProps {
  /** Changes whenever a new run completes, so the list refreshes itself. */
  refreshToken: number;
  onReuseQuestion?: (question: string) => void;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function runSummary(run: StoredRagRun): { collection: string; models: string; topK: string } {
  const config = asRecord(run.pipeline_config);
  const retrieval = asRecord(config.retrieval);
  const generation = asRecord(config.generation);
  const embedding = asRecord(retrieval.embedding);

  return {
    collection: typeof retrieval.table === "string" ? retrieval.table : "—",
    models: [
      typeof embedding.model === "string" ? embedding.model.replace("text-embedding-", "") : null,
      typeof generation.model === "string" ? generation.model : null,
    ].filter(Boolean).join(" · ") || "—",
    topK: retrieval.topK === undefined ? "—" : String(retrieval.topK),
  };
}

function totalMs(run: StoredRagRun): string {
  const value = asRecord(run.timings).totalMs;
  if (typeof value !== "number") return "—";
  return value < 1000 ? `${value} ms` : `${(value / 1000).toFixed(2)} s`;
}

function statusClass(status: string): string {
  if (status === "succeeded") return "bg-success-surface text-success";
  if (status === "failed") return "bg-danger-surface text-danger";
  return "bg-muted text-muted-foreground";
}

function RagRunHistory({ refreshToken, onReuseQuestion }: RagRunHistoryProps) {
  const [runs, setRuns] = useState<StoredRagRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      if (!token) throw new Error("로그인이 필요합니다.");

      const response = await fetch("/api/rag/runs?limit=30", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("실행 이력을 불러오지 못했습니다.");
      setRuns((await response.json()) as StoredRagRun[]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "실행 이력을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchRuns(); }, [fetchRuns, refreshToken]);

  if (loading && runs.length === 0) {
    return <PanelPlaceholder loading title="실행 이력을 불러오는 중" />;
  }

  if (error) {
    return (
      <div className="p-4">
        <StatusMessage tone="danger" details={<Button variant="ghost" size="sm" className="px-0" onClick={() => void fetchRuns()}>다시 시도</Button>}>
          {error}
        </StatusMessage>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <PanelPlaceholder
        icon={History}
        title="아직 실행 이력이 없습니다"
        description="질의를 실행하면 검색 설정·근거·답변·비용이 함께 기록되어 여기에서 비교할 수 있습니다."
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="divide-y divide-border-subtle">
        {runs.map((run) => {
          const summary = runSummary(run);
          const cost = costFromStoredRun(run.usage, run.pipeline_config);
          const expanded = expandedId === run.id;

          return (
            <div key={run.id} className="px-4 py-3">
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : run.id)}
                className="w-full text-left"
                aria-expanded={expanded}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 flex-1 truncate text-xs font-medium text-card-foreground">
                    {run.question}
                  </p>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${statusClass(run.status)}`}>
                    {run.status}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{summary.collection}</span>
                  <span>·</span>
                  <span>{summary.models}</span>
                  <span>·</span>
                  <span>Top {summary.topK}</span>
                  <span>·</span>
                  <span>{totalMs(run)}</span>
                  <span>·</span>
                  <span>{formatUsd(cost?.totalUsd ?? null)}</span>
                </div>
              </button>

              {expanded && (
                <div className="mt-3 rounded-lg bg-upload-zone p-3">
                  {run.answer ? (
                    <p className="whitespace-pre-wrap text-xs leading-6 text-card-foreground">
                      {run.answer}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {typeof asRecord(run.error).message === "string"
                        ? String(asRecord(run.error).message)
                        : "저장된 답변이 없습니다."}
                    </p>
                  )}
                  {onReuseQuestion && (
                    <button
                      type="button"
                      onClick={() => onReuseQuestion(run.question)}
                      className="mt-3 text-xs font-medium text-card-foreground transition-smooth hover:opacity-hover"
                    >
                      이 질문 다시 사용
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(RagRunHistory);
