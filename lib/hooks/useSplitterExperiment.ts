"use client";

import { useCallback, useMemo, useState } from "react";
import {
  splitterRunSignature,
  type SplitterRun,
} from "@/lib/splitter-comparison";
import { isStructureSplittableDocument } from "@/lib/structure-splitter";
import type {
  SourceMetadata,
  SplitRequest,
  SplitResponse,
  SplitterConfig,
  SplitterType,
  ViewMode,
} from "@/lib/types";

const DEFAULT_CONFIG: SplitterConfig = {
  splitterType: "RecursiveCharacterTextSplitter",
  chunkSize: 1000,
  chunkOverlap: 200,
  // separator: undefined by default, let LangChain use its default
  separators: ["\n\n", "\n", " ", ""],
  encodingName: "cl100k_base",
  language: "python",
  breakpointType: "percentile",
};

/**
 * Owns the chunking workspace: one source text, and every configuration that
 * has been run against it.
 *
 * Runs accumulate rather than replace so two chunking strategies can be
 * compared, which is the reason this workbench exists.
 */
export function useSplitterExperiment() {
  const [text, setText] = useState("");
  const [sourceMetadata, setSourceMetadata] = useState<SourceMetadata | null>(null);
  const [config, setConfig] = useState<SplitterConfig>(DEFAULT_CONFIG);
  const [result, setResult] = useState<SplitResponse | null>(null);
  const [runs, setRuns] = useState<SplitterRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Structure splitting reads the Document IR, so it only exists once a parser
  // result has been sent here.
  const structureSplitAvailable = useMemo(
    () => isStructureSplittableDocument(sourceMetadata?.originalJson),
    [sourceMetadata],
  );

  const changeSplitterType = useCallback((splitterType: SplitterType) => {
    setConfig((previous) => ({ ...previous, splitterType }));
  }, []);

  const changeConfig = useCallback((updates: Partial<SplitterConfig>) => {
    setConfig((previous) => ({ ...previous, ...updates }));
  }, []);

  /** Replaces the source text and drops runs, which described the old source. */
  const replaceSource = useCallback((nextText: string, metadata: SourceMetadata | null) => {
    setText(nextText);
    setSourceMetadata(metadata);
    setResult(null);
    setError(null);
    setRuns([]);
    setSelectedRunId(undefined);
  }, []);

  const reset = useCallback(() => {
    replaceSource("", null);
  }, [replaceSource]);

  const clearRuns = useCallback(() => {
    setRuns([]);
    setSelectedRunId(undefined);
  }, []);

  const selectRun = useCallback((runId: string) => {
    const selected = runs.find((run) => run.id === runId);
    if (!selected) return;

    setResult(selected.result);
    setSelectedRunId(runId);
  }, [runs]);

  const split = useCallback(async () => {
    if (!text.trim()) {
      setError("Add source text before splitting.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const requestBody: SplitRequest = {
        text,
        config,
        sourceMetadata: sourceMetadata || undefined,
      };

      const response = await fetch("/api/split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to split text");
      }

      const data: SplitResponse = await response.json();
      setResult(data);

      // An identical configuration reproduces its own row rather than adding a
      // duplicate that would compare a run against itself.
      const signature = splitterRunSignature(config);
      setRuns((previous) => [
        ...previous.filter((existing) => existing.id !== signature),
        { id: signature, config, result: data },
      ]);
      setSelectedRunId(signature);
    } catch (caught) {
      console.error("Error splitting text:", caught);
      setError(caught instanceof Error ? caught.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  }, [config, sourceMetadata, text]);

  return {
    text,
    setText,
    sourceMetadata,
    setSourceMetadata,
    config,
    result,
    runs,
    selectedRunId,
    viewMode,
    setViewMode,
    loading,
    error,
    setError,
    structureSplitAvailable,
    changeSplitterType,
    changeConfig,
    replaceSource,
    reset,
    clearRuns,
    selectRun,
    split,
  };
}
