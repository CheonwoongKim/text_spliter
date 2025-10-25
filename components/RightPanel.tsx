"use client";

import { useState, useCallback } from "react";
import { SplitResponse, ViewMode, SplitterConfig } from "@/lib/types";
import JsonViewComponent from "./JsonView";
import CardView from "./CardView";

interface RightPanelProps {
  result: SplitResponse | null;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  text: string;
  config: SplitterConfig;
}

const emptyResult: SplitResponse = {
  chunks: [],
  totalChunks: 0,
  splitterType: "RecursiveCharacterTextSplitter",
  parameters: {
    splitterType: "RecursiveCharacterTextSplitter",
    chunkSize: 1000,
    chunkOverlap: 200,
  },
  statistics: {
    averageChunkSize: 0,
    minChunkSize: 0,
    maxChunkSize: 0,
    processingTime: 0,
  },
};

export default function RightPanel({
  result,
  viewMode,
  onViewModeChange,
  text,
  config,
}: RightPanelProps) {
  const displayResult = result || emptyResult;
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    if (!result || !text) return;

    setSaving(true);
    setSaved(false);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('Please login first');
        setSaving(false);
        return;
      }

      const response = await fetch('/api/split-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          config,
          result,
          originalText: text,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save split result');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving split result:', error);
      alert(error instanceof Error ? error.message : 'Failed to save split result');
    } finally {
      setSaving(false);
    }
  }, [result, config, text]);

  return (
    <div className="h-full flex flex-col py-6 bg-surface">
      {/* Header with Title and View Mode Toggle */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-surface-foreground">Result</h3>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => onViewModeChange("card")}
              className={`px-3 py-1 text-xs font-medium rounded transition-smooth ${
                viewMode === "card"
                  ? "bg-card text-card-foreground shadow-sm"
                  : "text-muted-foreground hover:text-surface-foreground"
              }`}
            >
              Chunk
            </button>
            <button
              onClick={() => onViewModeChange("json")}
              className={`px-3 py-1 text-xs font-medium rounded transition-smooth ${
                viewMode === "json"
                  ? "bg-card text-card-foreground shadow-sm"
                  : "text-muted-foreground hover:text-surface-foreground"
              }`}
            >
              Json
            </button>
          </div>

          {/* Save Button */}
          {result && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 text-xs bg-accent/10 text-accent hover:bg-accent/20
                       rounded-md transition-smooth flex items-center gap-2
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Saving...
                </>
              ) : saved ? (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Saved
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                    />
                  </svg>
                  Save
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "card" ? (
          <CardView result={displayResult} />
        ) : (
          <JsonViewComponent result={displayResult} />
        )}
      </div>
    </div>
  );
}
