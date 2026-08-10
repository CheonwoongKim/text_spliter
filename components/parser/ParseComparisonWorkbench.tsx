"use client";

import { useEffect, useMemo, useState } from "react";
import { useCopyToClipboard } from "@/lib/hooks/useCopyToClipboard";
import type { ParseResponse } from "@/lib/types";

interface ParseComparisonWorkbenchProps {
  runs: ParseResponse[];
  selectedFile: File | null;
  onSelectRun?: (runId: string) => void;
  sampleMode?: boolean;
}

type EvaluationCriterionId =
  | "textAccuracy"
  | "readingOrder"
  | "tablesAndCharts"
  | "visualContext"
  | "documentStructure";

interface RunEvaluation {
  scores: Partial<Record<EvaluationCriterionId, number>>;
  notes: string;
}

const EVALUATION_CRITERIA: Array<{
  id: EvaluationCriterionId;
  label: string;
  description: string;
}> = [
  {
    id: "textAccuracy",
    label: "텍스트 정확도",
    description: "문자 누락, 오인식, 수식 및 특수문자 보존",
  },
  {
    id: "readingOrder",
    label: "읽기 순서와 맥락",
    description: "다단 문서의 순서와 문단 간 의미 연결",
  },
  {
    id: "tablesAndCharts",
    label: "표와 도표",
    description: "행·열, 병합 셀, 차트의 값과 관계 보존",
  },
  {
    id: "visualContext",
    label: "이미지 맥락",
    description: "이미지·도형·캡션과 본문 간 연결",
  },
  {
    id: "documentStructure",
    label: "문서 구조",
    description: "제목, 목록, 섹션 계층과 블록 유형 보존",
  },
];

function runId(run: ParseResponse, index: number): string {
  return run.run?.id || `legacy-run-${index}`;
}

function runLabel(run: ParseResponse, index: number): string {
  const engine = run.run?.engineId || run.metadata?.parserType || `Run ${index + 1}`;
  const model = run.run?.model;
  const role = run.run?.role === "primary" ? " · Primary" : "";
  return model ? `${engine} · ${model}${role}` : `${engine}${role}`;
}

function comparisonContent(run?: ParseResponse): { format: string; content: string } {
  if (!run) return { format: "Empty", content: "" };
  if (run.markdown) return { format: "Markdown", content: run.markdown };
  if (run.text) return { format: "Text", content: run.text };
  if (run.html) return { format: "HTML", content: run.html };
  if (run.document) return { format: "Document IR", content: JSON.stringify(run.document, null, 2) };
  if (run.json) return { format: "JSON", content: JSON.stringify(run.json, null, 2) };
  return { format: "Empty", content: "No comparable content was returned." };
}

function evaluationAverage(evaluation?: RunEvaluation): number | null {
  if (!evaluation) return null;
  const values = EVALUATION_CRITERIA
    .map((criterion) => evaluation.scores[criterion.id])
    .filter((score): score is number => typeof score === "number");

  if (values.length === 0) return null;
  return values.reduce((sum, score) => sum + score, 0) / values.length;
}

function evaluationComplete(evaluation?: RunEvaluation): boolean {
  return Boolean(
    evaluation && EVALUATION_CRITERIA.every(
      (criterion) => typeof evaluation.scores[criterion.id] === "number"
    )
  );
}

function ScorePicker({
  value,
  onChange,
  label,
}: {
  value?: number;
  onChange: (score: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-center gap-1" role="group" aria-label={label}>
      {[1, 2, 3, 4, 5].map((score) => (
        <button
          key={score}
          type="button"
          onClick={() => onChange(score)}
          aria-pressed={value === score}
          className={`w-8 h-8 rounded-lg text-xs font-medium transition-smooth ${
            value === score
              ? "bg-surface-foreground text-surface"
              : "border border-border text-muted-foreground hover:border-border-darkest hover:text-card-foreground"
          }`}
        >
          {score}
        </button>
      ))}
    </div>
  );
}

function ResultColumn({
  label,
  run,
  runs,
  selectedId,
  blockedId,
  winner,
  onChange,
  onChoose,
}: {
  label: "A" | "B";
  run?: ParseResponse;
  runs: ParseResponse[];
  selectedId: string;
  blockedId?: string;
  winner: boolean;
  onChange: (runId: string) => void;
  onChoose: () => void;
}) {
  const output = comparisonContent(run);
  const statistics = run?.document?.statistics;

  return (
    <section className={`min-h-0 flex flex-col rounded-lg border bg-card overflow-hidden ${
      winner ? "border-surface-foreground ring-1 ring-surface-foreground" : "border-border"
    }`}>
      <div className="p-3 border-b border-border bg-upload-zone">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-6 h-6 rounded-lg bg-surface-foreground text-surface flex items-center justify-center text-xs font-semibold">
            {label}
          </span>
          <select
            value={selectedId}
            onChange={(event) => onChange(event.target.value)}
            className="min-w-0 flex-1 h-8 px-2 rounded-lg border border-control bg-card text-xs text-card-foreground"
            aria-label={`Comparison result ${label}`}
          >
            {runs.map((candidate, index) => {
              const candidateId = runId(candidate, index);
              return (
                <option
                  key={candidateId}
                  value={candidateId}
                  disabled={candidateId === blockedId && candidateId !== selectedId}
                >
                  {runLabel(candidate, index)}
                </option>
              );
            })}
          </select>
          <button
            type="button"
            onClick={onChoose}
            className={`h-8 px-3 rounded-lg text-xs font-medium transition-smooth ${
              winner
                ? "bg-surface-foreground text-surface"
                : "border border-border text-muted-foreground hover:text-card-foreground"
            }`}
          >
            {winner ? "Selected" : "Choose"}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="px-2 py-1 rounded-sm bg-muted">{output.format}</span>
          {run?.metadata?.processingTime !== undefined && (
            <span>{run.metadata.processingTime}ms</span>
          )}
          {run?.run?.inputMode && (
            <span>· {run.run.inputMode}</span>
          )}
          {statistics && (
            <>
              <span>·</span>
              <span>{statistics.pageCount} pages</span>
              <span>·</span>
              <span>{statistics.blockCount} blocks</span>
            </>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-[420px] overflow-auto p-4">
        <pre className="text-xs leading-5 text-card-foreground whitespace-pre-wrap font-mono">
          {output.content}
        </pre>
      </div>
    </section>
  );
}

export default function ParseComparisonWorkbench({
  runs,
  selectedFile,
  onSelectRun,
  sampleMode = false,
}: ParseComparisonWorkbenchProps) {
  const runEntries = useMemo(
    () => runs.map((run, index) => ({ id: runId(run, index), run, index })),
    [runs]
  );
  const latestExperimentId = useMemo(
    () => [...runEntries]
      .reverse()
      .find((entry) => entry.run.run?.experimentId)
      ?.run.run?.experimentId,
    [runEntries]
  );
  const [runAId, setRunAId] = useState("");
  const [runBId, setRunBId] = useState("");
  const [winnerId, setWinnerId] = useState<string | undefined>();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [evaluations, setEvaluations] = useState<Record<string, RunEvaluation>>({});
  const { copied: copiedEvaluation, copy } = useCopyToClipboard();

  useEffect(() => {
    const latestExperimentRuns = latestExperimentId
      ? runEntries.filter((entry) => entry.run.run?.experimentId === latestExperimentId)
      : runEntries;
    const primary = latestExperimentRuns.find((entry) => entry.run.run?.role === "primary");
    const additional = latestExperimentRuns.find((entry) => entry.run.run?.role === "additional");
    const fallbackA = latestExperimentRuns[Math.max(0, latestExperimentRuns.length - 2)];
    const fallbackB = latestExperimentRuns[latestExperimentRuns.length - 1];

    setRunAId(primary?.id || fallbackA?.id || "");
    setRunBId(additional?.id || fallbackB?.id || "");
  }, [latestExperimentId, runEntries]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const runAEntry = runEntries.find((entry) => entry.id === runAId);
  const runBEntry = runEntries.find((entry) => entry.id === runBId);

  const chooseWinner = (id: string) => {
    setWinnerId(id);
    onSelectRun?.(id);
  };

  const updateScore = (
    targetRunId: string,
    criterionId: EvaluationCriterionId,
    score: number
  ) => {
    setEvaluations((current) => ({
      ...current,
      [targetRunId]: {
        notes: current[targetRunId]?.notes || "",
        scores: {
          ...current[targetRunId]?.scores,
          [criterionId]: score,
        },
      },
    }));
  };

  const updateNotes = (targetRunId: string, notes: string) => {
    setEvaluations((current) => ({
      ...current,
      [targetRunId]: {
        scores: current[targetRunId]?.scores || {},
        notes,
      },
    }));
  };

  const evaluationA = evaluations[runAId];
  const evaluationB = evaluations[runBId];
  const averageA = evaluationAverage(evaluationA);
  const averageB = evaluationAverage(evaluationB);
  const canRecommend = evaluationComplete(evaluationA) && evaluationComplete(evaluationB);

  const chooseHigherScore = () => {
    if (!canRecommend || averageA === null || averageB === null) return;
    chooseWinner(averageA >= averageB ? runAId : runBId);
  };

  const copyEvaluation = async () => {
    const payload = {
      source: selectedFile
        ? { name: selectedFile.name, size: selectedFile.size, mimeType: selectedFile.type }
        : null,
      comparedAt: new Date().toISOString(),
      selectedRunId: winnerId || null,
      runs: [runAEntry, runBEntry]
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .map((entry) => ({
          id: entry.id,
          label: runLabel(entry.run, entry.index),
          engineId: entry.run.run?.engineId,
          model: entry.run.run?.model,
          version: entry.run.run?.version,
          scores: evaluations[entry.id]?.scores || {},
          average: evaluationAverage(evaluations[entry.id]),
          notes: evaluations[entry.id]?.notes || "",
        })),
    };

    await copy(JSON.stringify(payload, null, 2));
  };

  return (
    <div className="h-full overflow-auto space-y-4 pb-4">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <section className="min-h-0 flex flex-col rounded-lg border border-border bg-card overflow-hidden">
          <div className="p-3 border-b border-border bg-upload-zone">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-card-foreground">Original</p>
                <p className="text-xs text-muted-foreground truncate mt-1">
                  {selectedFile?.name || (sampleMode ? "product-brief.pdf" : "Source file unavailable")}
                </p>
              </div>
              {selectedFile && (
                <span className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 min-h-[420px] bg-upload-zone">
            {previewUrl && selectedFile?.type === "application/pdf" ? (
              <iframe src={previewUrl} className="w-full h-full min-h-[520px]" title="Original PDF" />
            ) : previewUrl && selectedFile?.type.startsWith("image/") ? (
              <div className="h-full min-h-[420px] flex items-center justify-center p-3">
                <img src={previewUrl} alt={selectedFile.name} className="max-w-full max-h-[520px] object-contain" />
              </div>
            ) : sampleMode ? (
              <div className="h-full min-h-[420px] p-6">
                <div className="mx-auto max-w-[520px] rounded-lg border border-border bg-card p-6 shadow-sm">
                  <p className="text-base font-semibold text-card-foreground">2026 Product Brief</p>
                  <p className="mt-4 text-xs leading-5 text-card-foreground">
                    Document processing converts the source file into structured text while
                    preserving headings, paragraphs, and tables.
                  </p>
                  <div className="mt-6 grid grid-cols-2 border border-border text-xs">
                    <div className="bg-upload-zone px-3 py-2 font-medium text-card-foreground">지표</div>
                    <div className="border-l border-border bg-upload-zone px-3 py-2 font-medium text-card-foreground">결과</div>
                    <div className="border-t border-border px-3 py-2 text-muted-foreground">텍스트 정확도</div>
                    <div className="border-l border-t border-border px-3 py-2 text-card-foreground">98.4%</div>
                    <div className="border-t border-border px-3 py-2 text-muted-foreground">페이지</div>
                    <div className="border-l border-t border-border px-3 py-2 text-card-foreground">12</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[420px] flex items-center justify-center p-8 text-center">
                <p className="text-xs text-muted-foreground">
                  이 형식은 브라우저 원본 미리보기를 지원하지 않습니다.
                </p>
              </div>
            )}
          </div>
        </section>

        <ResultColumn
          label="A"
          run={runAEntry?.run}
          runs={runs}
          selectedId={runAId}
          blockedId={runBId}
          winner={winnerId === runAId}
          onChange={setRunAId}
          onChoose={() => chooseWinner(runAId)}
        />
        <ResultColumn
          label="B"
          run={runBEntry?.run}
          runs={runs}
          selectedId={runBId}
          blockedId={runAId}
          winner={winnerId === runBId}
          onChange={setRunBId}
          onChoose={() => chooseWinner(runBId)}
        />
      </div>

      <section className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border bg-upload-zone flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-semibold text-card-foreground">Evaluation scorecard</h4>
            <p className="text-xs text-muted-foreground mt-1">
              원본을 기준으로 각 결과를 1점(매우 미흡)부터 5점(매우 우수)까지 평가하세요.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={chooseHigherScore}
              disabled={!canRecommend}
              className="h-8 px-3 rounded-lg border border-border text-xs font-medium text-card-foreground
                       hover:border-border-darkest disabled:opacity-40 disabled:cursor-not-allowed"
            >
              높은 점수 선택
            </button>
            <button
              type="button"
              onClick={copyEvaluation}
              className="h-8 px-3 rounded-lg bg-upload-zone text-card-foreground text-xs font-medium hover:bg-muted"
            >
              {copiedEvaluation ? "복사됨" : "평가 JSON 복사"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[780px]">
            <div className="grid grid-cols-[minmax(220px,1.2fr)_minmax(240px,1fr)_minmax(240px,1fr)] border-b border-border bg-upload-zone">
              <div className="p-3 text-xs font-medium text-muted-foreground">평가 기준</div>
              <div className="p-3 text-center border-l border-border">
                <p className="text-xs font-semibold text-card-foreground">A</p>
                <p className="text-xs text-muted-foreground truncate mt-1">
                  {runAEntry ? runLabel(runAEntry.run, runAEntry.index) : "-"}
                </p>
              </div>
              <div className="p-3 text-center border-l border-border">
                <p className="text-xs font-semibold text-card-foreground">B</p>
                <p className="text-xs text-muted-foreground truncate mt-1">
                  {runBEntry ? runLabel(runBEntry.run, runBEntry.index) : "-"}
                </p>
              </div>
            </div>

            {EVALUATION_CRITERIA.map((criterion) => (
              <div
                key={criterion.id}
                className="grid grid-cols-[minmax(220px,1.2fr)_minmax(240px,1fr)_minmax(240px,1fr)] border-b border-border last:border-b-0"
              >
                <div className="p-3">
                  <p className="text-xs font-medium text-card-foreground">{criterion.label}</p>
                  <p className="text-xs leading-4 text-muted-foreground mt-1">
                    {criterion.description}
                  </p>
                </div>
                <div className="p-3 border-l border-border flex items-center justify-center">
                  <ScorePicker
                    label={`A ${criterion.label}`}
                    value={evaluationA?.scores[criterion.id]}
                    onChange={(score) => updateScore(runAId, criterion.id, score)}
                  />
                </div>
                <div className="p-3 border-l border-border flex items-center justify-center">
                  <ScorePicker
                    label={`B ${criterion.label}`}
                    value={evaluationB?.scores[criterion.id]}
                    onChange={(score) => updateScore(runBId, criterion.id, score)}
                  />
                </div>
              </div>
            ))}

            <div className="grid grid-cols-[minmax(220px,1.2fr)_minmax(240px,1fr)_minmax(240px,1fr)] border-b border-border">
              <div className="p-3">
                <p className="text-xs font-medium text-card-foreground">검토 메모</p>
                <p className="text-xs text-muted-foreground mt-1">오류 사례와 선택 근거를 기록합니다.</p>
              </div>
              <div className="p-3 border-l border-border">
                <textarea
                  value={evaluationA?.notes || ""}
                  onChange={(event) => updateNotes(runAId, event.target.value)}
                  placeholder="A 결과의 장점과 오류"
                  className="w-full min-h-20 resize-y rounded-lg border border-control bg-surface px-3 py-2 text-xs
                           text-card-foreground placeholder:text-muted-foreground focus-ring"
                />
              </div>
              <div className="p-3 border-l border-border">
                <textarea
                  value={evaluationB?.notes || ""}
                  onChange={(event) => updateNotes(runBId, event.target.value)}
                  placeholder="B 결과의 장점과 오류"
                  className="w-full min-h-20 resize-y rounded-lg border border-control bg-surface px-3 py-2 text-xs
                           text-card-foreground placeholder:text-muted-foreground focus-ring"
                />
              </div>
            </div>

            <div className="grid grid-cols-[minmax(220px,1.2fr)_minmax(240px,1fr)_minmax(240px,1fr)] bg-upload-zone">
              <div className="p-3 flex items-center">
                <p className="text-xs font-semibold text-card-foreground">평균 점수</p>
              </div>
              <div className="p-3 border-l border-border text-center">
                <span className="text-base font-semibold text-card-foreground">
                  {averageA === null ? "-" : averageA.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground"> / 5</span>
              </div>
              <div className="p-3 border-l border-border text-center">
                <span className="text-base font-semibold text-card-foreground">
                  {averageB === null ? "-" : averageB.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground"> / 5</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
