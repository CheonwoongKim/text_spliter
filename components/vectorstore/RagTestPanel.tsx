"use client";

import { useEffect, useMemo, useState } from "react";

import { getAuthToken } from "@/lib/auth";
import type {
  RagGenerationModel,
  RagReasoningEffort,
  RagRunResult,
} from "@/lib/types";

interface RagTestPanelProps {
  selectedSchema?: string;
  selectedTable?: string;
}

interface ApiErrorBody {
  error?: string;
  details?: string;
  code?: string;
  instructions?: string;
  runId?: string | null;
}

const GENERATION_MODELS: Array<{ value: RagGenerationModel; label: string }> = [
  { value: "gpt-5.6-terra", label: "GPT-5.6 Terra · balanced" },
  { value: "gpt-5.6-sol", label: "GPT-5.6 Sol · highest quality" },
  { value: "gpt-5.6-luna", label: "GPT-5.6 Luna · efficient" },
];

function formatDuration(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${value}ms`;
}

function usageValue(usage: Record<string, unknown> | undefined, key: string): number | null {
  const value = usage?.[key];
  return typeof value === "number" ? value : null;
}

export default function RagTestPanel({
  selectedSchema,
  selectedTable,
}: RagTestPanelProps) {
  const [question, setQuestion] = useState("");
  const [topK, setTopK] = useState(5);
  const [embeddingModel, setEmbeddingModel] = useState("text-embedding-3-small");
  const [generationModel, setGenerationModel] = useState<RagGenerationModel>("gpt-5.6-terra");
  const [reasoningEffort, setReasoningEffort] = useState<RagReasoningEffort>("low");
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [result, setResult] = useState<RagRunResult | null>(null);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [manualSql, setManualSql] = useState<string | null>(null);

  useEffect(() => {
    setResult(null);
    setError(null);
    setSetupMessage(null);
    setManualSql(null);
  }, [selectedSchema, selectedTable]);

  const citedRanks = useMemo(
    () => new Set(result?.citations.map((citation) => citation.rank) || []),
    [result]
  );

  const handleSetup = async () => {
    if (!selectedTable) return;

    const token = getAuthToken();
    if (!token) {
      setError({ error: "로그인이 필요합니다." });
      return;
    }

    setSetupLoading(true);
    setSetupMessage(null);
    setManualSql(null);
    setError(null);
    try {
      const response = await fetch("/api/vectorstore/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          schema: selectedSchema || "public",
          tableName: selectedTable,
          vectorDimension: 1536,
        }),
      });
      const data = (await response.json()) as ApiErrorBody & { success?: boolean };
      if (!response.ok) {
        setManualSql(data.instructions || null);
        throw data;
      }

      setSetupMessage("검색 함수가 준비되었습니다. 이제 질문을 실행할 수 있습니다.");
    } catch (caught) {
      const body = caught as ApiErrorBody;
      setError({
        error: body.error || "검색 함수 설정에 실패했습니다.",
        details: body.details,
      });
    } finally {
      setSetupLoading(false);
    }
  };

  const handleRun = async () => {
    if (!selectedTable || !question.trim()) return;

    const token = getAuthToken();
    if (!token) {
      setError({ error: "로그인이 필요합니다." });
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/rag/runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: question.trim(),
          schema: selectedSchema || "public",
          tableName: selectedTable,
          topK,
          embeddingModel,
          generationModel,
          reasoningEffort,
        }),
      });
      const data = (await response.json()) as RagRunResult & ApiErrorBody;
      if (!response.ok) throw data;
      setResult(data);
    } catch (caught) {
      const body = caught as ApiErrorBody;
      setError({
        error: body.error || "RAG 실행에 실패했습니다.",
        details: body.details,
        code: body.code,
        runId: body.runId,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!selectedTable) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        왼쪽에서 테스트할 벡터 테이블을 선택하세요.
      </div>
    );
  }

  const inputTokens = usageValue(result?.usage.generation, "input_tokens");
  const outputTokens = usageValue(result?.usage.generation, "output_tokens");

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div>
              <h4 className="text-base font-semibold text-card-foreground">Grounded RAG test</h4>
              <p className="text-xs text-muted-foreground mt-1">
                검색 문맥과 답변 설정을 실행 기록으로 저장해 같은 조건을 다시 비교합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSetup}
              disabled={setupLoading || loading}
              className="px-3 py-2 rounded-lg border border-border text-xs font-medium text-card-foreground hover:bg-muted disabled:opacity-50"
            >
              {setupLoading ? "설정 중..." : "Search Setup"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
            <label className="block">
              <span className="block text-xs font-medium text-muted-foreground mb-1.5">Embedding</span>
              <select
                value={embeddingModel}
                onChange={(event) => setEmbeddingModel(event.target.value)}
                disabled={loading}
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm text-card-foreground"
              >
                <option value="text-embedding-3-small">3-small · recommended</option>
                <option value="text-embedding-ada-002">ada-002 · legacy tables</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-muted-foreground mb-1.5">Answer model</span>
              <select
                value={generationModel}
                onChange={(event) => setGenerationModel(event.target.value as RagGenerationModel)}
                disabled={loading}
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm text-card-foreground"
              >
                {GENERATION_MODELS.map((model) => (
                  <option key={model.value} value={model.value}>{model.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-muted-foreground mb-1.5">Reasoning</span>
              <select
                value={reasoningEffort}
                onChange={(event) => setReasoningEffort(event.target.value as RagReasoningEffort)}
                disabled={loading}
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm text-card-foreground"
              >
                <option value="none">None</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-muted-foreground mb-1.5">Top K</span>
              <input
                type="number"
                min={1}
                max={20}
                value={topK}
                onChange={(event) => setTopK(Number(event.target.value))}
                disabled={loading}
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-sm text-card-foreground"
              />
            </label>
          </div>

          <label className="block">
            <span className="block text-xs font-medium text-muted-foreground mb-1.5">Question</span>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="이 문서에서 확인하고 싶은 내용을 질문하세요."
              rows={4}
              disabled={loading}
              className="w-full px-3 py-3 rounded-lg border border-border bg-surface text-sm text-card-foreground resize-y focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </label>

          <div className="flex items-center justify-between gap-4 mt-4">
            <p className="text-xs text-muted-foreground">
              대상: {selectedSchema || "public"}.{selectedTable}
            </p>
            <button
              type="button"
              onClick={handleRun}
              disabled={loading || setupLoading || !question.trim() || topK < 1 || topK > 20}
              className="px-5 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "검색·생성 중..." : "Run RAG"}
            </button>
          </div>
        </section>

        {setupMessage && (
          <div className="rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
            {setupMessage}
          </div>
        )}

        {error && (
          <section className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">{error.error}</p>
            {error.details && <p className="text-xs text-red-500 mt-1 break-words">{error.details}</p>}
            {error.runId && <p className="text-xs text-muted-foreground mt-2">실패 기록 ID: {error.runId}</p>}
            {error.code === "RAG_SEARCH_NOT_CONFIGURED" && (
              <button
                type="button"
                onClick={handleSetup}
                disabled={setupLoading}
                className="mt-3 px-3 py-1.5 rounded-md bg-red-500 text-white text-xs font-medium disabled:opacity-50"
              >
                Search Setup 실행
              </button>
            )}
          </section>
        )}

        {manualSql && (
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <h5 className="text-sm font-medium text-card-foreground">Supabase SQL Editor에서 1회 실행</h5>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              연결한 키로 DDL을 실행할 수 없을 때 아래 SQL로 검색 함수만 설치할 수 있습니다.
            </p>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-surface border border-border p-3 text-xs text-card-foreground">
              {manualSql}
            </pre>
          </section>
        )}

        {result && (
          <>
            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs font-medium text-green-500">SUCCEEDED</p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">{result.id}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-md bg-muted px-2 py-1">{result.generation.model}</span>
                  <span className="rounded-md bg-muted px-2 py-1">{result.generation.reasoningEffort}</span>
                  <span className="rounded-md bg-muted px-2 py-1">{result.retrieval.embeddingModel}</span>
                </div>
              </div>
              <h5 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Answer</h5>
              <div className="whitespace-pre-wrap text-sm leading-7 text-card-foreground">
                {result.answer}
              </div>
            </section>

            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-base font-semibold text-card-foreground mt-1">{formatDuration(result.timings.totalMs)}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">Retrieval</p>
                <p className="text-base font-semibold text-card-foreground mt-1">{formatDuration(result.timings.retrievalMs)}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">Input tokens</p>
                <p className="text-base font-semibold text-card-foreground mt-1">{inputTokens?.toLocaleString() ?? "—"}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">Output tokens</p>
                <p className="text-base font-semibold text-card-foreground mt-1">{outputTokens?.toLocaleString() ?? "—"}</p>
              </div>
            </section>

            <section>
              <div className="flex items-end justify-between mb-3">
                <div>
                  <h5 className="text-sm font-semibold text-card-foreground">Retrieved evidence</h5>
                  <p className="text-xs text-muted-foreground mt-1">
                    답변에서 실제 참조한 근거는 cited 배지로 표시됩니다.
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{result.retrieval.results.length} chunks</span>
              </div>
              <div className="space-y-3">
                {result.retrieval.results.map((context) => (
                  <article key={`${context.rank}-${context.chunkId}`} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-semibold flex items-center justify-center">
                          {context.rank}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">chunk {context.chunkId}</span>
                        {citedRanks.has(context.rank) && (
                          <span className="rounded-full bg-green-500/10 text-green-500 px-2 py-0.5 text-[10px] font-medium">cited</span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-card-foreground">
                        cosine {Number.isFinite(context.similarity) ? context.similarity.toFixed(4) : "—"}
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-card-foreground whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                      {context.content}
                    </p>
                    <details className="mt-3">
                      <summary className="text-xs text-muted-foreground cursor-pointer">Metadata</summary>
                      <pre className="mt-2 rounded-md bg-surface border border-border p-2 text-[11px] text-muted-foreground overflow-auto">
                        {JSON.stringify(context.metadata, null, 2)}
                      </pre>
                    </details>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
