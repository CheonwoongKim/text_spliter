"use client";

import { memo, useCallback, useState } from "react";

import RagRunHistory from "@/components/vectorstore/RagRunHistory";
import RagTestPanel from "@/components/vectorstore/RagTestPanel";
import { describeEmbeddingModel } from "@/lib/constants";
import type { DatabaseSchema } from "@/lib/types";
import { MANAGED_VECTOR_SCHEMA } from "@/lib/vectorstore";

/**
 * Asking a grounded question is the point of the whole pipeline, so it gets its
 * own workspace instead of being a tab inside the index browser. The history
 * sits beside it because comparing runs is how a configuration gets chosen.
 */

interface AskWorkspaceProps {
  schemas: DatabaseSchema[];
  selectedSchema?: string;
  selectedTable?: string;
  loading: boolean;
  onSelectCollection: (schema: string, table: string) => void;
}

function AskWorkspace({
  schemas,
  selectedSchema,
  selectedTable,
  loading,
  onSelectCollection,
}: AskWorkspaceProps) {
  const [historyToken, setHistoryToken] = useState(0);
  const [questionSeed, setQuestionSeed] = useState<{ token: number; question: string } | null>(null);

  const collections = schemas.flatMap((schema) =>
    schema.tables.map((table) => ({ schema: schema.name, table })));
  const activeCollection = collections.find((entry) => entry.table.name === selectedTable);

  const handleRunCompleted = useCallback(() => {
    setHistoryToken((token) => token + 1);
  }, []);

  const handleReuseQuestion = useCallback((question: string) => {
    setQuestionSeed({ token: Date.now(), question });
  }, []);

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-b border-border-subtle bg-card px-4 py-3 sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">컬렉션</span>
              <select
                value={selectedTable || ""}
                onChange={(event) => onSelectCollection(
                  selectedSchema || MANAGED_VECTOR_SCHEMA,
                  event.target.value,
                )}
                disabled={loading}
                className="h-control-md min-w-52 rounded-lg border border-control bg-surface px-3 text-xs
                         text-card-foreground focus-ring"
              >
                <option value="">질의할 컬렉션을 선택하세요</option>
                {collections.map((entry) => (
                  <option key={`${entry.schema}.${entry.table.name}`} value={entry.table.name}>
                    {entry.table.name} · {entry.table.rowCount}개 청크
                  </option>
                ))}
              </select>
            </label>

            {activeCollection?.table.embeddingModel && (
              <span className="rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground">
                {describeEmbeddingModel(
                  activeCollection.table.embeddingModel,
                  activeCollection.table.vectorDimension || 0,
                )}
              </span>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <RagTestPanel
            selectedSchema={selectedSchema}
            selectedTable={selectedTable}
            collectionEmbeddingModel={activeCollection?.table.embeddingModel}
            collectionVectorDimension={activeCollection?.table.vectorDimension}
            questionSeed={questionSeed}
            onRunCompleted={handleRunCompleted}
          />
        </div>
      </div>

      <aside className="flex h-full min-h-0 flex-col border-t border-border-subtle lg:border-l lg:border-t-0">
        <div className="border-b border-border-subtle bg-card px-4 py-3">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            실행 이력
          </h3>
        </div>
        <div className="min-h-0 flex-1">
          <RagRunHistory refreshToken={historyToken} onReuseQuestion={handleReuseQuestion} />
        </div>
      </aside>
    </div>
  );
}

export default memo(AskWorkspace);
