"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "@/components/shared/Modal";
import { Input, Select, Textarea } from "@/components/shared/FormFields";
import { Button } from "@/components/shared/Button";

import EvaluationRunsView from "@/components/evaluation/EvaluationRunsView";
import GoldenCaseEditor, { type GoldenCasePayload } from "@/components/evaluation/GoldenCaseEditor";
import RagasEvaluationModal from "@/components/evaluation/RagasEvaluationModal";
import RobustnessCoveragePanel from "@/components/evaluation/RobustnessCoveragePanel";
import PagePanel from "@/components/shared/PagePanel";
import { getAuthToken } from "@/lib/auth";
import {
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_EMBEDDING_MODEL,
  describeEmbeddingModel,
} from "@/lib/constants";
import type {
  DatabaseSchema,
  EvaluationCase,
  EvaluationDataset,
  EvaluationDatasetVersion,
  EvaluationJudgeCaseRun,
  EvaluationRun,
  EvaluationWorkspace,
  RagGenerationModel,
  RagReasoningEffort,
  RagasMetricKey,
  ReviewerDecision,
} from "@/lib/types";
import { evaluationCaseSelectionLabel } from "@/lib/evaluation-accessibility";
import { buildRobustnessCoverage } from "@/lib/robustness-coverage";
import { MANAGED_VECTOR_SCHEMA } from "@/lib/vectorstore";

const NEW_CASE_ID = "__new_case__";

interface ApiErrorBody {
  error?: string;
  details?: string;
  code?: string;
  runId?: string | null;
}

interface EvaluationTask {
  id: string;
  evaluation_case_id: string;
  question_snapshot: string;
}

interface CreateRunResponse {
  run: EvaluationRun;
  tasks: EvaluationTask[];
}

interface CreateJudgeBatchResponse {
  tasks: Array<Pick<EvaluationJudgeCaseRun, "id" | "evaluation_case_run_id">>;
}

interface RagasWorkerHealth {
  frameworkVersion: string;
  workerVersion: string;
  allowedModels: string[];
  supportedMetrics: string[];
}

async function evaluationRequest<T>(body?: Record<string, unknown>): Promise<T> {
  const token = getAuthToken();
  if (!token) throw new Error("로그인이 필요합니다.");
  const response = await fetch("/api/evaluation", {
    method: body ? "POST" : "GET",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = (await response.json()) as T & ApiErrorBody;
  if (!response.ok) throw new Error(data.details || data.error || "Evaluation request failed");
  return data;
}

function statusClass(status: string): string {
  if (status === "draft") return "bg-upload-zone text-card-foreground";
  if (status === "frozen") return "bg-warning-surface text-warning";
  return "bg-muted text-muted-foreground";
}

export default function EvaluationPanel() {
  const [workspace, setWorkspace] = useState<EvaluationWorkspace>({
    datasets: [], versions: [], cases: [], runs: [], caseRuns: [], judgeBatches: [], judgeCaseRuns: [],
  });
  const [activeTab, setActiveTab] = useState<"golden" | "runs">("golden");
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [datasetModalOpen, setDatasetModalOpen] = useState(false);
  const [editingDataset, setEditingDataset] = useState<EvaluationDataset | null>(null);
  const [datasetName, setDatasetName] = useState("");
  const [datasetDescription, setDatasetDescription] = useState("");

  const [runModalOpen, setRunModalOpen] = useState(false);
  const [schemas, setSchemas] = useState<DatabaseSchema[]>([]);
  const [runName, setRunName] = useState("");
  const [runSchema, setRunSchema] = useState(MANAGED_VECTOR_SCHEMA);
  const [runTable, setRunTable] = useState("");
  const [topK, setTopK] = useState(5);
  // Derived from the chosen collection, never chosen separately: a run embedded
  // with a different model than the index would compare nothing.
  const selectedCollection = useMemo(
    () => schemas
      .find((schema) => schema.name === runSchema)
      ?.tables.find((table) => table.name === runTable),
    [runSchema, runTable, schemas],
  );
  const embeddingModel = selectedCollection?.embeddingModel || DEFAULT_EMBEDDING_MODEL;
  const embeddingDimensions = selectedCollection?.vectorDimension || DEFAULT_EMBEDDING_DIMENSIONS;
  const [generationModel, setGenerationModel] = useState<RagGenerationModel>("gpt-5.6-terra");
  const [reasoningEffort, setReasoningEffort] = useState<RagReasoningEffort>("low");
  const [baselineRunId, setBaselineRunId] = useState("");
  const [regressionTolerance, setRegressionTolerance] = useState(5);
  const [executing, setExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState({ completed: 0, total: 0 });
  const [ragasModalOpen, setRagasModalOpen] = useState(false);
  const [ragasModel, setRagasModel] = useState<RagGenerationModel>("gpt-5.6-terra");
  const [ragasMetrics, setRagasMetrics] = useState<RagasMetricKey[]>([
    "faithfulness", "answerRelevancy", "contextPrecision", "contextRecall",
  ]);
  const [ragasHealth, setRagasHealth] = useState<RagasWorkerHealth | null>(null);
  const [ragasHealthError, setRagasHealthError] = useState<string | null>(null);
  const [ragasExecutionError, setRagasExecutionError] = useState<string | null>(null);
  const [ragasChecking, setRagasChecking] = useState(false);
  const [ragasExecuting, setRagasExecuting] = useState(false);
  const [ragasProgress, setRagasProgress] = useState({ completed: 0, total: 0 });

  const fetchWorkspace = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await evaluationRequest<EvaluationWorkspace>();
      setWorkspace(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "평가 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchWorkspace(); }, [fetchWorkspace]);

  useEffect(() => {
    if (!workspace.datasets.length) {
      setSelectedDatasetId(null);
      return;
    }
    if (!selectedDatasetId || !workspace.datasets.some((dataset) => dataset.id === selectedDatasetId)) {
      setSelectedDatasetId(workspace.datasets[0].id);
    }
  }, [workspace.datasets, selectedDatasetId]);

  const datasetVersions = useMemo(
    () => workspace.versions
      .filter((version) => version.dataset_id === selectedDatasetId)
      .sort((left, right) => right.version_number - left.version_number),
    [workspace.versions, selectedDatasetId]
  );

  useEffect(() => {
    if (!datasetVersions.length) {
      setSelectedVersionId(null);
      return;
    }
    if (!selectedVersionId || !datasetVersions.some((version) => version.id === selectedVersionId)) {
      setSelectedVersionId(datasetVersions[0].id);
    }
  }, [datasetVersions, selectedVersionId]);

  useEffect(() => {
    setSelectedCaseId(null);
    setSelectedCaseIds(new Set());
  }, [selectedVersionId]);

  const selectedDataset = workspace.datasets.find((dataset) => dataset.id === selectedDatasetId) || null;
  const selectedVersion = workspace.versions.find((version) => version.id === selectedVersionId) || null;
  const versionCases = useMemo(
    () => workspace.cases
      .filter((evaluationCase) => evaluationCase.dataset_version_id === selectedVersionId)
      .sort((left, right) => left.position - right.position || left.created_at.localeCompare(right.created_at)),
    [workspace.cases, selectedVersionId]
  );
  const robustnessCoverage = useMemo(() => buildRobustnessCoverage(versionCases), [versionCases]);
  const selectedCase = workspace.cases.find((evaluationCase) => evaluationCase.id === selectedCaseId) || null;
  const datasetRuns = useMemo(
    () => workspace.runs.filter((run) => datasetVersions.some((version) => version.id === run.dataset_version_id)),
    [workspace.runs, datasetVersions]
  );

  useEffect(() => {
    if (datasetRuns.length && (!selectedRunId || !datasetRuns.some((run) => run.id === selectedRunId))) {
      setSelectedRunId(datasetRuns[0].id);
    }
  }, [datasetRuns, selectedRunId]);

  const handleSaveCase = async (payload: GoldenCasePayload) => {
    if (!selectedVersion) return;
    setSaving(true);
    setError(null);
    try {
      const isNew = selectedCaseId === NEW_CASE_ID;
      const response = await evaluationRequest<{ evaluationCase: EvaluationCase }>({
        action: isNew ? "create_case" : "update_case",
        versionId: selectedVersion.id,
        ...(isNew ? {} : { caseId: selectedCase?.id }),
        ...payload,
      });
      await fetchWorkspace();
      setSelectedCaseId(response.evaluationCase.id);
    } catch (caught) {
      throw caught;
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCase = async () => {
    if (!selectedVersion || !selectedCase) return;
    if (!confirm(`Delete ${selectedCase.case_key}?`)) return;
    setSaving(true);
    try {
      await evaluationRequest({ action: "delete_case", versionId: selectedVersion.id, caseId: selectedCase.id });
      setSelectedCaseId(null);
      await fetchWorkspace();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "케이스를 삭제하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const openDatasetModal = (dataset?: EvaluationDataset) => {
    setEditingDataset(dataset || null);
    setDatasetName(dataset?.name || "");
    setDatasetDescription(dataset?.description || "");
    setDatasetModalOpen(true);
  };

  const handleSaveDataset = async () => {
    if (!datasetName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const response = await evaluationRequest<{
        dataset: EvaluationDataset;
        version?: EvaluationDatasetVersion;
      }>({
        action: editingDataset ? "update_dataset" : "create_dataset",
        ...(editingDataset ? { datasetId: editingDataset.id } : {}),
        name: datasetName.trim(),
        description: datasetDescription.trim(),
      });
      setDatasetModalOpen(false);
      await fetchWorkspace();
      setSelectedDatasetId(response.dataset.id);
      if (response.version) setSelectedVersionId(response.version.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "데이터셋을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDataset = async () => {
    if (!selectedDataset) return;
    if (!confirm(`Delete dataset "${selectedDataset.name}" and all of its versions and runs?`)) return;
    setSaving(true);
    try {
      await evaluationRequest({ action: "delete_dataset", datasetId: selectedDataset.id });
      setSelectedDatasetId(null);
      await fetchWorkspace();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "데이터셋을 삭제하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleCloneVersion = async () => {
    if (!selectedVersion) return;
    setSaving(true);
    try {
      const response = await evaluationRequest<{ version: EvaluationDatasetVersion }>({
        action: "clone_version",
        versionId: selectedVersion.id,
        changeNote: `Iteration from v${selectedVersion.version_number}`,
      });
      await fetchWorkspace();
      setSelectedVersionId(response.version.id);
      setActiveTab("golden");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "새 버전을 만들지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const toggleCaseSelection = (caseId: string) => {
    setSelectedCaseIds((current) => {
      const next = new Set(current);
      if (next.has(caseId)) next.delete(caseId); else next.add(caseId);
      return next;
    });
  };

  const fetchSchemas = async () => {
    const token = getAuthToken();
    if (!token) throw new Error("로그인이 필요합니다.");
    const response = await fetch("/api/vectorstore/schemas", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "VDB 테이블을 불러오지 못했습니다.");
    const loadedSchemas = data as DatabaseSchema[];
    setSchemas(loadedSchemas);
    const managedSchema = loadedSchemas.find((schema) => schema.name === MANAGED_VECTOR_SCHEMA);
    setRunSchema(managedSchema?.name || MANAGED_VECTOR_SCHEMA);
    setRunTable(managedSchema?.tables[0]?.name || "");
  };

  const openRunModal = async () => {
    if (!selectedCaseIds.size) return;
    setRunName(`${selectedDataset?.name || "Evaluation"} · v${selectedVersion?.version_number || 1}`);
    setExecutionProgress({ completed: 0, total: selectedCaseIds.size });
    setBaselineRunId("");
    setRegressionTolerance(5);
    setRunModalOpen(true);
    try {
      await fetchSchemas();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "VDB 연결을 확인하지 못했습니다.");
    }
  };

  const executeEvaluationRun = async () => {
    if (!selectedVersion || !runTable || !selectedCaseIds.size) return;
    const token = getAuthToken();
    if (!token) {
      setError("로그인이 필요합니다.");
      return;
    }
    setExecuting(true);
    setError(null);
    const pipelineConfig = {
      schema: runSchema,
      tableName: runTable,
      topK,
      embeddingModel,
      embeddingDimensions,
      generationModel,
      reasoningEffort,
    };
    try {
      const created = await evaluationRequest<CreateRunResponse>({
        action: "create_run",
        versionId: selectedVersion.id,
        caseIds: Array.from(selectedCaseIds),
        name: runName.trim(),
        pipelineConfig,
        baselineRunId: baselineRunId || null,
        regressionThresholds: baselineRunId
          ? Object.fromEntries([
              "recallAtK", "precisionAtK", "hitRate", "mrr", "ndcgAtK", "citationPrecision", "citationRecall",
            ].map((key) => [key, regressionTolerance / 100]))
          : {},
      });
      setExecutionProgress({ completed: 0, total: created.tasks.length });

      for (let index = 0; index < created.tasks.length; index += 1) {
        const task = created.tasks[index];
        let ragBody: ApiErrorBody & { id?: string } = {};
        let succeeded = false;
        try {
          await evaluationRequest({ action: "start_case_run", caseRunId: task.id });
          const ragResponse = await fetch("/api/rag/runs", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ question: task.question_snapshot, ...pipelineConfig }),
          });
          ragBody = await ragResponse.json();
          succeeded = ragResponse.ok;
        } catch (caught) {
          ragBody = { error: caught instanceof Error ? caught.message : "RAG execution failed" };
        }

        await evaluationRequest({
          action: "attach_case_run",
          caseRunId: task.id,
          status: succeeded ? "succeeded" : "failed",
          ragRunId: ragBody.id || ragBody.runId || null,
          error: succeeded ? null : { message: ragBody.error || "RAG execution failed", code: ragBody.code || null },
        });
        setExecutionProgress({ completed: index + 1, total: created.tasks.length });
      }

      setRunModalOpen(false);
      setSelectedRunId(created.run.id);
      setActiveTab("runs");
      setSelectedCaseIds(new Set());
      await fetchWorkspace();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "평가 실행에 실패했습니다.");
    } finally {
      setExecuting(false);
    }
  };

  const handleReview = async (
    caseRunId: string,
    payload: {
      manualScore: { correctness?: number; faithfulness?: number; citationQuality?: number };
      decision: ReviewerDecision;
      notes: string;
    }
  ) => {
    setReviewSaving(true);
    try {
      await evaluationRequest({
        action: "review_case_run",
        caseRunId,
        ...payload,
      });
      await fetchWorkspace();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "리뷰를 저장하지 못했습니다.");
    } finally {
      setReviewSaving(false);
    }
  };

  const openRagasModal = async (run: EvaluationRun) => {
    const activeBatch = workspace.judgeBatches.find((batch) =>
      batch.evaluation_run_id === run.id && batch.status === "running"
    );
    if (activeBatch?.evaluator_config.model) setRagasModel(activeBatch.evaluator_config.model);
    if (activeBatch?.metric_config.metrics?.length) setRagasMetrics(activeBatch.metric_config.metrics);
    setSelectedRunId(run.id);
    setRagasModalOpen(true);
    setRagasChecking(true);
    setRagasHealth(null);
    setRagasHealthError(null);
    setRagasExecutionError(null);
    setRagasProgress({ completed: 0, total: run.succeeded_count });
    try {
      const response = await evaluationRequest<{ health: RagasWorkerHealth }>({ action: "check_evaluator" });
      setRagasHealth(response.health);
      const requestedModel = activeBatch?.evaluator_config.model || ragasModel;
      if (!response.health.allowedModels.includes(requestedModel)) {
        const fallback = response.health.allowedModels.find((model) => ["gpt-5.6-terra", "gpt-5.6-sol", "gpt-5.6-luna"].includes(model));
        if (fallback) setRagasModel(fallback as RagGenerationModel);
      }
    } catch (caught) {
      setRagasHealthError(caught instanceof Error ? caught.message : "Ragas 워커에 연결하지 못했습니다.");
    } finally {
      setRagasChecking(false);
    }
  };

  const toggleRagasMetric = (metric: RagasMetricKey) => {
    setRagasMetrics((current) => current.includes(metric)
      ? current.filter((item) => item !== metric)
      : [...current, metric]);
  };

  const executeRagasEvaluation = async () => {
    const run = workspace.runs.find((item) => item.id === selectedRunId);
    if (!run || !ragasMetrics.length) return;
    setRagasExecuting(true);
    setRagasExecutionError(null);
    setError(null);
    let failed = 0;
    try {
      const created = await evaluationRequest<CreateJudgeBatchResponse>({
        action: "create_judge_batch",
        runId: run.id,
        model: ragasModel,
        metrics: ragasMetrics,
      });
      setRagasProgress({ completed: 0, total: created.tasks.length });
      for (let index = 0; index < created.tasks.length; index += 1) {
        const result = await evaluationRequest<{ success: boolean }>({
          action: "execute_judge_case_run",
          judgeCaseRunId: created.tasks[index].id,
        });
        if (!result.success) failed += 1;
        setRagasProgress({ completed: index + 1, total: created.tasks.length });
      }
      setRagasModalOpen(false);
      await fetchWorkspace();
      if (failed) setError(`${failed}개 케이스의 Ragas 평가가 실패했습니다. 실행 상세에서 원인을 확인하세요.`);
    } catch (caught) {
      setRagasExecutionError(caught instanceof Error ? caught.message : "Ragas 평가 실행에 실패했습니다.");
      await fetchWorkspace();
    } finally {
      setRagasExecuting(false);
    }
  };

  if (loading && !workspace.datasets.length) {
    return <div className="h-full flex items-center justify-center"><div className="animate-spin w-8 h-8 rounded-full border-2 border-muted border-t-surface-foreground" /></div>;
  }

  return (
    <PagePanel
      title="답변 평가"
      description="골든셋 기준으로 검색 근거와 생성된 답변의 품질을 측정합니다."
      actions={<>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 min-w-0">
              <select
                value={selectedDatasetId || ""}
                onChange={(event) => setSelectedDatasetId(event.target.value || null)}
                className="h-10 min-w-56 max-w-80 px-3 border border-border rounded-lg bg-surface text-xs font-medium text-card-foreground"
              >
                {!workspace.datasets.length && <option value="">No datasets</option>}
                {workspace.datasets.map((dataset) => <option key={dataset.id} value={dataset.id}>{dataset.name}</option>)}
              </select>
              {selectedDataset && (
                <select
                  value={selectedVersionId || ""}
                  onChange={(event) => setSelectedVersionId(event.target.value)}
                  className="h-10 px-3 border border-border rounded-lg bg-surface text-xs text-card-foreground"
                >
                  {datasetVersions.map((version) => (
                    <option key={version.id} value={version.id}>v{version.version_number} · {version.status}</option>
                  ))}
                </select>
              )}
            {selectedVersion && <span className={`px-3 py-1 rounded-full text-2xs font-medium ${statusClass(selectedVersion.status)}`}>{selectedVersion.status}</span>}
          </div>
          <div className="flex items-center gap-2">
            {selectedDataset && (
              <>
                <Button variant="ghost" size="sm" onClick={() => openDatasetModal(selectedDataset)}>수정</Button>
                <Button variant="dangerGhost" size="sm" onClick={handleDeleteDataset} disabled={saving}>삭제</Button>
              </>
            )}
            <Button variant="primary" size="md" onClick={() => openDatasetModal()}>New dataset</Button>
          </div>
        </div>
      </>}
      toolbar={<>
        <div className="flex items-center justify-between gap-4 mt-4 -mb-4">
          <nav className="flex items-center gap-4">
            <button type="button" onClick={() => setActiveTab("golden")} className={`pb-3 text-xs font-medium border-b-2 ${activeTab === "golden" ? "border-surface-foreground text-card-foreground" : "border-transparent text-muted-foreground"}`}>골든셋</button>
            <button type="button" onClick={() => setActiveTab("runs")} className={`pb-3 text-xs font-medium border-b-2 ${activeTab === "runs" ? "border-surface-foreground text-card-foreground" : "border-transparent text-muted-foreground"}`}>실행 <span className="ml-1 text-2xs">{datasetRuns.length}</span></button>
          </nav>
          {activeTab === "golden" && selectedVersion && (
            <div className="flex items-center gap-2 pb-2">
              {selectedVersion.status !== "draft" && (
                <Button variant="outline" size="sm" onClick={handleCloneVersion} disabled={saving}>다음 버전 만들기</Button>
              )}
              <Button variant="primary" size="sm" onClick={openRunModal} disabled={!selectedCaseIds.size || executing}>
                Run selected · {selectedCaseIds.size}
              </Button>
            </div>
          )}
        </div>
      </>}
      bodyScroll="hidden"
      bleed
    >


      {error && (
        <div className="flex items-center justify-between gap-4 border-b border-danger-border bg-danger-surface px-4 py-3 text-xs text-danger sm:px-6 lg:px-10">
          <span>{error}</span><button type="button" onClick={() => setError(null)} className="text-2xs transition-smooth hover:text-danger/80">닫기</button>
        </div>
      )}

      <div className="flex-1 min-h-0">
        {!selectedDataset ? (
          <div className="h-full flex items-center justify-center text-center px-8">
            <div>
              <p className="text-xs font-semibold text-card-foreground">첫 골든셋을 만드세요</p>
              <p className="text-xs text-muted-foreground mt-2 max-w-md">질문, 기준 답변, 기대 근거를 버전으로 관리하고 같은 파이프라인에서 반복 평가할 수 있습니다.</p>
              <Button variant="primary" size="md" className="mt-4" onClick={() => openDatasetModal()}>Create dataset</Button>
            </div>
          </div>
        ) : activeTab === "runs" ? (
          <EvaluationRunsView
            runs={datasetRuns}
            caseRuns={workspace.caseRuns}
            judgeBatches={workspace.judgeBatches}
            judgeCaseRuns={workspace.judgeCaseRuns}
            selectedRunId={selectedRunId}
            onSelectRun={setSelectedRunId}
            onReview={handleReview}
            onRunRagas={openRagasModal}
            ragasExecuting={ragasExecuting}
            reviewSaving={reviewSaving}
          />
        ) : (
          <div className="h-full grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="h-full overflow-y-auto border-r border-border-subtle">
              <details className="border-b border-border-subtle px-4 py-4 group">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-3 text-2xs font-medium text-card-foreground">
                  <span>Robustness coverage</span>
                  <span className="text-2xs font-normal text-muted-foreground">
                    {robustnessCoverage.coveredCount}/{robustnessCoverage.scenarios.length}
                  </span>
                </summary>
                <div className="mt-3">
                  <RobustnessCoveragePanel cases={versionCases} />
                </div>
              </details>
              <div className="sticky top-0 z-navigation bg-card px-4 py-4 border-b border-border-subtle">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-2xs font-medium text-card-foreground">케이스</p>
                    <p className="text-2xs text-muted-foreground mt-1">{versionCases.length} total · {selectedCaseIds.size} selected</p>
                  </div>
                  {selectedVersion?.status === "draft" && (
                    <Button variant="soft" size="icon" className="text-base" onClick={() => setSelectedCaseId(NEW_CASE_ID)} title="Add case">+</Button>
                  )}
                </div>
                {!!versionCases.length && (
                  <label className="flex items-center gap-2 mt-3 text-2xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCaseIds.size === versionCases.length}
                      onChange={(event) => setSelectedCaseIds(event.target.checked ? new Set(versionCases.map((item) => item.id)) : new Set())}
                      className="rounded-sm border-border accent-surface-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-surface-foreground"
                    />
                    Select all for run
                  </label>
                )}
              </div>
              <div>
                {versionCases.map((evaluationCase, index) => (
                  <div key={evaluationCase.id} className={`flex items-start border-b border-border ${selectedCaseId === evaluationCase.id ? "bg-upload-zone" : "hover:bg-muted"}`}>
                    <label className="pl-4 pt-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCaseIds.has(evaluationCase.id)}
                        onChange={() => toggleCaseSelection(evaluationCase.id)}
                        aria-label={evaluationCaseSelectionLabel(evaluationCase)}
                        className="rounded-sm border-border accent-surface-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-surface-foreground"
                      />
                    </label>
                    <button type="button" onClick={() => setSelectedCaseId(evaluationCase.id)} className="flex-1 min-w-0 text-left px-3 py-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-2xs uppercase tracking-wide text-muted-foreground">{evaluationCase.case_key || `Case ${index + 1}`}</span>
                        <span className="text-2xs text-muted-foreground">{evaluationCase.difficulty}</span>
                      </div>
                      <p className="text-xs leading-5 text-card-foreground mt-2 line-clamp-3">{evaluationCase.question}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {!evaluationCase.answerable && <span className="px-2 py-1 bg-warning-surface text-warning rounded-sm text-2xs">unanswerable</span>}
                        {evaluationCase.tags.slice(0, 3).map((tag) => <span key={tag} className="px-2 py-1 bg-muted text-muted-foreground rounded-sm text-2xs">{tag}</span>)}
                      </div>
                    </button>
                  </div>
                ))}
                {!versionCases.length && (
                  <div className="px-4 py-10 text-center">
                    <p className="text-2xs text-muted-foreground">이 버전에 케이스가 없습니다.</p>
                    {selectedVersion?.status === "draft" && <button type="button" onClick={() => setSelectedCaseId(NEW_CASE_ID)} className="mt-3 text-2xs font-medium text-card-foreground hover:text-muted-foreground transition-smooth">Add first case</button>}
                  </div>
                )}
              </div>
            </aside>
            <GoldenCaseEditor
              evaluationCase={selectedCase}
              isNew={selectedCaseId === NEW_CASE_ID}
              editable={selectedVersion?.status === "draft"}
              saving={saving}
              nextPosition={versionCases.length}
              onSave={handleSaveCase}
              onDelete={handleDeleteCase}
              onCancelNew={() => setSelectedCaseId(null)}
            />
          </div>
        )}
      </div>

      <Modal
        isOpen={datasetModalOpen}
        onClose={() => setDatasetModalOpen(false)}
        title={editingDataset ? "데이터셋 수정" : "새 평가 데이터셋"}
        description="골든 케이스를 같은 목적과 버전으로 묶습니다."
        size="md"
        footer={<><Button variant="ghost" size="sm" onClick={() => setDatasetModalOpen(false)} disabled={saving}>취소</Button><Button variant="primary" size="md" onClick={handleSaveDataset} disabled={saving || !datasetName.trim()}>{saving ? "Saving..." : "Save dataset"}</Button></>}
      >
            <div className="space-y-4 mt-6">
              <label className="block"><span className="block text-2xs font-medium text-muted-foreground mb-2">Name *</span><Input fieldSize="lg" autoFocus value={datasetName} onChange={(event) => setDatasetName(event.target.value)} placeholder="Korean financial reports"/></label>
              <label className="block"><span className="block text-2xs font-medium text-muted-foreground mb-2">설명</span><Textarea value={datasetDescription} onChange={(event) => setDatasetDescription(event.target.value)} rows={4} placeholder="평가 목적과 포함 문서 범위"/></label>
            </div>
      </Modal>

      <Modal
        isOpen={runModalOpen}
        onClose={() => setRunModalOpen(false)}
        title="평가 실행"
        description="선택한 케이스를 하나의 검색·생성 설정으로 실행합니다. 실행을 시작하면 데이터셋 버전이 동결됩니다."
        size="xl"
        footer={<><Button variant="ghost" size="sm" onClick={() => setRunModalOpen(false)} disabled={executing}>취소</Button><Button variant="primary" size="md" onClick={executeEvaluationRun} disabled={executing || !runTable || topK < 1 || topK > 20 || regressionTolerance < 0 || regressionTolerance > 100}>{executing ? "Running..." : `Run ${selectedCaseIds.size} cases`}</Button></>}
      >
            <div className="flex items-start justify-between gap-4">
              <div><h3 className="text-base font-semibold text-card-foreground">Run evaluation</h3><p className="text-2xs text-muted-foreground mt-1">선택한 {selectedCaseIds.size}개 케이스에 동일한 파이프라인을 적용합니다.</p></div>
              <span className="px-3 py-1 rounded-full bg-warning-surface text-warning text-2xs">Version will freeze</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <label className="block md:col-span-2"><span className="block text-2xs font-medium text-muted-foreground mb-2">Run name</span><Input fieldSize="lg" value={runName} onChange={(event) => setRunName(event.target.value)} disabled={executing}/></label>
              <label className="block"><span className="block text-2xs font-medium text-muted-foreground mb-2">스키마</span><Select value={runSchema} onChange={(event) => { setRunSchema(event.target.value); setRunTable(schemas.find((schema) => schema.name === event.target.value)?.tables[0]?.name || ""); }} disabled={executing}>{schemas.map((schema) => <option key={schema.name} value={schema.name}>{schema.name}</option>)}</Select></label>
              <label className="block"><span className="block text-2xs font-medium text-muted-foreground mb-2">Vector collection</span><Select value={runTable} onChange={(event) => setRunTable(event.target.value)} disabled={executing}><option value="">Select collection</option>{schemas.find((schema) => schema.name === runSchema)?.tables.map((table) => <option key={table.name} value={table.name}>{table.name} · {table.rowCount} rows</option>)}</Select></label>
              <div className="block"><span className="block text-2xs font-medium text-muted-foreground mb-2">임베딩</span><div title="Fixed by the selected collection" className="flex h-10 items-center px-3 border border-border rounded-lg bg-muted text-xs text-card-foreground">{describeEmbeddingModel(embeddingModel, embeddingDimensions)}</div></div>
              <label className="block"><span className="block text-2xs font-medium text-muted-foreground mb-2">답변 모델</span><Select value={generationModel} onChange={(event) => setGenerationModel(event.target.value as RagGenerationModel)} disabled={executing}><option value="gpt-5.6-terra">GPT-5.6 Terra</option><option value="gpt-5.6-sol">GPT-5.6 Sol</option><option value="gpt-5.6-luna">GPT-5.6 Luna</option></Select></label>
              <label className="block"><span className="block text-2xs font-medium text-muted-foreground mb-2">추론 강도</span><Select value={reasoningEffort} onChange={(event) => setReasoningEffort(event.target.value as RagReasoningEffort)} disabled={executing}><option value="none">None</option><option value="low">낮음</option><option value="medium">보통</option><option value="high">높음</option></Select></label>
              <label className="block"><span className="block text-2xs font-medium text-muted-foreground mb-2">Top K</span><Input fieldSize="lg" type="number" min={1} max={20} value={topK} onChange={(event) => setTopK(Number(event.target.value))} disabled={executing}/></label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
              <label className="block">
                <span className="block text-2xs font-medium text-muted-foreground mb-2">Baseline run</span>
                <Select fieldSize="lg" value={baselineRunId} onChange={(event) => setBaselineRunId(event.target.value)} disabled={executing}>
                  <option value="">No baseline</option>
                  {datasetRuns.filter((run) => run.status === "completed").map((run) => (
                    <option key={run.id} value={run.id}>{run.name}</option>
                  ))}
                </Select>
              </label>
              <label className="block">
                <span className="block text-2xs font-medium text-muted-foreground mb-2">Allowed metric drop (%)</span>
                <Input fieldSize="lg" type="number" min={0} max={100} step={1} value={regressionTolerance} onChange={(event) => setRegressionTolerance(Number(event.target.value))} disabled={executing || !baselineRunId}/>
              </label>
              <p className="md:col-span-2 text-2xs leading-5 text-muted-foreground">기준 실행을 선택하면 자동 검색·인용 지표가 허용 범위보다 낮아질 때 회귀로 기록합니다.</p>
            </div>
            <div className="mt-4 px-4 py-3 bg-upload-zone border-l-2 border-surface-foreground text-2xs leading-5 text-muted-foreground">각 케이스는 OpenAI embedding 1회와 Responses API 1회를 호출합니다. 검색 함수와 사용자 격리는 Managed Supabase Vector Store에서 자동으로 적용됩니다.</div>
            {executing && (
              <div className="mt-4"><div className="flex items-center justify-between text-2xs text-muted-foreground mb-2"><span>Executing cases</span><span>{executionProgress.completed}/{executionProgress.total}</span></div><div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-surface-foreground transition-all duration-slow" style={{ width: `${executionProgress.total ? (executionProgress.completed / executionProgress.total) * 100 : 0}%` }} /></div></div>
            )}
      </Modal>
      <RagasEvaluationModal
        open={ragasModalOpen}
        run={workspace.runs.find((run) => run.id === selectedRunId) || null}
        model={ragasModel}
        metrics={ragasMetrics}
        health={ragasHealth}
        healthError={ragasHealthError}
        executionError={ragasExecutionError}
        checking={ragasChecking}
        executing={ragasExecuting}
        progress={ragasProgress}
        onModelChange={setRagasModel}
        onToggleMetric={toggleRagasMetric}
        onClose={() => {
          setRagasModalOpen(false);
          setRagasExecutionError(null);
        }}
        onRun={executeRagasEvaluation}
      />
    </PagePanel>
  );
}
