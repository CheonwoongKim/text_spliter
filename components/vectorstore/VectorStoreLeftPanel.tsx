"use client";

import { memo, useCallback, useEffect, useState } from "react";
import StatusMessage from "@/components/shared/StatusMessage";
import Modal from "@/components/shared/Modal";
import { Button } from "@/components/shared/Button";
import type { VectorStoreConfig, DatabaseSchema } from "@/lib/types";
import { getAuthToken } from "@/lib/auth";
import {
  SUPPORTED_EMBEDDING_MODELS,
  type SupportedEmbeddingModelKey,
} from "@/lib/constants";
import { MANAGED_VECTOR_SCHEMA } from "@/lib/vectorstore";

interface VectorStoreLeftPanelProps {
  config: VectorStoreConfig;
  schemas: DatabaseSchema[];
  loading: boolean;
  onConfigChange: (updates: Partial<VectorStoreConfig>) => void;
  onRefresh: () => void;
}

function VectorStoreLeftPanel({
  config,
  schemas,
  loading,
  onConfigChange,
  onRefresh,
}: VectorStoreLeftPanelProps) {
  const [selectedSchemaName, setSelectedSchemaName] = useState<string>(MANAGED_VECTOR_SCHEMA);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newEmbeddingKey, setNewEmbeddingKey] = useState<SupportedEmbeddingModelKey>(
    SUPPORTED_EMBEDDING_MODELS[0].key
  );
  const newEmbedding = SUPPORTED_EMBEDDING_MODELS.find(
    (model) => model.key === newEmbeddingKey
  ) || SUPPORTED_EMBEDDING_MODELS[0];
  const [tableToDelete, setTableToDelete] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSchemaChange = useCallback((schemaName: string) => {
    setSelectedSchemaName(schemaName);
  }, []);

  useEffect(() => {
    if (schemas.length > 0 && !schemas.some((schema) => schema.name === selectedSchemaName)) {
      setSelectedSchemaName(schemas[0].name);
    }
  }, [schemas, selectedSchemaName]);

  const handleCreateTable = useCallback(async () => {
    if (!newTableName.trim()) {
      setMessage({ type: 'error', text: 'Please enter a collection name' });
      return;
    }

    setCreating(true);
    setMessage(null);

    try {
      const token = getAuthToken();
      if (!token) {
        setMessage({ type: 'error', text: 'Please login first' });
        return;
      }

      const response = await fetch('/api/vectorstore/tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          tableName: newTableName.trim(),
          vectorDimension: newEmbedding.dimensions,
          embeddingModel: newEmbedding.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to create collection');
      }

      setMessage({ type: 'success', text: data.message || 'Collection created successfully' });
      setNewTableName("");

      // Refresh schema list
      setTimeout(() => {
        onRefresh();
        setShowCreateModal(false);
        setMessage(null);
      }, 2000);
    } catch (err) {
      console.error('Error creating table:', err);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to create table'
      });
    } finally {
      setCreating(false);
    }
  }, [newEmbedding, newTableName, onRefresh]);

  const handleDeleteTableClick = useCallback((tableName: string) => {
    setTableToDelete(tableName);
    setShowDeleteModal(true);
    setMessage(null);
  }, []);

  const handleDeleteTableConfirm = useCallback(async () => {
    if (!tableToDelete) return;

    setDeleting(true);
    setMessage(null);

    try {
      const token = getAuthToken();
      if (!token) {
        setMessage({ type: 'error', text: 'Please login first' });
        return;
      }

      const response = await fetch(`/api/vectorstore/tables?tableName=${encodeURIComponent(tableToDelete)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to delete collection');
      }

      setMessage({ type: 'success', text: data.message || 'Collection deleted successfully' });

      // Refresh schema list
      setTimeout(() => {
        onRefresh();
        setShowDeleteModal(false);
        setTableToDelete(null);
        setMessage(null);
      }, 2000);
    } catch (err) {
      console.error('Error deleting table:', err);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to delete table'
      });
    } finally {
      setDeleting(false);
    }
  }, [tableToDelete, onRefresh]);

  const handleTableSelect = useCallback(
    (schema: string, tableName: string) => {
      onConfigChange({ selectedSchema: schema, selectedTable: tableName });
    },
    [onConfigChange]
  );

  // Get selected schema's tables
  const selectedSchema = schemas.find((s) => s.name === selectedSchemaName);
  const filteredTables = selectedSchema?.tables.filter((table) =>
    table.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="h-full flex flex-col relative">
      {/* Header */}
      <div className="border-b border-border-subtle bg-card px-6 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Collections
          </h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setShowCreateModal(true)} disabled={loading} title="Create Collection">
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </Button>
            <Button variant="ghost" size="icon" onClick={onRefresh} disabled={loading} title="새로고침">
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-3 px-6">

        {/* Schema Dropdown */}
        <div className="mb-4 mt-2">
          <label className="block text-xs font-medium text-muted-foreground mb-2">
            스키마
          </label>
          <select
            value={selectedSchemaName}
            onChange={(e) => handleSchemaChange(e.target.value)}
            disabled={loading || schemas.length === 0}
            className="w-full h-control-md px-3 text-xs border border-control rounded-lg
                     focus-ring
                     bg-surface text-card-foreground disabled:opacity-50"
          >
            {schemas.map((schema) => (
              <option key={schema.name} value={schema.name}>
                {schema.name} ({schema.tables.length} tables)
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="mb-4 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search collections..."
            className="w-full h-control-md pl-10 pr-3 text-xs border border-control rounded-lg
                     focus-ring
                     bg-surface text-card-foreground placeholder-light"
          />
          <svg
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Tables List */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-surface-foreground"></div>
          </div>
        ) : schemas.length === 0 ? (
          <div></div>
        ) : filteredTables.length === 0 && searchQuery ? (
          <div></div>
        ) : (
          <div className="space-y-2">
            {filteredTables.map((table) => (
              <div
                key={`${selectedSchemaName}.${table.name}`}
                className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-lg
                         transition-all duration-normal group cursor-pointer ${
                           config.selectedSchema === selectedSchemaName &&
                           config.selectedTable === table.name
                             ? "bg-upload-zone border border-border shadow-sm"
                             : "hover:bg-muted border border-transparent"
                         }`}
              >
                <button
                  onClick={() => handleTableSelect(selectedSchemaName, table.name)}
                  className="flex items-start gap-3 flex-1 text-left"
                >
                  <svg
                    className={`w-4 h-4 mt-1 flex-shrink-0 ${
                      config.selectedSchema === selectedSchemaName &&
                      config.selectedTable === table.name
                        ? "text-card-foreground"
                        : "text-muted-foreground"
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <span className={`text-xs font-medium truncate ${
                      config.selectedSchema === selectedSchemaName &&
                      config.selectedTable === table.name
                        ? "text-card-foreground"
                        : "text-card-foreground"
                    }`}>
                      {table.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {table.rowCount.toLocaleString()} rows
                    </span>
                  </div>
                </button>
                <Button variant="dangerGhost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteTableClick(table.name); }} title="Delete Table">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setNewTableName(""); setMessage(null); }}
        title="벡터 컬렉션 만들기"
        size="sm"
        footer={<>
          <Button variant="ghost" size="md" disabled={creating}
            onClick={() => { setShowCreateModal(false); setNewTableName(""); setMessage(null); }}>
            취소
          </Button>
          <Button variant="primary" size="md" isLoading={creating}
            disabled={creating || !newTableName.trim()} onClick={handleCreateTable}>
            {creating ? "Creating..." : "Create Collection"}
          </Button>
        </>}
      >
        {message && (
          <StatusMessage tone={message.type === "success" ? "success" : "danger"}>
            {message.text}
          </StatusMessage>
        )}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-card-foreground mb-2">
                  Collection Name *
                </label>
                <input
                  type="text"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="e.g., my_documents"
                  className="w-full px-3 py-2 border border-control rounded-lg
                           focus-ring
                           bg-surface text-card-foreground"
                  disabled={creating}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Must start with a letter and contain only letters, numbers, and underscores.
                </p>
              </div>

              <div>
                <label
                  htmlFor="new-collection-embedding-model"
                  className="block text-xs font-medium text-card-foreground mb-2"
                >
                  Embedding Model
                </label>
                <select
                  id="new-collection-embedding-model"
                  value={newEmbeddingKey}
                  onChange={(event) =>
                    setNewEmbeddingKey(event.target.value as SupportedEmbeddingModelKey)}
                  disabled={creating}
                  className="w-full px-3 py-2 border border-control rounded-lg
                           focus-ring bg-surface text-card-foreground"
                >
                  {SUPPORTED_EMBEDDING_MODELS.map((model) => (
                    <option key={model.key} value={model.key}>
                      {model.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  {newEmbedding.description}
                </p>
              </div>

              <div className="bg-upload-zone p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  앱 Supabase에 사용자 전용 컬렉션으로 생성됩니다. 임베딩 모델과 차원은 생성 후 변경할 수 없으며,
                  검색은 항상 이 설정을 사용합니다 ({newEmbedding.dimensions} dimensions,
                  {newEmbedding.searchMode === "exact" ? " 정확 검색" : " HNSW 인덱스 검색"}).
                  설정을 비교하려면 설정별로 컬렉션을 따로 만드세요.
                </p>
              </div>
            </div>

      </Modal>

      <Modal
        isOpen={Boolean(showDeleteModal && tableToDelete)}
        onClose={() => { setShowDeleteModal(false); setTableToDelete(null); setMessage(null); }}
        title="컬렉션 삭제"
        size="sm"
        footer={<>
          <Button variant="ghost" size="md" disabled={deleting}
            onClick={() => { setShowDeleteModal(false); setTableToDelete(null); setMessage(null); }}>
            취소
          </Button>
          <Button variant="danger" size="md" isLoading={deleting} disabled={deleting}
            onClick={handleDeleteTableConfirm}>
            {deleting ? "Deleting..." : "Delete Collection"}
          </Button>
        </>}
      >
        {message && (
          <StatusMessage tone={message.type === "success" ? "success" : "danger"}>
            {message.text}
          </StatusMessage>
        )}
            <div className="space-y-4">
              <div className="bg-danger-surface border border-danger-border rounded-lg p-4">
                <p className="text-xs text-card-foreground">
                  Are you sure you want to delete the collection <strong>{tableToDelete}</strong>?
                </p>
                <p className="text-xs text-danger mt-2">
                  This action cannot be undone. All vector data in this collection will be permanently deleted.
                </p>
              </div>
            </div>

      </Modal>
    </div>
  );
}

export default memo(VectorStoreLeftPanel);
