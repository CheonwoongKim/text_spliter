"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import EvaluationRunsView from "@/components/evaluation/EvaluationRunsView";
import GoldenCaseEditor, { type GoldenCasePayload } from "@/components/evaluation/GoldenCaseEditor";
import { getAuthToken } from "@/lib/auth";
import type {
  DatabaseSchema,
  EvaluationCase,
  EvaluationDataset,
  EvaluationDatasetVersion,
  EvaluationRun,
  EvaluationWorkspace,
  RagGenerationModel,
  RagReasoningEffort,
  ReviewerDecision,
} from "@/lib/types";

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
  if (status === "draft") return "bg-blue-500/10 text-blue-500";
  if (status === "frozen") return "bg-amber-500/10 text-amber-500";
  return "bg-muted text-muted-foreground";
}

export default function EvaluationPanel() {
  const [workspace, setWorkspace] = useState<EvaluationWorkspace>({
    datasets: [], versions: [], cases: [], runs: [], caseRuns: [],
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
  const [runSchema, setRunSchema] = useState("public");
  const [runTable, setRunTable] = useState("");
  const [topK, setTopK] = useState(5);
  const [embeddingModel, setEmbeddingModel] = useState("text-embedding-3-small");
  const [generationModel, setGenerationModel] = useState<RagGenerationModel>("gpt-5.6-terra");
  const [reasoningEffort, setReasoningEffort] = useState<RagReasoningEffort>("low");
  const [executing, setExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState({ completed: 0, total: 0 });

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
    const publicSchema = loadedSchemas.find((schema) => schema.name === "public") || loadedSchemas[0];
    setRunSchema(publicSchema?.name || "public");
    setRunTable(publicSchema?.tables[0]?.name || "");
  };

  const openRunModal = async () => {
    if (!selectedCaseIds.size) return;
    setRunName(`${selectedDataset?.name || "Evaluation"} · v${selectedVersion?.version_number || 1}`);
    setExecutionProgress({ completed: 0, total: selectedCaseIds.size });
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

  if (loading && !workspace.datasets.length) {
    return <div className="h-full flex items-center justify-center"><div className="animate-spin w-8 h-8 rounded-full border-2 border-muted border-t-accent" /></div>;
  }

  return (
    <div className="h-full flex flex-col bg-surface">
      <header className="border-b border-border bg-card/60 px-7 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <select
              value={selectedDatasetId || ""}
              onChange={(event) => setSelectedDatasetId(event.target.value || null)}
              className="h-10 min-w-56 max-w-80 px-3 border border-border rounded-lg bg-surface text-sm font-medium text-card-foreground"
            >
              {!workspace.datasets.length && <option value="">No datasets</option>}
              {workspace.datasets.map((dataset) => <option key={dataset.id} value={dataset.id}>{dataset.name}</option>)}
            </select>
            {selectedDataset && (
              <select
                value={selectedVersionId || ""}
                onChange={(event) => setSelectedVersionId(event.target.value)}
                className="h-10 px-3 border border-border rounded-lg bg-surface text-sm text-card-foreground"
              >
                {datasetVersions.map((version) => (
                  <option key={version.id} value={version.id}>v{version.version_number} · {version.status}</option>
                ))}
              </select>
            )}
            {selectedVersion && <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${statusClass(selectedVersion.status)}`}>{selectedVersion.status}</span>}
          </div>
          <div className="flex items-center gap-2">
            {selectedDataset && (
              <>
                <button type="button" onClick={() => openDatasetModal(selectedDataset)} className="px-3 py-2 text-xs text-muted-foreground hover:text-card-foreground">Edit</button>
                <button type="button" onClick={handleDeleteDataset} disabled={saving} className="px-3 py-2 text-xs text-muted-foreground hover:text-red-500 disabled:opacity-50">Delete</button>
              </>
            )}
            <button type="button" onClick={() => openDatasetModal()} className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90">New dataset</button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 mt-4 -mb-4">
          <nav className="flex items-center gap-5">
            <button type="button" onClick={() => setActiveTab("golden")} className={`pb-3 text-sm font-medium border-b-2 ${activeTab === "golden" ? "border-accent text-card-foreground" : "border-transparent text-muted-foreground"}`}>Golden set</button>
            <button type="button" onClick={() => setActiveTab("runs")} className={`pb-3 text-sm font-medium border-b-2 ${activeTab === "runs" ? "border-accent text-card-foreground" : "border-transparent text-muted-foreground"}`}>Runs <span className="ml-1 text-xs">{datasetRuns.length}</span></button>
          </nav>
          {activeTab === "golden" && selectedVersion && (
            <div className="flex items-center gap-2 pb-2">
              {selectedVersion.status !== "draft" && (
                <button type="button" onClick={handleCloneVersion} disabled={saving} className="px-3 py-2 border border-border rounded-lg text-xs font-medium text-card-foreground hover:bg-muted disabled:opacity-50">Create next version</button>
              )}
              <button type="button" onClick={openRunModal} disabled={!selectedCaseIds.size || executing} className="px-4 py-2 bg-card-foreground text-card rounded-lg text-xs font-medium disabled:opacity-40">
                Run selected · {selectedCaseIds.size}
              </button>
            </div>
          )}
        </div>
      </header>

      {error && (
        <div className="px-7 py-3 border-b border-red-500/20 bg-red-500/10 flex items-center justify-between gap-4 text-sm text-red-500">
          <span>{error}</span><button type="button" onClick={() => setError(null)} className="text-xs">Dismiss</button>
        </div>
      )}

      <div className="flex-1 min-h-0">
        {!selectedDataset ? (
          <div className="h-full flex items-center justify-center text-center px-8">
            <div>
              <p className="text-base font-semibold text-card-foreground">첫 골든셋을 만드세요</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-md">질문, 기준 답변, 기대 근거를 버전으로 관리하고 같은 파이프라인에서 반복 평가할 수 있습니다.</p>
              <button type="button" onClick={() => openDatasetModal()} className="mt-5 px-5 py-2.5 bg-accent text-white rounded-lg text-sm font-medium">Create dataset</button>
            </div>
          </div>
        ) : activeTab === "runs" ? (
          <EvaluationRunsView
            runs={datasetRuns}
            caseRuns={workspace.caseRuns}
            selectedRunId={selectedRunId}
            onSelectRun={setSelectedRunId}
            onReview={handleReview}
            reviewSaving={reviewSaving}
          />
        ) : (
          <div className="h-full grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="h-full overflow-y-auto border-r border-border bg-card/20">
              <div className="sticky top-0 z-10 bg-card px-5 py-4 border-b border-border">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-card-foreground">Cases</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{versionCases.length} total · {selectedCaseIds.size} selected</p>
                  </div>
                  {selectedVersion?.status === "draft" && (
                    <button type="button" onClick={() => setSelectedCaseId(NEW_CASE_ID)} className="w-8 h-8 rounded-lg bg-accent/10 text-accent text-lg hover:bg-accent/20" title="Add case">+</button>
                  )}
                </div>
                {!!versionCases.length && (
                  <label className="flex items-center gap-2 mt-3 text-[11px] text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCaseIds.size === versionCases.length}
                      onChange={(event) => setSelectedCaseIds(event.target.checked ? new Set(versionCases.map((item) => item.id)) : new Set())}
                      className="rounded border-border text-accent focus:ring-accent"
                    />
                    Select all for run
                  </label>
                )}
              </div>
              <div>
                {versionCases.map((evaluationCase, index) => (
                  <div key={evaluationCase.id} className={`flex items-start border-b border-border ${selectedCaseId === evaluationCase.id ? "bg-accent/10" : "hover:bg-muted/30"}`}>
                    <label className="pl-4 pt-4 cursor-pointer">
                      <input type="checkbox" checked={selectedCaseIds.has(evaluationCase.id)} onChange={() => toggleCaseSelection(evaluationCase.id)} className="rounded border-border text-accent focus:ring-accent" />
                    </label>
                    <button type="button" onClick={() => setSelectedCaseId(evaluationCase.id)} className="flex-1 min-w-0 text-left px-3 py-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{evaluationCase.case_key || `Case ${index + 1}`}</span>
                        <span className="text-[10px] text-muted-foreground">{evaluationCase.difficulty}</span>
                      </div>
                      <p className="text-sm leading-5 text-card-foreground mt-2 line-clamp-3">{evaluationCase.question}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {!evaluationCase.answerable && <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-500 rounded text-[9px]">unanswerable</span>}
                        {evaluationCase.tags.slice(0, 3).map((tag) => <span key={tag} className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-[9px]">{tag}</span>)}
                      </div>
                    </button>
                  </div>
                ))}
                {!versionCases.length && (
                  <div className="px-5 py-10 text-center">
                    <p className="text-xs text-muted-foreground">이 버전에 케이스가 없습니다.</p>
                    {selectedVersion?.status === "draft" && <button type="button" onClick={() => setSelectedCaseId(NEW_CASE_ID)} className="mt-3 text-xs font-medium text-accent">Add first case</button>}
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

      {datasetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl p-6">
            <h3 className="text-lg font-semibold text-card-foreground">{editingDataset ? "Edit dataset" : "New evaluation dataset"}</h3>
            <p className="text-xs text-muted-foreground mt-1">골든 케이스를 같은 목적과 버전으로 묶습니다.</p>
            <div className="space-y-4 mt-6">
              <label className="block"><span className="block text-xs font-medium text-muted-foreground mb-2">Name *</span><input autoFocus value={datasetName} onChange={(event) => setDatasetName(event.target.value)} className="w-full h-10 px-3 border border-border rounded-lg bg-surface text-sm text-card-foreground" placeholder="Korean financial reports" /></label>
              <label className="block"><span className="block text-xs font-medium text-muted-foreground mb-2">Description</span><textarea value={datasetDescription} onChange={(event) => setDatasetDescription(event.target.value)} rows={4} className="w-full px-3 py-2.5 border border-border rounded-lg bg-surface text-sm text-card-foreground" placeholder="평가 목적과 포함 문서 범위" /></label>
            </div>
            <div className="flex justify-end gap-3 mt-6"><button type="button" onClick={() => setDatasetModalOpen(false)} disabled={saving} className="px-4 py-2 text-sm text-muted-foreground">Cancel</button><button type="button" onClick={handleSaveDataset} disabled={saving || !datasetName.trim()} className="px-5 py-2.5 bg-accent text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving ? "Saving..." : "Save dataset"}</button></div>
          </div>
        </div>
      )}

      {runModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-xl shadow-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div><h3 className="text-lg font-semibold text-card-foreground">Run evaluation</h3><p className="text-xs text-muted-foreground mt-1">선택한 {selectedCaseIds.size}개 케이스에 동일한 파이프라인을 적용합니다.</p></div>
              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[11px]">Version will freeze</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <label className="block md:col-span-2"><span className="block text-xs font-medium text-muted-foreground mb-2">Run name</span><input value={runName} onChange={(event) => setRunName(event.target.value)} disabled={executing} className="w-full h-10 px-3 border border-border rounded-lg bg-surface text-sm text-card-foreground" /></label>
              <label className="block"><span className="block text-xs font-medium text-muted-foreground mb-2">Schema</span><select value={runSchema} onChange={(event) => { setRunSchema(event.target.value); setRunTable(schemas.find((schema) => schema.name === event.target.value)?.tables[0]?.name || ""); }} disabled={executing} className="w-full h-10 px-3 border border-border rounded-lg bg-surface text-sm text-card-foreground">{schemas.map((schema) => <option key={schema.name} value={schema.name}>{schema.name}</option>)}</select></label>
              <label className="block"><span className="block text-xs font-medium text-muted-foreground mb-2">Vector table</span><select value={runTable} onChange={(event) => setRunTable(event.target.value)} disabled={executing} className="w-full h-10 px-3 border border-border rounded-lg bg-surface text-sm text-card-foreground"><option value="">Select table</option>{schemas.find((schema) => schema.name === runSchema)?.tables.map((table) => <option key={table.name} value={table.name}>{table.name} · {table.rowCount} rows</option>)}</select></label>
              <label className="block"><span className="block text-xs font-medium text-muted-foreground mb-2">Embedding</span><select value={embeddingModel} onChange={(event) => setEmbeddingModel(event.target.value)} disabled={executing} className="w-full h-10 px-3 border border-border rounded-lg bg-surface text-sm text-card-foreground"><option value="text-embedding-3-small">3-small · recommended</option><option value="text-embedding-ada-002">ada-002 · legacy</option></select></label>
              <label className="block"><span className="block text-xs font-medium text-muted-foreground mb-2">Answer model</span><select value={generationModel} onChange={(event) => setGenerationModel(event.target.value as RagGenerationModel)} disabled={executing} className="w-full h-10 px-3 border border-border rounded-lg bg-surface text-sm text-card-foreground"><option value="gpt-5.6-terra">GPT-5.6 Terra</option><option value="gpt-5.6-sol">GPT-5.6 Sol</option><option value="gpt-5.6-luna">GPT-5.6 Luna</option></select></label>
              <label className="block"><span className="block text-xs font-medium text-muted-foreground mb-2">Reasoning</span><select value={reasoningEffort} onChange={(event) => setReasoningEffort(event.target.value as RagReasoningEffort)} disabled={executing} className="w-full h-10 px-3 border border-border rounded-lg bg-surface text-sm text-card-foreground"><option value="none">None</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
              <label className="block"><span className="block text-xs font-medium text-muted-foreground mb-2">Top K</span><input type="number" min={1} max={20} value={topK} onChange={(event) => setTopK(Number(event.target.value))} disabled={executing} className="w-full h-10 px-3 border border-border rounded-lg bg-surface text-sm text-card-foreground" /></label>
            </div>
            <div className="mt-5 px-4 py-3 bg-muted/50 border-l-2 border-accent text-xs leading-5 text-muted-foreground">각 케이스는 OpenAI embedding 1회와 Responses API 1회를 호출합니다. 대상 VDB 테이블에는 먼저 Search Setup이 완료되어 있어야 합니다.</div>
            {executing && (
              <div className="mt-5"><div className="flex items-center justify-between text-xs text-muted-foreground mb-2"><span>Executing cases</span><span>{executionProgress.completed}/{executionProgress.total}</span></div><div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-accent transition-all duration-300" style={{ width: `${executionProgress.total ? (executionProgress.completed / executionProgress.total) * 100 : 0}%` }} /></div></div>
            )}
            <div className="flex justify-end gap-3 mt-6"><button type="button" onClick={() => setRunModalOpen(false)} disabled={executing} className="px-4 py-2 text-sm text-muted-foreground disabled:opacity-50">Cancel</button><button type="button" onClick={executeEvaluationRun} disabled={executing || !runTable || topK < 1 || topK > 20} className="px-5 py-2.5 bg-accent text-white rounded-lg text-sm font-medium disabled:opacity-50">{executing ? "Running..." : `Run ${selectedCaseIds.size} cases`}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
