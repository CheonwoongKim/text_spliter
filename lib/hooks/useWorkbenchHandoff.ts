"use client";

import { useCallback, useRef, useState } from "react";
import type { AppMenu } from "@/lib/navigation";
import type { ParseResponse } from "@/lib/types";
import {
  buildSplitterHandoff,
  type SplitterHandoff,
  type VectorStoreHandoff,
} from "@/lib/workbench-handoff";

/**
 * A handoff carries a monotonic token so a receiving panel can react to a new
 * transfer even when the payload is identical to the previous one.
 */
type Tokenized<T> = T & { token: number };

export type SplitterHandoffState = Tokenized<SplitterHandoff>;
export type VectorStoreHandoffState = Tokenized<VectorStoreHandoff>;

export interface WorkbenchHandoff {
  splitterHandoff: SplitterHandoffState | null;
  vectorStoreHandoff: VectorStoreHandoffState | null;
  sendParseRunToSplitter: (run: ParseResponse, index?: number) => boolean;
  sendSplitResultToVectorStore: (payload: VectorStoreHandoff) => void;
  clearVectorStoreHandoff: () => void;
}

/**
 * Moves a completed stage of the workbench into the next one without forcing the
 * user to save, switch menus, and search a list for the row they just produced.
 */
export function useWorkbenchHandoff(
  onNavigate: (menu: AppMenu) => void,
): WorkbenchHandoff {
  const [splitterHandoff, setSplitterHandoff] = useState<SplitterHandoffState | null>(null);
  const [vectorStoreHandoff, setVectorStoreHandoff] = useState<VectorStoreHandoffState | null>(null);
  const tokenRef = useRef(0);

  const nextToken = useCallback(() => {
    tokenRef.current += 1;
    return tokenRef.current;
  }, []);

  const sendParseRunToSplitter = useCallback((run: ParseResponse, index = 0) => {
    const handoff = buildSplitterHandoff(run, index);
    if (!handoff) return false;

    setSplitterHandoff({ ...handoff, token: nextToken() });
    onNavigate("splitter");
    return true;
  }, [nextToken, onNavigate]);

  const sendSplitResultToVectorStore = useCallback((payload: VectorStoreHandoff) => {
    setVectorStoreHandoff({ ...payload, token: nextToken() });
    onNavigate("storage");
  }, [nextToken, onNavigate]);

  const clearVectorStoreHandoff = useCallback(() => setVectorStoreHandoff(null), []);

  return {
    splitterHandoff,
    vectorStoreHandoff,
    sendParseRunToSplitter,
    sendSplitResultToVectorStore,
    clearVectorStoreHandoff,
  };
}
