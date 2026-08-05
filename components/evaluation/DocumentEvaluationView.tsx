"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import { evaluationControlStyles as styles } from "@/components/evaluation/controlStyles";
import { getAuthToken } from "@/lib/auth";
import type { DocumentBlock, NormalizedDocument } from "@/lib/document-ir";
import type { DocumentEvaluationDimension } from "@/lib/document-evaluation";
import type {
  DocumentEvaluationBenchmark,
  DocumentEvaluationCandidate,
  DocumentEvaluationGroundTruth,
  DocumentEvaluationRun,
  DocumentEvaluationRunSummary,
  DocumentEvaluationWorkspace,
} from "@/lib/types";

interface ApiErrorBody {
  error?: string;
  details?: string;
}

const EMPTY_WORKSPACE: DocumentEvaluationWorkspace = {
  benchmarks: [], groundTruths: [], runs: [], candidates: [],
};

const METRICS: Array<{
  key: keyof DocumentEvaluationRun["metrics"];
  label: string;
  dimension: DocumentEvaluationDimension | "all";
}> = [
  { key: "textF1", label: "Text F1", dimension: "text" },
  { key: "blockF1", label: "Block F1", dimension: "structure" },
  { key: "blockTypeAccuracy", label: "Type accuracy", dimension: "structure" },
  { key: "readingOrderAccuracy", label: "Reading order", dimension: "readingOrder" },
  { key: "layoutMeanIoU", label: "Layout IoU", dimension: "layout" },
  { key: "tableStructureScore", label: "Table structure", dimension: "table" },
  { key: "figureRecall", label: "Figure recall", dimension: "figure" },
  { key: "provenanceCompleteness", label: "Provenance", dimension: "provenance" },
];

const DIMENSION_LABELS: Record<DocumentEvaluationDimension | "all", string> = {
  all: "All issues",
  text: "Text",
  readingOrder: "Reading order",
  layout: "Layout",
  structure: "Structure",
  table: "Tables",
  figure: "Figures",
  caption: "Captions",
  provenance: "Provenance",
};

async function documentEvaluationRequest<T>(
  body?: Record<string, unknown>,
  query = ""
): Promise<T> {
  const token = getAuthToken();
  if (!token) throw new Error("로그인이 필요합니다.");
  const response = await fetch(`/api/document-evaluation${query}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json() as T & ApiErrorBody;
  if (!response.ok) throw new Error(data.details || data.error || "Document evaluation request failed");
  return data;
}

function statusClass(status: string): string {
  if (status === "frozen" || status === "completed") return "bg-green-500/10 text-green-500";
  if (status === "draft") return "bg-blue-500/10 text-blue-500";
  if (status === "failed") return "bg-red-500/10 text-red-500";
  return "bg-muted text-muted-foreground";
}

function score(value: unknown): string {
  return typeof value === "number" ? `${Math.round(value * 1000) / 10}%` : "—";
}

function candidateLabel(candidate: DocumentEvaluationCandidate): string {
  const engine = candidate.engine_id || candidate.parser_type;
  return candidate.parser_model ? `${engine} · ${candidate.parser_model}` : engine;
}

function runLabel(run: DocumentEvaluationRunSummary): string {
  const engine = run.candidate_metadata.engineId || run.candidate_metadata.parserType || "Parser";
  return run.candidate_metadata.model ? `${engine} · ${run.candidate_metadata.model}` : engine;
}

function findBlock(document: NormalizedDocument | undefined, blockId: string | undefined): DocumentBlock | null {
  if (!document || !blockId) return null;
  for (const page of document.pages) {
    const block = page.blocks.find((item) => item.id === blockId);
    if (block) return block;
  }
  return null;
}

function blockContent(block: DocumentBlock | null): string {
  if (!block) return "연결된 블록이 없습니다.";
  if (block.text || block.markdown || block.html) return block.text || block.markdown || block.html || "";
  if (block.table?.cells.length) {
    return block.table.cells.map((cell) => `[${cell.rowIndex},${cell.columnIndex}] ${cell.text || ""}`).join("\n");
  }
  return JSON.stringify(block, null, 2);
}

export default function DocumentEvaluationView() {
  const [workspace, setWorkspace] = useState<DocumentEvaluationWorkspace>(EMPTY_WORKSPACE);
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string | null>(null);
  const [selectedGroundTruthId, setSelectedGroundTruthId] = useState<string | null>(null);
  const [groundTruthDetail, setGroundTruthDetail] = useState<DocumentEvaluationGroundTruth | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [runDetail, setRunDetail] = useState<DocumentEvaluationRun | null>(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<number>>(new Set());
  const [activeView, setActiveView] = useState<"runs" | "reference">("runs");
  const [issueDimension, setIssueDimension] = useState<DocumentEvaluationDimension | "all">("all");
  const [selectedIssueIndex, setSelectedIssueIndex] = useState(0);
  const [referenceJson, setReferenceJson] = useState("");
  const [referenceNotes, setReferenceNotes] = useState("");
  const [referenceDirty, setReferenceDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createSourceId, setCreateSourceId] = useState("");
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createDocumentType, setCreateDocumentType] = useState("");
  const [createLanguage, setCreateLanguage] = useState("");
  const [createLayout, setCreateLayout] = useState("");
  const [createQuality, setCreateQuality] = useState("");
  const [createTags, setCreateTags] = useState("");

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchWorkspace = useCallback(async () => {
    setLoading(true);
    try {
      const data = await documentEvaluationRequest<DocumentEvaluationWorkspace>();
      setWorkspace(data);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "문서 평가 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchWorkspace(); }, [fetchWorkspace]);

  useEffect(() => {
    if (!workspace.benchmarks.length) {
      setSelectedBenchmarkId(null);
      return;
    }
    if (!selectedBenchmarkId || !workspace.benchmarks.some((item) => item.id === selectedBenchmarkId)) {
      setSelectedBenchmarkId(workspace.benchmarks[0].id);
    }
  }, [workspace.benchmarks, selectedBenchmarkId]);

  const selectedBenchmark = workspace.benchmarks.find((item) => item.id === selectedBenchmarkId) || null;
  const benchmarkGroundTruths = useMemo(
    () => workspace.groundTruths
      .filter((item) => item.benchmark_id === selectedBenchmarkId)
      .sort((left, right) => right.version_number - left.version_number),
    [workspace.groundTruths, selectedBenchmarkId]
  );
  const benchmarkRuns = useMemo(
    () => workspace.runs.filter((item) => item.benchmark_id === selectedBenchmarkId),
    [workspace.runs, selectedBenchmarkId]
  );

  useEffect(() => {
    if (!benchmarkGroundTruths.length) {
      setSelectedGroundTruthId(null);
      return;
    }
    if (!selectedGroundTruthId || !benchmarkGroundTruths.some((item) => item.id === selectedGroundTruthId)) {
      setSelectedGroundTruthId(benchmarkGroundTruths[0].id);
    }
  }, [benchmarkGroundTruths, selectedGroundTruthId]);

  useEffect(() => {
    if (!benchmarkRuns.length) {
      setSelectedRunId(null);
      return;
    }
    if (!selectedRunId || !benchmarkRuns.some((item) => item.id === selectedRunId)) {
      setSelectedRunId(benchmarkRuns[0].id);
    }
  }, [benchmarkRuns, selectedRunId]);

  const selectedGroundTruthSummary = benchmarkGroundTruths.find((item) => item.id === selectedGroundTruthId) || null;
  const selectedRunSummary = benchmarkRuns.find((item) => item.id === selectedRunId) || null;

  useEffect(() => {
    if (!selectedGroundTruthId) {
      setGroundTruthDetail(null);
      return;
    }
    let active = true;
    void documentEvaluationRequest<{ groundTruth: DocumentEvaluationGroundTruth }>(undefined, `?groundTruthId=${encodeURIComponent(selectedGroundTruthId)}`)
      .then((data) => { if (active) setGroundTruthDetail(data.groundTruth); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "기준 문서를 불러오지 못했습니다."); });
    return () => { active = false; };
  }, [selectedGroundTruthId]);

  useEffect(() => {
    if (!groundTruthDetail || groundTruthDetail.id !== selectedGroundTruthId) return;
    setReferenceJson(JSON.stringify(groundTruthDetail.normalized_document, null, 2));
    setReferenceNotes(groundTruthDetail.notes || "");
    setReferenceDirty(false);
    if (groundTruthDetail.status === "draft") setActiveView("reference");
  }, [groundTruthDetail, selectedGroundTruthId]);

  useEffect(() => {
    if (!selectedRunId) {
      setRunDetail(null);
      return;
    }
    let active = true;
    void documentEvaluationRequest<{ run: DocumentEvaluationRun }>(undefined, `?runId=${encodeURIComponent(selectedRunId)}`)
      .then((data) => { if (active) setRunDetail(data.run); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "평가 상세를 불러오지 못했습니다."); });
    return () => { active = false; };
  }, [selectedRunId]);

  useEffect(() => {
    setSelectedCandidateIds(new Set());
    setSelectedIssueIndex(0);
    setIssueDimension("all");
  }, [selectedBenchmarkId]);

  useEffect(() => {
    const storageKey = selectedBenchmark?.source_storage_key;
    if (!storageKey) {
      setPreviewUrl(null);
      setPreviewType(null);
      return;
    }
    const token = getAuthToken();
    if (!token) return;
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setPreviewLoading(true);
    void fetch(`/api/storage/preview?key=${encodeURIComponent(storageKey)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error("원본 미리보기를 불러오지 못했습니다.");
      const blob = await response.blob();
      objectUrl = URL.createObjectURL(blob);
      setPreviewType(response.headers.get("content-type") || blob.type);
      setPreviewUrl(objectUrl);
    }).catch((caught) => {
      if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "원본 미리보기 오류");
    }).finally(() => {
      if (!controller.signal.aborted) setPreviewLoading(false);
    });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selectedBenchmark?.source_storage_key]);

  const candidates = useMemo(() => {
    if (!selectedBenchmark) return [];
    return workspace.candidates.filter((candidate) => {
      if (selectedGroundTruthSummary?.source_parse_result_id === candidate.id) return false;
      return selectedBenchmark.document_hash
        ? candidate.document_hash === selectedBenchmark.document_hash
        : candidate.file_name === selectedBenchmark.file_name;
    });
  }, [workspace.candidates, selectedBenchmark, selectedGroundTruthSummary?.source_parse_result_id]);

  const openCreate = () => {
    const source = workspace.candidates[0];
    setCreateSourceId(source ? String(source.id) : "");
    setCreateName(source ? `${source.file_name} reference` : "");
    setCreateDescription("");
    setCreateDocumentType("");
    setCreateLanguage("");
    setCreateLayout("");
    setCreateQuality("");
    setCreateTags("");
    setCreateOpen(true);
  };

  const createBenchmark = async () => {
    if (!createSourceId || !createName.trim()) return;
    setSaving(true);
    try {
      const response = await documentEvaluationRequest<{ benchmark: DocumentEvaluationBenchmark }>({
        action: "create_benchmark",
        parseResultId: Number(createSourceId),
        name: createName.trim(),
        description: createDescription.trim(),
        attributes: {
          documentType: createDocumentType.trim(),
          language: createLanguage.trim(),
          layout: createLayout.trim(),
          quality: createQuality.trim(),
          tags: createTags.split(",").map((tag) => tag.trim()).filter(Boolean),
        },
      });
      setCreateOpen(false);
      await fetchWorkspace();
      setSelectedBenchmarkId(response.benchmark.id);
      setActiveView("reference");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "문서 벤치마크를 만들지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const saveReference = async () => {
    if (!selectedGroundTruthSummary || selectedGroundTruthSummary.status !== "draft") return;
    let normalizedDocument: unknown;
    try {
      normalizedDocument = JSON.parse(referenceJson);
    } catch {
      setError("Reference IR JSON 형식이 올바르지 않습니다.");
      return;
    }
    setSaving(true);
    try {
      await documentEvaluationRequest({
        action: "update_ground_truth",
        groundTruthId: selectedGroundTruthSummary.id,
        normalizedDocument,
        notes: referenceNotes,
      });
      setReferenceDirty(false);
      await fetchWorkspace();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "기준 문서를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const freezeReference = async () => {
    if (!selectedGroundTruthSummary || referenceDirty) return;
    if (!confirm("Freeze this reference version? It cannot be edited afterward.")) return;
    setSaving(true);
    try {
      await documentEvaluationRequest({ action: "freeze_ground_truth", groundTruthId: selectedGroundTruthSummary.id });
      await fetchWorkspace();
      setActiveView("runs");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "기준 버전을 고정하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const cloneReference = async () => {
    if (!selectedGroundTruthSummary) return;
    setSaving(true);
    try {
      const response = await documentEvaluationRequest<{ groundTruth: DocumentEvaluationGroundTruth }>({
        action: "clone_ground_truth",
        groundTruthId: selectedGroundTruthSummary.id,
      });
      await fetchWorkspace();
      setSelectedGroundTruthId(response.groundTruth.id);
      setActiveView("reference");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "다음 기준 버전을 만들지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const deleteBenchmark = async () => {
    if (!selectedBenchmark || !confirm(`Delete benchmark "${selectedBenchmark.name}" and all evaluation runs?`)) return;
    setSaving(true);
    try {
      await documentEvaluationRequest({ action: "delete_benchmark", benchmarkId: selectedBenchmark.id });
      setSelectedBenchmarkId(null);
      await fetchWorkspace();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "벤치마크를 삭제하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const toggleCandidate = (id: number) => {
    setSelectedCandidateIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const evaluateCandidates = async () => {
    if (!selectedBenchmark || !selectedGroundTruthSummary || !selectedCandidateIds.size) return;
    setEvaluating(true);
    try {
      const response = await documentEvaluationRequest<{ runs: DocumentEvaluationRun[] }>({
        action: "evaluate_candidates",
        benchmarkId: selectedBenchmark.id,
        groundTruthId: selectedGroundTruthSummary.id,
        parseResultIds: Array.from(selectedCandidateIds),
      });
      await fetchWorkspace();
      setSelectedCandidateIds(new Set());
      if (response.runs[0]) setSelectedRunId(response.runs[0].id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "파서 후보를 평가하지 못했습니다.");
    } finally {
      setEvaluating(false);
    }
  };

  const issueEntries = (runDetail?.issues || [])
    .map((issue, index) => ({ issue, index }))
    .filter(({ issue }) => issueDimension === "all" || issue.dimension === issueDimension);
  const selectedIssueEntry = issueEntries.find(({ index }) => index === selectedIssueIndex) || issueEntries[0];
  const selectedIssue = selectedIssueEntry?.issue || null;
  const referenceBlock = findBlock(runDetail?.reference_snapshot, selectedIssue?.referenceBlockId);
  const candidateBlock = findBlock(runDetail?.candidate_snapshot, selectedIssue?.candidateBlockId);

  if (loading && !workspace.benchmarks.length) {
    return <div className="h-full flex items-center justify-center"><div className="animate-spin w-7 h-7 rounded-full border-2 border-muted border-t-accent" /></div>;
  }

  return (
    <div className="h-full flex bg-surface">
      <aside className="w-[280px] flex-shrink-0 border-r border-border bg-card/25 overflow-y-auto">
        <div className="sticky top-0 z-10 px-5 py-4 border-b border-border bg-card flex items-center justify-between gap-3">
          <div><p className="text-xs font-medium text-card-foreground">Document benchmarks</p><p className="text-[11px] text-muted-foreground mt-1">{workspace.benchmarks.length} total</p></div>
          <button type="button" onClick={openCreate} className={`${styles.softIconButton} text-lg`} title="New document benchmark">+</button>
        </div>
        {workspace.benchmarks.map((benchmark) => {
          const truth = workspace.groundTruths.find((item) => item.benchmark_id === benchmark.id);
          const runCount = workspace.runs.filter((item) => item.benchmark_id === benchmark.id).length;
          return (
            <button key={benchmark.id} type="button" onClick={() => setSelectedBenchmarkId(benchmark.id)} className={`w-full px-5 py-4 text-left border-b border-border transition-colors ${selectedBenchmarkId === benchmark.id ? "bg-accent/10" : "hover:bg-muted/30"}`}>
              <div className="flex items-start justify-between gap-2"><p className="text-sm font-medium text-card-foreground line-clamp-2">{benchmark.name}</p>{truth && <span className={`px-1.5 py-0.5 rounded text-[9px] ${statusClass(truth.status)}`}>{truth.status}</span>}</div>
              <p className="text-xs text-muted-foreground mt-2 truncate">{benchmark.file_name}</p>
              <p className="text-[10px] text-muted-foreground mt-2">{runCount} evaluations · {benchmark.attributes.language || "language unset"}</p>
            </button>
          );
        })}
        {!workspace.benchmarks.length && <div className="px-5 py-10 text-center"><p className="text-xs text-muted-foreground">저장된 파서 결과에서 첫 기준 문서를 만드세요.</p><button type="button" onClick={openCreate} className="mt-3 text-xs text-accent">New benchmark</button></div>}
      </aside>

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {error && <div className="px-6 py-3 border-b border-red-500/20 bg-red-500/10 flex items-center justify-between gap-4 text-xs text-red-500"><span>{error}</span><button type="button" onClick={() => setError(null)}>Dismiss</button></div>}
        {!selectedBenchmark ? (
          <div className="h-full flex items-center justify-center text-center px-8"><div><p className="text-sm font-medium text-card-foreground">문서 파싱 벤치마크가 없습니다</p><p className="text-xs text-muted-foreground mt-2">Document IR을 기준 정답으로 교정한 뒤 같은 원본의 파서 결과를 비교합니다.</p><button type="button" onClick={openCreate} className={`mt-5 ${styles.primaryButton}`}>New benchmark</button></div></div>
        ) : (
          <>
            <header className="px-6 py-4 border-b border-border bg-card/35">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0"><div className="flex items-center gap-2"><h3 className="text-base font-semibold text-card-foreground truncate">{selectedBenchmark.name}</h3>{selectedGroundTruthSummary && <span className={`px-2 py-0.5 rounded-full text-[10px] ${statusClass(selectedGroundTruthSummary.status)}`}>v{selectedGroundTruthSummary.version_number} · {selectedGroundTruthSummary.status}</span>}</div><p className="text-xs text-muted-foreground mt-1 truncate">{selectedBenchmark.file_name} · {selectedBenchmark.document_hash || "hash unavailable"}</p></div>
                <div className="flex items-center gap-2">
                  {benchmarkGroundTruths.length > 1 && <select value={selectedGroundTruthId || ""} onChange={(event) => setSelectedGroundTruthId(event.target.value)} className="h-9 px-3 border border-border rounded-md bg-surface text-xs text-card-foreground">{benchmarkGroundTruths.map((item) => <option key={item.id} value={item.id}>Reference v{item.version_number} · {item.status}</option>)}</select>}
                  {selectedGroundTruthSummary?.status !== "draft" && <button type="button" onClick={cloneReference} disabled={saving} className={styles.secondaryButton}>Create next version</button>}
                  <button type="button" onClick={deleteBenchmark} disabled={saving} className={styles.dangerTextButton}>Delete</button>
                </div>
              </div>
              <nav className="flex items-center gap-5 mt-4 -mb-4">
                <button type="button" onClick={() => setActiveView("runs")} className={`pb-3 text-xs font-medium border-b-2 ${activeView === "runs" ? "border-accent text-card-foreground" : "border-transparent text-muted-foreground"}`}>Candidates & results</button>
                <button type="button" onClick={() => setActiveView("reference")} className={`pb-3 text-xs font-medium border-b-2 ${activeView === "reference" ? "border-accent text-card-foreground" : "border-transparent text-muted-foreground"}`}>Source & reference IR</button>
              </nav>
            </header>

            {activeView === "reference" ? (
              <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-2">
                <section className="min-h-0 border-r border-border flex flex-col">
                  <div className="px-5 py-3 border-b border-border flex items-center justify-between"><div><p className="text-xs font-medium text-card-foreground">Original source</p><p className="text-[11px] text-muted-foreground mt-1">원본과 기준 IR을 나란히 교정합니다.</p></div>{previewLoading && <span className="text-[10px] text-muted-foreground">Loading...</span>}</div>
                  <div className="flex-1 min-h-0 bg-muted/20">
                    {previewUrl && previewType?.startsWith("image/") ? <div className="relative w-full h-full"><Image src={previewUrl} alt={selectedBenchmark.file_name} fill unoptimized sizes="50vw" className="object-contain" /></div> : previewUrl && previewType?.startsWith("application/pdf") ? <iframe src={previewUrl} title={selectedBenchmark.file_name} className="w-full h-full border-0" /> : <div className="h-full flex items-center justify-center px-8 text-center text-xs text-muted-foreground">{selectedBenchmark.source_storage_key ? "이 파일 형식은 인라인 미리보기를 지원하지 않습니다." : "원본 Storage 객체가 연결되지 않았습니다."}</div>}
                  </div>
                </section>
                <section className="min-h-0 flex flex-col">
                  <div className="px-5 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-medium text-card-foreground">Reference Document IR</p><p className="text-[11px] text-muted-foreground mt-1">블록 텍스트·유형·순서·영역·표 셀을 검수합니다.</p></div><div className="flex items-center gap-2">{selectedGroundTruthSummary?.status === "draft" ? <><button type="button" onClick={saveReference} disabled={saving || !referenceDirty} className={styles.secondaryButton}>{saving ? "Saving..." : "Save draft"}</button><button type="button" onClick={freezeReference} disabled={saving || referenceDirty} className={styles.compactPrimaryButton}>Freeze reference</button></> : <span className="text-[11px] text-muted-foreground">Frozen {selectedGroundTruthSummary?.frozen_at ? new Date(selectedGroundTruthSummary.frozen_at).toLocaleString() : ""}</span>}</div></div>
                  <textarea value={referenceJson} onChange={(event) => { setReferenceJson(event.target.value); setReferenceDirty(true); }} readOnly={selectedGroundTruthSummary?.status !== "draft"} spellCheck={false} className="flex-1 min-h-[360px] resize-none p-5 bg-surface text-xs leading-5 font-mono text-card-foreground focus:outline-none" />
                  <div className="p-4 border-t border-border"><label className="block"><span className="block text-[11px] text-muted-foreground mb-2">Reference notes</span><textarea value={referenceNotes} onChange={(event) => { setReferenceNotes(event.target.value); setReferenceDirty(true); }} readOnly={selectedGroundTruthSummary?.status !== "draft"} rows={2} className={styles.textArea} /></label>{referenceDirty && <p className="text-[10px] text-amber-500 mt-2">저장되지 않은 변경사항이 있습니다. 고정 전에 초안을 저장하세요.</p>}</div>
                </section>
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col">
                <section className="border-b border-border bg-card/15">
                  <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-medium text-card-foreground">Parser candidates</p><p className="text-[11px] text-muted-foreground mt-1">같은 문서 해시를 가진 성공한 Document IR만 표시합니다.</p></div><button type="button" onClick={evaluateCandidates} disabled={evaluating || selectedGroundTruthSummary?.status !== "frozen" || !selectedCandidateIds.size} className={styles.compactPrimaryButton}>{evaluating ? "Evaluating..." : `Evaluate selected · ${selectedCandidateIds.size}`}</button></div>
                  <div className="max-h-48 overflow-y-auto border-t border-border">
                    {candidates.map((candidate) => {
                      const latest = benchmarkRuns.find((run) => run.parse_result_id === candidate.id && run.ground_truth_id === selectedGroundTruthId);
                      return <label key={candidate.id} className="grid grid-cols-[24px_minmax(0,1fr)_100px_110px] items-center gap-3 px-5 py-2.5 border-b border-border last:border-b-0 hover:bg-muted/20 cursor-pointer"><input type="checkbox" checked={selectedCandidateIds.has(candidate.id)} onChange={() => toggleCandidate(candidate.id)} className="rounded border-border text-accent focus:ring-accent" /><span className="min-w-0"><span className="block text-xs font-medium text-card-foreground truncate">{candidateLabel(candidate)}</span><span className="block text-[10px] text-muted-foreground mt-0.5">{candidate.parser_version || "version unset"}</span></span><span className="text-[11px] text-muted-foreground text-right">{candidate.processing_time ? `${candidate.processing_time}ms` : "—"}</span><span className="text-right">{latest ? <span className={`px-1.5 py-0.5 rounded text-[9px] ${statusClass(latest.status)}`}>{score(latest.metrics.textF1)}</span> : <span className="text-[10px] text-muted-foreground">Not evaluated</span>}</span></label>;
                    })}
                    {!candidates.length && <div className="px-5 py-6 text-center text-xs text-muted-foreground">같은 원본에서 생성된 다른 파서 실행이 없습니다.</div>}
                  </div>
                  {selectedGroundTruthSummary?.status !== "frozen" && <div className="px-5 py-2.5 border-t border-amber-500/20 bg-amber-500/5 text-[11px] text-amber-500">평가 전에 Reference IR을 검수하고 고정하세요.</div>}
                </section>

                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
                  <aside className="overflow-y-auto border-r border-border">
                    <div className="px-4 py-3 border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">Evaluation history</div>
                    {benchmarkRuns.map((run) => <button key={run.id} type="button" onClick={() => setSelectedRunId(run.id)} className={`w-full text-left px-4 py-3 border-b border-border transition-colors ${selectedRunId === run.id ? "bg-muted/70" : "hover:bg-muted/30"}`}><div className="flex items-start justify-between gap-2"><p className="text-xs font-medium text-card-foreground truncate">{runLabel(run)}</p><span className={`px-1.5 py-0.5 rounded text-[9px] ${statusClass(run.status)}`}>{run.status}</span></div><div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground"><span>Text {score(run.metrics.textF1)}</span><span>{run.issue_count} issues</span></div><p className="text-[10px] text-muted-foreground mt-1">{new Date(run.created_at).toLocaleString()}</p></button>)}
                    {!benchmarkRuns.length && <div className="px-4 py-8 text-center text-xs text-muted-foreground">평가 이력이 없습니다.</div>}
                  </aside>

                  <section className="overflow-y-auto">
                    {!selectedRunSummary || !runDetail || runDetail.id !== selectedRunSummary.id ? <div className="h-full flex items-center justify-center text-xs text-muted-foreground">평가 실행을 선택하세요.</div> : <div className="max-w-6xl mx-auto px-6 py-6 space-y-7">
                      <div><div className="flex flex-wrap items-start justify-between gap-4"><div><h4 className="text-sm font-semibold text-card-foreground">{runLabel(selectedRunSummary)}</h4><p className="text-[11px] text-muted-foreground mt-1">{runDetail.framework_version} · reference v{benchmarkGroundTruths.find((item) => item.id === runDetail.ground_truth_id)?.version_number || "—"}</p></div><span className="text-[11px] text-muted-foreground">{runDetail.metrics.samples.matchedBlocks}/{runDetail.metrics.samples.referenceBlocks} blocks matched</span></div>
                        <div className="flex flex-wrap mt-4 border-y border-border">{METRICS.map((metric) => <button key={metric.key} type="button" onClick={() => { setIssueDimension(metric.dimension); const first = runDetail.issues.findIndex((issue) => metric.dimension === "all" || issue.dimension === metric.dimension); if (first >= 0) setSelectedIssueIndex(first); }} className={`flex-[1_1_125px] min-w-[125px] text-left py-3 pr-4 transition-colors ${issueDimension === metric.dimension ? "text-accent" : "hover:text-accent"}`}><span className="block text-[9px] uppercase tracking-wider text-muted-foreground">{metric.label}</span><strong className="block text-sm mt-1 text-card-foreground">{score(runDetail.metrics[metric.key])}</strong></button>)}</div>
                      </div>

                      <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_320px] gap-7">
                        <div>
                          <div className="flex items-center justify-between gap-3 mb-3"><div><h5 className="text-xs font-medium text-card-foreground">Issues</h5><p className="text-[10px] text-muted-foreground mt-1">블록 매칭 이후의 누락·추가·순서·영역 오차입니다.</p></div><select value={issueDimension} onChange={(event) => { const dimension = event.target.value as DocumentEvaluationDimension | "all"; setIssueDimension(dimension); const first = runDetail.issues.findIndex((issue) => dimension === "all" || issue.dimension === dimension); setSelectedIssueIndex(Math.max(0, first)); }} className="h-8 px-2 border border-border rounded-md bg-surface text-[11px] text-card-foreground">{Object.entries(DIMENSION_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
                          <div className="border-t border-border max-h-[420px] overflow-y-auto">{issueEntries.map(({ issue, index }) => <button key={`${index}-${issue.code}`} type="button" onClick={() => setSelectedIssueIndex(index)} className={`w-full grid grid-cols-[70px_90px_minmax(0,1fr)_52px] gap-3 px-3 py-3 text-left border-b border-border transition-colors ${selectedIssueIndex === index ? "bg-muted/60" : "hover:bg-muted/25"}`}><span className={`text-[9px] uppercase ${issue.severity === "error" ? "text-red-500" : issue.severity === "warning" ? "text-amber-500" : "text-muted-foreground"}`}>{issue.severity}</span><span className="text-[10px] text-muted-foreground">p.{issue.pageNumber} · {issue.dimension}</span><span className="text-xs text-card-foreground">{issue.message}</span><span className="text-[10px] text-right text-muted-foreground">{score(issue.score)}</span></button>)}{!issueEntries.length && <div className="px-4 py-8 text-center text-xs text-muted-foreground">이 범주의 오차가 없습니다.</div>}</div>
                        </div>
                        <div><h5 className="text-xs font-medium text-card-foreground mb-3">Page summary</h5><div className="border-t border-border">{runDetail.metrics.pages.map((page) => <div key={page.pageNumber} className="grid grid-cols-[40px_1fr_1fr_1fr] gap-2 py-2.5 border-b border-border text-[10px]"><span className="text-card-foreground">p.{page.pageNumber}</span><span className="text-muted-foreground">Text <strong className="text-card-foreground">{score(page.textSimilarity)}</strong></span><span className="text-muted-foreground">Order <strong className="text-card-foreground">{score(page.readingOrderAccuracy)}</strong></span><span className="text-muted-foreground text-right">{page.issueCount} issues</span></div>)}</div></div>
                      </div>

                      {selectedIssue && <section className="border-t border-border pt-6"><div className="flex items-center justify-between gap-3 mb-4"><div><h5 className="text-xs font-medium text-card-foreground">Reference / candidate inspection</h5><p className="text-[10px] text-muted-foreground mt-1">{selectedIssue.code} · page {selectedIssue.pageNumber}</p></div>{typeof selectedIssue.score === "number" && <span className="text-xs font-semibold text-card-foreground">{score(selectedIssue.score)}</span>}</div><div className="grid grid-cols-1 xl:grid-cols-2 gap-6"><div><p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Reference block</p><pre className="min-h-32 max-h-72 overflow-auto p-4 border-l-2 border-accent bg-accent/5 text-xs leading-5 text-card-foreground whitespace-pre-wrap">{blockContent(referenceBlock)}</pre></div><div><p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Candidate block</p><pre className="min-h-32 max-h-72 overflow-auto p-4 border-l-2 border-border bg-muted/20 text-xs leading-5 text-card-foreground whitespace-pre-wrap">{blockContent(candidateBlock)}</pre></div></div></section>}
                    </div>}
                  </section>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {createOpen && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-xl shadow-2xl p-6"><h3 className="text-lg font-semibold text-card-foreground">New document benchmark</h3><p className="text-xs text-muted-foreground mt-1">저장된 파서 결과를 교정 가능한 Reference Document IR 초안으로 복제합니다.</p><div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6"><label className="block md:col-span-2"><span className="block text-xs font-medium text-muted-foreground mb-2">Reference parser run</span><select value={createSourceId} onChange={(event) => { setCreateSourceId(event.target.value); const source = workspace.candidates.find((item) => item.id === Number(event.target.value)); if (source) setCreateName(`${source.file_name} reference`); }} className={styles.field}><option value="">Select a stored Document IR</option>{workspace.candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.file_name} · {candidateLabel(candidate)}</option>)}</select></label><label className="block md:col-span-2"><span className="block text-xs font-medium text-muted-foreground mb-2">Name</span><input value={createName} onChange={(event) => setCreateName(event.target.value)} className={styles.field} /></label><label className="block md:col-span-2"><span className="block text-xs font-medium text-muted-foreground mb-2">Description</span><textarea value={createDescription} onChange={(event) => setCreateDescription(event.target.value)} rows={3} className={styles.textArea} /></label><label><span className="block text-xs font-medium text-muted-foreground mb-2">Document type</span><input value={createDocumentType} onChange={(event) => setCreateDocumentType(event.target.value)} className={styles.field} placeholder="financial-report" /></label><label><span className="block text-xs font-medium text-muted-foreground mb-2">Language</span><input value={createLanguage} onChange={(event) => setCreateLanguage(event.target.value)} className={styles.field} placeholder="ko" /></label><label><span className="block text-xs font-medium text-muted-foreground mb-2">Layout</span><input value={createLayout} onChange={(event) => setCreateLayout(event.target.value)} className={styles.field} placeholder="multi-column" /></label><label><span className="block text-xs font-medium text-muted-foreground mb-2">Source quality</span><input value={createQuality} onChange={(event) => setCreateQuality(event.target.value)} className={styles.field} placeholder="digital / scan" /></label><label className="block md:col-span-2"><span className="block text-xs font-medium text-muted-foreground mb-2">Tags</span><input value={createTags} onChange={(event) => setCreateTags(event.target.value)} className={styles.field} placeholder="table, chart, rotated" /></label></div><div className="flex justify-end gap-3 mt-6"><button type="button" onClick={() => setCreateOpen(false)} disabled={saving} className={styles.textButton}>Cancel</button><button type="button" onClick={createBenchmark} disabled={saving || !createSourceId || !createName.trim()} className={styles.primaryButton}>{saving ? "Creating..." : "Create draft reference"}</button></div></div></div>}
    </div>
  );
}
