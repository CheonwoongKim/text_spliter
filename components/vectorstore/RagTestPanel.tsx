"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PanelPlaceholder from "@/components/shared/PanelPlaceholder";
import { Select } from "@/components/shared/FormFields";

import { Boxes } from "lucide-react";
import { getAuthToken } from "@/lib/auth";
import {
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_EMBEDDING_MODEL,
  describeEmbeddingModel,
  findEmbeddingModel,
} from "@/lib/constants";
import { estimateRunCost, formatUsd } from "@/lib/cost-estimate";
import { MAX_CONTEXT_TURNS, type ConversationTurn } from "@/lib/rag-conversation";
import { MANAGED_VECTOR_SCHEMA } from "@/lib/vectorstore";
import type {
  RagGenerationModel,
  RagReasoningEffort,
  RagRunResult,
} from "@/lib/types";

interface RagTestPanelProps {
  selectedSchema?: string;
  selectedTable?: string;
  /** Model the selected collection was built with; retrieval reuses it. */
  collectionEmbeddingModel?: string;
  collectionVectorDimension?: number;
  /** Prefills the question box when a past run is reused. */
  questionSeed?: { token: number; question: string } | null;
  onRunCompleted?: () => void;
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
  collectionEmbeddingModel,
  collectionVectorDimension,
  questionSeed,
  onRunCompleted,
}: RagTestPanelProps) {
  const [question, setQuestion] = useState("");
  const [topK, setTopK] = useState(5);
  // Not a choice: querying with anything other than the model the collection
  // was indexed with yields similarity scores that mean nothing.
  const embeddingModel = collectionEmbeddingModel || DEFAULT_EMBEDDING_MODEL;
  const embeddingDimensions = collectionVectorDimension || DEFAULT_EMBEDDING_DIMENSIONS;
  const embeddingProfile = findEmbeddingModel(embeddingModel, embeddingDimensions);
  const [generationModel, setGenerationModel] = useState<RagGenerationModel>("gpt-5.6-terra");
  const [reasoningEffort, setReasoningEffort] = useState<RagReasoningEffort>("low");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RagRunResult | null>(null);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Recomputed rather than read from the response so an older stored run still
  // shows a cost when the server did not record one.
  const runCost = useMemo(
    () => result
      ? estimateRunCost({
        embeddingModel: result.retrieval.resolvedEmbeddingModel || result.retrieval.embeddingModel,
        generationModel: result.generation.model,
        embeddingUsage: result.usage.embedding,
        generationUsage: result.usage.generation,
      })
      : null,
    [result],
  );

  // A conversation belongs to one collection, so switching collections ends it.
  useEffect(() => {
    setResult(null);
    setError(null);
    setConversation([]);
    setSessionId(null);
  }, [selectedSchema, selectedTable]);

  const seedToken = questionSeed?.token;
  const seedQuestion = questionSeed?.question;
  useEffect(() => {
    if (seedToken === undefined || !seedQuestion) return;
    setQuestion(seedQuestion);
  }, [seedToken, seedQuestion]);

  const endConversation = useCallback(() => {
    setConversation([]);
    setSessionId(null);
    setResult(null);
    setError(null);
    setQuestion("");
  }, []);

  const citedRanks = useMemo(
    () => new Set(result?.citations.map((citation) => citation.rank) || []),
    [result]
  );

  const handleRun = async () => {
    if (!selectedTable || !question.trim()) return;

    const token = getAuthToken();
    if (!token) {
      setError({ error: "로그인이 필요합니다." });
      return;
    }

    const askedQuestion = question.trim();
    // One session id spans the conversation so its turns can be replayed and
    // scored together.
    const activeSessionId = sessionId || crypto.randomUUID();

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
          question: askedQuestion,
          schema: selectedSchema || MANAGED_VECTOR_SCHEMA,
          tableName: selectedTable,
          topK,
          embeddingModel,
          generationModel,
          reasoningEffort,
          sessionId: activeSessionId,
          turnIndex: conversation.length,
          conversation,
        }),
      });
      const data = (await response.json()) as RagRunResult & ApiErrorBody;
      if (!response.ok) throw data;
      setResult(data);
      setSessionId(activeSessionId);
      setConversation((turns) => [
        ...turns.slice(-(MAX_CONTEXT_TURNS - 1)),
        { question: askedQuestion, answer: data.answer },
      ]);
      setQuestion("");
      onRunCompleted?.();
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
      <PanelPlaceholder
        icon={Boxes}
        title="질의할 컬렉션을 선택하세요"
        description="위에서 컬렉션을 고르면 그 인덱스에 대해 근거 기반 답변을 실행할 수 있습니다."
      />
    );
  }

  const inputTokens = usageValue(result?.usage.generation, "input_tokens");
  const outputTokens = usageValue(result?.usage.generation, "output_tokens");

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <h4 className="text-xs font-semibold text-card-foreground">Grounded RAG test</h4>
              <p className="text-xs text-muted-foreground mt-1">
                검색 문맥과 답변 설정을 실행 기록으로 저장해 같은 조건을 다시 비교합니다.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-success-surface text-xs font-medium text-success">
              Managed search ready
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
            <div className="block">
              <span className="block text-xs font-medium text-muted-foreground mb-2">임베딩</span>
              <div
                className="flex h-10 items-center rounded-lg border border-border bg-muted px-3 text-xs
                         text-card-foreground"
                title={embeddingProfile?.searchMode === "exact"
                  ? "Fixed by the collection. This width uses exact search, which is slower on large collections."
                  : "Fixed by the collection so query and chunk embeddings stay comparable"}
              >
                {describeEmbeddingModel(embeddingModel, embeddingDimensions)}
              </div>
            </div>
            <label className="block">
              <span className="block text-xs font-medium text-muted-foreground mb-2">답변 모델</span>
              <Select value={generationModel} onChange={(event) => setGenerationModel(event.target.value as RagGenerationModel)} disabled={loading}>
                {GENERATION_MODELS.map((model) => (
                  <option key={model.value} value={model.value}>{model.label}</option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-muted-foreground mb-2">추론 강도</span>
              <Select value={reasoningEffort} onChange={(event) => setReasoningEffort(event.target.value as RagReasoningEffort)} disabled={loading}>
                <option value="none">None</option>
                <option value="low">낮음</option>
                <option value="medium">보통</option>
                <option value="high">높음</option>
              </Select>
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-muted-foreground mb-2">Top K</span>
              <input
                type="number"
                min={1}
                max={20}
                value={topK}
                onChange={(event) => setTopK(Number(event.target.value))}
                disabled={loading}
                className="w-full h-10 px-3 rounded-lg border border-control bg-surface text-xs text-card-foreground"
              />
            </label>
          </div>

          {conversation.length > 0 && (
            <div className="mb-4 rounded-lg border border-border bg-upload-zone p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-card-foreground">
                  대화 {conversation.length}턴 · 후속 질문의 지시대명사를 해소합니다
                </p>
                <button
                  type="button"
                  onClick={endConversation}
                  disabled={loading}
                  className="text-xs text-muted-foreground transition-smooth hover:text-card-foreground
                           disabled:cursor-not-allowed disabled:opacity-disabled"
                >
                  New conversation
                </button>
              </div>
              <ol className="space-y-1">
                {conversation.map((turn, index) => (
                  <li key={`${index}-${turn.question.slice(0, 24)}`} className="truncate text-xs text-muted-foreground">
                    {index + 1}. {turn.question}
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-xs text-muted-foreground">
                이전 턴은 문서 근거가 아니며 인용되지 않습니다.
              </p>
            </div>
          )}

          <label className="block">
            <span className="block text-xs font-medium text-muted-foreground mb-2">
              {conversation.length > 0 ? "Follow-up question" : "Question"}
            </span>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={conversation.length > 0
                ? "이어서 질문하세요. 예: 그중 두 번째 항목은 왜 그런가요?"
                : "이 문서에서 확인하고 싶은 내용을 질문하세요."}
              rows={4}
              disabled={loading}
              className="w-full px-3 py-3 rounded-lg border border-control bg-surface text-xs text-card-foreground resize-y focus-ring"
            />
          </label>

          <div className="flex items-center justify-between gap-4 mt-4">
            <p className="text-xs text-muted-foreground">
              대상: {selectedSchema || MANAGED_VECTOR_SCHEMA}.{selectedTable}
            </p>
            <button
              type="button"
              onClick={handleRun}
              disabled={loading || !question.trim() || topK < 1 || topK > 20}
              className="px-4 py-3 rounded-lg bg-surface-foreground text-surface text-xs font-medium hover:opacity-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "검색·생성 중..." : "Run RAG"}
            </button>
          </div>
        </section>

        {error && (
          <section className="rounded-lg border border-danger-border bg-danger-surface px-4 py-3">
            <p className="text-xs font-medium text-danger">{error.error}</p>
            {error.details && <p className="text-xs text-danger mt-1 break-words">{error.details}</p>}
            {error.runId && <p className="text-xs text-muted-foreground mt-2">실패 기록 ID: {error.runId}</p>}
          </section>
        )}

        {result && (
          <>
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs font-medium text-success">SUCCEEDED</p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">{result.id}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-lg bg-muted px-2 py-1">{result.generation.model}</span>
                  <span className="rounded-lg bg-muted px-2 py-1">{result.generation.reasoningEffort}</span>
                  <span className="rounded-lg bg-muted px-2 py-1">{result.retrieval.embeddingModel}</span>
                  <span
                    className="rounded-lg bg-muted px-2 py-1"
                    title={runCost?.unpricedModels.length
                      ? `No published rate for ${runCost.unpricedModels.join(", ")}`
                      : `Estimated at rates ${runCost?.rateVersion ?? "unknown"}`}
                  >
                    {formatUsd(runCost?.totalUsd ?? null)}
                  </span>
                </div>
              </div>
              <h5 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Answer</h5>
              <div className="whitespace-pre-wrap text-xs leading-7 text-card-foreground">
                {result.answer}
              </div>
            </section>

            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xs font-semibold text-card-foreground mt-1">{formatDuration(result.timings.totalMs)}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">Retrieval</p>
                <p className="text-xs font-semibold text-card-foreground mt-1">{formatDuration(result.timings.retrievalMs)}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">Input tokens</p>
                <p className="text-xs font-semibold text-card-foreground mt-1">{inputTokens?.toLocaleString() ?? "—"}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">Output tokens</p>
                <p className="text-xs font-semibold text-card-foreground mt-1">{outputTokens?.toLocaleString() ?? "—"}</p>
              </div>
            </section>

            <section>
              <div className="flex items-end justify-between mb-3">
                <div>
                  <h5 className="text-xs font-semibold text-card-foreground">Retrieved evidence</h5>
                  <p className="text-xs text-muted-foreground mt-1">
                    답변에서 실제 참조한 근거는 cited 배지로 표시됩니다.
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{result.retrieval.results.length} chunks</span>
              </div>
              <div className="space-y-3">
                {result.retrieval.results.map((context) => (
                  <article key={`${context.rank}-${context.chunkId}`} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-upload-zone text-card-foreground text-xs font-semibold flex items-center justify-center">
                          {context.rank}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">chunk {context.chunkId}</span>
                        {citedRanks.has(context.rank) && (
                          <span className="rounded-full bg-success-surface text-success px-2 py-1 text-xs font-medium">cited</span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-card-foreground">
                        cosine {Number.isFinite(context.similarity) ? context.similarity.toFixed(4) : "—"}
                      </span>
                    </div>
                    <p className="text-xs leading-6 text-card-foreground whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                      {context.content}
                    </p>
                    <details className="mt-3">
                      <summary className="text-xs text-muted-foreground cursor-pointer">Metadata</summary>
                      <pre className="mt-2 rounded-lg bg-surface border border-border p-2 text-xs text-muted-foreground overflow-auto">
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
