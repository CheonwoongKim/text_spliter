"use client";

import { Boxes, Check, FileText, LoaderCircle, Save } from "lucide-react";
import TabBar from "@/components/shared/TabBar";
import { Button } from "@/components/shared/Button";
import PanelPlaceholder from "@/components/shared/PanelPlaceholder";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useAuthFetch } from "@/lib/hooks/useAuthFetch";
import type { SplitterRun } from "@/lib/splitter-comparison";
import type { SplitResponse, SplitterConfig, ViewMode } from "@/lib/types";
import type { VectorStoreHandoff } from "@/lib/workbench-handoff";
import CardView from "./CardView";
import JsonViewComponent from "./JsonView";
import SplitterResultsOverview from "./SplitterResultsOverview";

interface RightPanelProps {
  result: SplitResponse | null;
  loading: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  text: string;
  config: SplitterConfig;
  onSendToVectorStore?: (handoff: VectorStoreHandoff) => void;
  runs?: SplitterRun[];
  selectedRunId?: string;
  onSelectRun?: (runId: string) => void;
  onClearRuns?: () => void;
}

type SplitterWorkspaceMode = "overview" | "detail";

const RightPanel = memo(function RightPanel({
  result,
  loading,
  viewMode,
  onViewModeChange,
  text,
  config,
  onSendToVectorStore,
  runs = [],
  selectedRunId,
  onSelectRun,
  onClearRuns,
}: RightPanelProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sending, setSending] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<SplitterWorkspaceMode>("detail");
  const authFetch = useAuthFetch();
  const comparable = runs.length >= 2;

  // Comparison is the point of a second run, so a new one lands on the table.
  const previousRunCount = useRef(runs.length);
  useEffect(() => {
    if (runs.length >= 2 && runs.length !== previousRunCount.current) {
      setWorkspaceMode("overview");
    } else if (runs.length < 2) {
      setWorkspaceMode("detail");
    }
    previousRunCount.current = runs.length;
  }, [runs.length]);

  const handleOpenRun = useCallback((runId: string) => {
    onSelectRun?.(runId);
    setWorkspaceMode("detail");
  }, [onSelectRun]);

  /**
   * Chunks must exist as a persisted split result before they can be embedded,
   * so both the plain save and the vector-store handoff share one write.
   */
  const persistSplitResult = useCallback(async (): Promise<number | null> => {
    if (!result || !text) return null;

    const response = await authFetch<{ id?: number }>("/api/split-results", {
      method: "POST",
      body: JSON.stringify({
        config,
        result,
        originalText: text,
      }),
    });

    return typeof response.id === "number" ? response.id : null;
  }, [authFetch, config, result, text]);

  const handleSave = useCallback(async () => {
    if (!result || !text) return;

    setSaving(true);
    setSaved(false);

    try {
      await persistSplitResult();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Error saving split result:", error);
      alert(error instanceof Error ? error.message : "Failed to save split result");
    } finally {
      setSaving(false);
    }
  }, [persistSplitResult, result, text]);

  const handleSendToVectorStore = useCallback(async () => {
    if (!result || !text || !onSendToVectorStore) return;

    setSending(true);
    try {
      const splitResultId = await persistSplitResult();
      if (splitResultId === null) {
        throw new Error("The split result was saved without an identifier.");
      }

      onSendToVectorStore({
        splitResultId,
        chunkCount: result.totalChunks,
        sourceLabel: result.chunks[0]?.metadata.source?.fileName || result.splitterType,
      });
    } catch (error) {
      console.error("Error sending split result to the vector store:", error);
      alert(error instanceof Error ? error.message : "Failed to send chunks to the vector store");
    } finally {
      setSending(false);
    }
  }, [onSendToVectorStore, persistSplitResult, result, text]);

  return (
    <div className="flex h-full flex-col py-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
            출력
          </h3>

          {comparable && (
            <div className="inline-flex gap-1 rounded-lg bg-muted p-1" aria-label="Result view">
              <button
                type="button"
                onClick={() => setWorkspaceMode("overview")}
                className={`rounded-sm px-3 py-1 text-2xs font-medium transition-smooth ${
                  workspaceMode === "overview"
                    ? "bg-card text-card-foreground shadow-sm"
                    : "text-muted-foreground hover:text-surface-foreground"
                }`}
              >
                Compare {runs.length}
              </button>
              <button
                type="button"
                onClick={() => setWorkspaceMode("detail")}
                className={`rounded-sm px-3 py-1 text-2xs font-medium transition-smooth ${
                  workspaceMode === "detail"
                    ? "bg-card text-card-foreground shadow-sm"
                    : "text-muted-foreground hover:text-surface-foreground"
                }`}
              >
                상세
              </button>
            </div>
          )}
        </div>

        {result && workspaceMode === "detail" && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving || sending}>
              {saving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.5} aria-hidden="true" />
              ) : saved ? (
                <Check className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <Save className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              )}
              {saving ? "Saving..." : saved ? "Saved" : "Save"}
            </Button>

            {onSendToVectorStore && (
              <Button variant="primary" size="sm" onClick={handleSendToVectorStore} disabled={saving || sending} title="Save these chunks and open the vector store upload">
                {sending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.5} aria-hidden="true" />
                ) : (
                  <Boxes className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                )}
                {sending ? "Preparing..." : "Send to VDB"}
              </Button>
            )}
          </div>
        )}
      </div>

      {result && workspaceMode === "detail" && (
        <div className="mb-3">
          <TabBar
            label="보기 전환"
            value={viewMode}
            onChange={onViewModeChange}
            options={[
            { value: "card", label: "Chunks" },
            { value: "json", label: "JSON" },
          ]}
          />
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden border-t border-border-subtle pt-4">
        {comparable && workspaceMode === "overview" ? (
          <SplitterResultsOverview
            runs={runs}
            selectedRunId={selectedRunId}
            onOpenRun={handleOpenRun}
            onClearRuns={() => onClearRuns?.()}
          />
        ) : !result ? (
          <PanelPlaceholder
            loading={loading}
            icon={FileText}
            title={loading ? "청킹 중" : "아직 결과가 없습니다"}
            description={loading
              ? "처리가 끝나면 청크가 여기에 나타납니다."
              : "원본 텍스트를 넣고 분할기를 골라 실행하세요. 설정을 바꿔 다시 실행하면 비교표가 생깁니다."}
          />
        ) : viewMode === "card" ? (
          <CardView result={result} />
        ) : (
          <JsonViewComponent result={result} />
        )}
      </div>
    </div>
  );
});

RightPanel.displayName = "RightPanel";

export default RightPanel;
