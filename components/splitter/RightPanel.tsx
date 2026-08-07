"use client";

import { Check, FileText, LoaderCircle, Save } from "lucide-react";
import { memo, useCallback, useState } from "react";
import { useAuthFetch } from "@/lib/hooks/useAuthFetch";
import type { SplitResponse, SplitterConfig, ViewMode } from "@/lib/types";
import CardView from "./CardView";
import JsonViewComponent from "./JsonView";

interface RightPanelProps {
  result: SplitResponse | null;
  loading: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  text: string;
  config: SplitterConfig;
}

const RightPanel = memo(function RightPanel({
  result,
  loading,
  viewMode,
  onViewModeChange,
  text,
  config,
}: RightPanelProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const authFetch = useAuthFetch();

  const handleSave = useCallback(async () => {
    if (!result || !text) return;

    setSaving(true);
    setSaved(false);

    try {
      await authFetch("/api/split-results", {
        method: "POST",
        body: JSON.stringify({
          config,
          result,
          originalText: text,
        }),
      });

      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Error saving split result:", error);
      alert(error instanceof Error ? error.message : "Failed to save split result");
    } finally {
      setSaving(false);
    }
  }, [authFetch, config, result, text]);

  return (
    <div className="flex h-full flex-col py-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
          Output
        </h3>

        {result && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex h-control-sm items-center gap-2 rounded-lg bg-surface-foreground px-3 text-xs
                     font-medium text-surface transition-smooth hover:opacity-hover
                     disabled:cursor-not-allowed disabled:opacity-disabled"
          >
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1} aria-hidden="true" />
            ) : saved ? (
              <Check className="h-4 w-4" strokeWidth={1} aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" strokeWidth={1} aria-hidden="true" />
            )}
            {saving ? "Saving..." : saved ? "Saved" : "Save"}
          </button>
        )}
      </div>

      {result && (
        <div className="mb-3">
          <div className="inline-flex gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => onViewModeChange("card")}
              className={`rounded-sm px-3 py-1 text-2xs font-medium transition-smooth ${
                viewMode === "card"
                  ? "bg-card text-card-foreground shadow-sm"
                  : "text-muted-foreground hover:text-surface-foreground"
              }`}
            >
              Chunks
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("json")}
              className={`rounded-sm px-3 py-1 text-2xs font-medium transition-smooth ${
                viewMode === "json"
                  ? "bg-card text-card-foreground shadow-sm"
                  : "text-muted-foreground hover:text-surface-foreground"
              }`}
            >
              JSON
            </button>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden border-t border-border-subtle pt-4">
        {!result ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            {loading ? (
              <LoaderCircle
                className="mb-3 h-icon-md w-icon-md animate-spin text-muted-foreground"
                strokeWidth={1}
                aria-hidden="true"
              />
            ) : (
              <FileText
                className="mb-3 h-icon-md w-icon-md text-muted-foreground"
                strokeWidth={1}
                aria-hidden="true"
              />
            )}
            <p className="text-xs font-medium text-card-foreground">
              {loading ? "Splitting text" : "No result yet"}
            </p>
            <p className="mt-1 text-2xs text-muted-foreground">
              {loading
                ? "Chunks will appear when processing is complete."
                : "Add source text, choose a splitter, and run it."}
            </p>
          </div>
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
