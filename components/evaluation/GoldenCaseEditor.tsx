"use client";

import { useEffect, useState } from "react";

import type { EvaluationCase, ExpectedEvidence } from "@/lib/types";

export interface GoldenCasePayload {
  caseKey: string;
  question: string;
  referenceAnswer: string;
  referenceFacts: string[];
  expectedEvidence: ExpectedEvidence[];
  answerable: boolean;
  tags: string[];
  language: string;
  difficulty: "easy" | "medium" | "hard";
  rubric: Record<string, string | string[]>;
  notes: string;
  position: number;
}

interface GoldenCaseEditorProps {
  evaluationCase: EvaluationCase | null;
  isNew: boolean;
  editable: boolean;
  saving: boolean;
  nextPosition: number;
  onSave: (payload: GoldenCasePayload) => Promise<void>;
  onDelete: () => Promise<void>;
  onCancelNew: () => void;
}

function evidenceToText(items: ExpectedEvidence[]): string {
  return items.map((item) => [
    item.documentHash || "",
    item.pageNumber || "",
    item.blockId || "",
    item.chunkKey || "",
    item.note || "",
  ].join(" | ")).join("\n");
}

function parseEvidence(value: string): ExpectedEvidence[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [documentHash, rawPage, blockId, chunkKey, ...noteParts] = line
        .split("|")
        .map((part) => part.trim());
      const pageNumber = rawPage ? Number(rawPage) : undefined;
      if (rawPage && (!Number.isInteger(pageNumber) || Number(pageNumber) < 1)) {
        throw new Error(`근거 페이지 번호가 올바르지 않습니다: ${rawPage}`);
      }
      const evidence: ExpectedEvidence = {};
      if (documentHash) evidence.documentHash = documentHash;
      if (pageNumber) evidence.pageNumber = pageNumber;
      if (blockId) evidence.blockId = blockId;
      if (chunkKey) evidence.chunkKey = chunkKey;
      const note = noteParts.join(" | ").trim();
      if (note) evidence.note = note;
      if (Object.keys(evidence).length === 0) {
        throw new Error("근거 행에는 문서 해시, 페이지, 블록, 청크 또는 설명이 필요합니다.");
      }
      return evidence;
    });
}

function rubricString(
  rubric: Record<string, unknown>,
  key: string
): string {
  const value = rubric[key];
  return typeof value === "string" ? value : "";
}

function rubricArrayString(
  rubric: Record<string, unknown>,
  key: string
): string {
  const value = rubric[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").join(", ") : "";
}

export default function GoldenCaseEditor({
  evaluationCase,
  isNew,
  editable,
  saving,
  nextPosition,
  onSave,
  onDelete,
  onCancelNew,
}: GoldenCaseEditorProps) {
  const [caseKey, setCaseKey] = useState("");
  const [question, setQuestion] = useState("");
  const [referenceAnswer, setReferenceAnswer] = useState("");
  const [referenceFacts, setReferenceFacts] = useState("");
  const [expectedEvidence, setExpectedEvidence] = useState("");
  const [answerable, setAnswerable] = useState(true);
  const [tags, setTags] = useState("");
  const [language, setLanguage] = useState("ko");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [criteria, setCriteria] = useState("");
  const [requiredTerms, setRequiredTerms] = useState("");
  const [forbiddenClaims, setForbiddenClaims] = useState("");
  const [notes, setNotes] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const rubric = (evaluationCase?.rubric || {}) as Record<string, unknown>;
    setCaseKey(evaluationCase?.case_key || "");
    setQuestion(evaluationCase?.question || "");
    setReferenceAnswer(evaluationCase?.reference_answer || "");
    setReferenceFacts((evaluationCase?.reference_facts || []).join("\n"));
    setExpectedEvidence(evidenceToText(evaluationCase?.expected_evidence || []));
    setAnswerable(evaluationCase?.answerable ?? true);
    setTags((evaluationCase?.tags || []).join(", "));
    setLanguage(evaluationCase?.language || "ko");
    setDifficulty(evaluationCase?.difficulty || "medium");
    setCriteria(rubricString(rubric, "criteria"));
    setRequiredTerms(rubricArrayString(rubric, "requiredTerms"));
    setForbiddenClaims(rubricArrayString(rubric, "forbiddenClaims"));
    setNotes(evaluationCase?.notes || "");
    setLocalError(null);
  }, [evaluationCase, isNew]);

  if (!evaluationCase && !isNew) {
    return (
      <div className="h-full flex items-center justify-center px-10 text-center">
        <div>
          <p className="text-sm font-medium text-card-foreground">케이스를 선택하세요</p>
          <p className="text-xs text-muted-foreground mt-2">
            질문, 기준 답변과 기대 근거를 한 화면에서 편집할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    setLocalError(null);
    try {
      if (!question.trim()) throw new Error("질문을 입력하세요.");
      const facts = referenceFacts.split("\n").map((item) => item.trim()).filter(Boolean);
      const parsedEvidence = parseEvidence(expectedEvidence);
      const normalizedTags = tags.split(",").map((item) => item.trim()).filter(Boolean);
      const normalizedRequiredTerms = requiredTerms.split(",").map((item) => item.trim()).filter(Boolean);
      const normalizedForbiddenClaims = forbiddenClaims.split(",").map((item) => item.trim()).filter(Boolean);
      await onSave({
        caseKey: caseKey.trim(),
        question: question.trim(),
        referenceAnswer: referenceAnswer.trim(),
        referenceFacts: facts,
        expectedEvidence: parsedEvidence,
        answerable,
        tags: normalizedTags,
        language: language.trim(),
        difficulty,
        rubric: {
          criteria: criteria.trim(),
          requiredTerms: normalizedRequiredTerms,
          forbiddenClaims: normalizedForbiddenClaims,
        },
        notes: notes.trim(),
        position: evaluationCase?.position ?? nextPosition,
      });
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "케이스를 저장하지 못했습니다.");
    }
  };

  const fieldClass = "w-full px-3 py-2.5 border border-border rounded-lg bg-surface text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60";

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-8 py-7">
        <div className="flex items-start justify-between gap-6 pb-5 border-b border-border">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {isNew ? "New golden case" : evaluationCase?.case_key}
            </p>
            <h3 className="text-lg font-semibold text-card-foreground mt-1">
              {isNew ? "평가 케이스 작성" : "평가 케이스 편집"}
            </h3>
          </div>
          {!editable && (
            <span className="px-2.5 py-1 rounded-full bg-muted text-xs text-muted-foreground">Frozen version</span>
          )}
        </div>

        {localError && (
          <div className="mt-5 px-4 py-3 border border-red-500/20 bg-red-500/10 rounded-lg text-sm text-red-500">
            {localError}
          </div>
        )}

        <div className="py-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="block md:col-span-1">
              <span className="block text-xs font-medium text-muted-foreground mb-2">Case key</span>
              <input value={caseKey} onChange={(event) => setCaseKey(event.target.value)} disabled={!editable || saving} placeholder="auto-generated" className={fieldClass} />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-muted-foreground mb-2">Language</span>
              <input value={language} onChange={(event) => setLanguage(event.target.value)} disabled={!editable || saving} placeholder="ko" className={fieldClass} />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-muted-foreground mb-2">Difficulty</span>
              <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as typeof difficulty)} disabled={!editable || saving} className={fieldClass}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="block text-xs font-medium text-muted-foreground mb-2">Question *</span>
            <textarea value={question} onChange={(event) => setQuestion(event.target.value)} disabled={!editable || saving} rows={4} className={fieldClass} placeholder="문서만으로 답할 수 있는 질문을 입력하세요." />
          </label>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <label className="block">
              <span className="block text-xs font-medium text-muted-foreground mb-2">Reference answer</span>
              <textarea value={referenceAnswer} onChange={(event) => setReferenceAnswer(event.target.value)} disabled={!editable || saving} rows={7} className={fieldClass} placeholder="검토자가 기대하는 기준 답변" />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-muted-foreground mb-2">Reference facts</span>
              <textarea value={referenceFacts} onChange={(event) => setReferenceFacts(event.target.value)} disabled={!editable || saving} rows={7} className={fieldClass} placeholder={"답변에 반드시 포함되어야 하는 사실을\n한 줄에 하나씩 입력하세요."} />
            </label>
          </div>

          <label className="block">
            <span className="block text-xs font-medium text-muted-foreground mb-2">Expected evidence</span>
            <textarea value={expectedEvidence} onChange={(event) => setExpectedEvidence(event.target.value)} disabled={!editable || saving} rows={5} className={`${fieldClass} font-mono`} placeholder="document_hash | page | block_id | chunk_key | note" />
            <span className="block text-[11px] text-muted-foreground mt-2">
              한 줄에 하나씩 입력합니다. 모르는 값은 비워 두고 `|` 구분자는 유지하세요.
            </span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <label className="block">
              <span className="block text-xs font-medium text-muted-foreground mb-2">Tags</span>
              <input value={tags} onChange={(event) => setTags(event.target.value)} disabled={!editable || saving} className={fieldClass} placeholder="table, korean, finance" />
            </label>
            <label className="flex items-center gap-3 pt-6 cursor-pointer">
              <input type="checkbox" checked={answerable} onChange={(event) => setAnswerable(event.target.checked)} disabled={!editable || saving} className="w-4 h-4 rounded border-border text-accent focus:ring-accent" />
              <span>
                <span className="block text-sm font-medium text-card-foreground">Answerable</span>
                <span className="block text-xs text-muted-foreground">문서 근거만으로 답할 수 있는 질문</span>
              </span>
            </label>
          </div>

          <div className="pt-2 border-t border-border">
            <h4 className="text-sm font-medium text-card-foreground mt-5 mb-4">Manual review rubric</h4>
            <div className="space-y-4">
              <label className="block">
                <span className="block text-xs font-medium text-muted-foreground mb-2">Decision criteria</span>
                <textarea value={criteria} onChange={(event) => setCriteria(event.target.value)} disabled={!editable || saving} rows={3} className={fieldClass} placeholder="통과/실패를 결정할 때 적용할 기준" />
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-xs font-medium text-muted-foreground mb-2">Required terms</span>
                  <input value={requiredTerms} onChange={(event) => setRequiredTerms(event.target.value)} disabled={!editable || saving} className={fieldClass} placeholder="comma, separated" />
                </label>
                <label className="block">
                  <span className="block text-xs font-medium text-muted-foreground mb-2">Forbidden claims</span>
                  <input value={forbiddenClaims} onChange={(event) => setForbiddenClaims(event.target.value)} disabled={!editable || saving} className={fieldClass} placeholder="허용하면 안 되는 주장" />
                </label>
              </div>
            </div>
          </div>

          <label className="block">
            <span className="block text-xs font-medium text-muted-foreground mb-2">Reviewer notes</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} disabled={!editable || saving} rows={3} className={fieldClass} placeholder="케이스 작성 배경이나 주의사항" />
          </label>
        </div>

        {editable && (
          <div className="flex items-center justify-between gap-4 pt-5 border-t border-border">
            <div>
              {!isNew && (
                <button type="button" onClick={onDelete} disabled={saving} className="text-xs font-medium text-red-500 hover:text-red-400 disabled:opacity-50">
                  Delete case
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {isNew && (
                <button type="button" onClick={onCancelNew} disabled={saving} className="px-4 py-2 text-sm text-muted-foreground hover:text-card-foreground disabled:opacity-50">
                  Cancel
                </button>
              )}
              <button type="button" onClick={handleSubmit} disabled={saving || !question.trim()} className="px-5 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50">
                {saving ? "Saving..." : isNew ? "Add case" : "Save changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
