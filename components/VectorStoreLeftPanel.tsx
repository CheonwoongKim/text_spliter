"use client";

import { memo, useCallback, useState } from "react";
import type { VectorStoreConfig, DatabaseSchema } from "@/lib/types";
import { getAuthToken } from "@/lib/auth";

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
  const [selectedSchemaName, setSelectedSchemaName] = useState<string>("public");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [vectorDimension, setVectorDimension] = useState(1536);
  const [tableToDelete, setTableToDelete] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSchemaChange = useCallback((schemaName: string) => {
    setSelectedSchemaName(schemaName);
  }, []);

  const handleCreateTable = useCallback(async () => {
    if (!newTableName.trim()) {
      setMessage({ type: 'error', text: 'Please enter a table name' });
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
          vectorDimension,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Show SQL instructions if direct creation not supported
        if (data.instructions) {
          setMessage({
            type: 'error',
            text: data.error + '\n\nPlease create the table manually in Supabase SQL Editor.'
          });
        } else {
          throw new Error(data.details || data.error || 'Failed to create table');
        }
        return;
      }

      setMessage({ type: 'success', text: data.message || 'Table created successfully' });
      setNewTableName("");
      setVectorDimension(1536);

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
  }, [newTableName, vectorDimension, onRefresh]);

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
        if (data.instructions) {
          setMessage({
            type: 'error',
            text: data.error + '\n\nPlease delete the table manually in Supabase SQL Editor.'
          });
        } else {
          throw new Error(data.details || data.error || 'Failed to delete table');
        }
        return;
      }

      setMessage({ type: 'success', text: data.message || 'Table deleted successfully' });

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
      <div className="border-b border-border bg-card px-6 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-card-foreground">
            Tables
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={loading}
              className="p-2 text-muted-foreground hover:text-accent
                       disabled:opacity-disabled disabled:cursor-not-allowed
                       transition-smooth"
              title="Create Table"
            >
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
            </button>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 text-muted-foreground hover:text-card-foreground
                       disabled:opacity-disabled disabled:cursor-not-allowed
                       transition-smooth"
              title="Refresh"
            >
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
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-3 px-6">

        {/* Schema Dropdown */}
        <div className="mb-4 mt-2">
          <label className="block text-xs font-medium text-muted-foreground mb-2">
            Schema
          </label>
          <select
            value={selectedSchemaName}
            onChange={(e) => handleSchemaChange(e.target.value)}
            disabled={loading || schemas.length === 0}
            className="w-full h-9 px-3 text-sm border border-border rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-accent
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
            placeholder="Search tables..."
            className="w-full h-9 pl-9 pr-3 text-sm border border-border rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-accent
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
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
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg
                         transition-all duration-200 group cursor-pointer ${
                           config.selectedSchema === selectedSchemaName &&
                           config.selectedTable === table.name
                             ? "bg-accent/10 border border-accent/20 shadow-sm"
                             : "hover:bg-muted/50 hover:shadow-sm border border-transparent"
                         }`}
              >
                <button
                  onClick={() => handleTableSelect(selectedSchemaName, table.name)}
                  className="flex items-start gap-2.5 flex-1 text-left"
                >
                  <svg
                    className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      config.selectedSchema === selectedSchemaName &&
                      config.selectedTable === table.name
                        ? "text-accent"
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
                    <span className={`text-sm font-medium truncate ${
                      config.selectedSchema === selectedSchemaName &&
                      config.selectedTable === table.name
                        ? "text-accent"
                        : "text-card-foreground"
                    }`}>
                      {table.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {table.rowCount.toLocaleString()} rows
                    </span>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTableClick(table.name);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-all flex-shrink-0"
                  title="Delete Table"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Table Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-card-foreground mb-4">
              Create Vector Table
            </h3>

            {message && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm ${
                  message.type === 'success'
                    ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                    : 'bg-red-500/10 text-red-500 border border-red-500/20'
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">
                  Table Name *
                </label>
                <input
                  type="text"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="e.g., my_documents"
                  className="w-full px-3 py-2 border border-border rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-accent
                           bg-surface text-card-foreground"
                  disabled={creating}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Must start with a letter and contain only letters, numbers, and underscores.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">
                  Vector Dimension
                </label>
                <input
                  type="number"
                  value={vectorDimension}
                  onChange={(e) => setVectorDimension(Number(e.target.value))}
                  min={1}
                  max={4096}
                  className="w-full px-3 py-2 border border-border rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-accent
                           bg-surface text-card-foreground"
                  disabled={creating}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Default: 1536 (OpenAI text-embedding-ada-002)
                </p>
              </div>

              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>Note:</strong> If direct table creation fails, you may need to create
                  the table manually in Supabase SQL Editor.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewTableName("");
                  setVectorDimension(1536);
                  setMessage(null);
                }}
                disabled={creating}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-card-foreground
                         disabled:opacity-50 disabled:cursor-not-allowed transition-smooth"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTable}
                disabled={creating || !newTableName.trim()}
                className="px-4 py-2 text-sm bg-accent text-white rounded-lg
                         hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-smooth flex items-center gap-2"
              >
                {creating && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {creating ? 'Creating...' : 'Create Table'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Table Modal */}
      {showDeleteModal && tableToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-card-foreground mb-4">
              Delete Table
            </h3>

            {message && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm ${
                  message.type === 'success'
                    ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                    : 'bg-red-500/10 text-red-500 border border-red-500/20'
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="space-y-4">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <p className="text-sm text-card-foreground">
                  Are you sure you want to delete the table <strong>{tableToDelete}</strong>?
                </p>
                <p className="text-sm text-red-500 mt-2">
                  This action cannot be undone. All data in this table will be permanently deleted.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setTableToDelete(null);
                  setMessage(null);
                }}
                disabled={deleting}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-card-foreground
                         disabled:opacity-50 disabled:cursor-not-allowed transition-smooth"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTableConfirm}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg
                         hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-smooth flex items-center gap-2"
              >
                {deleting && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {deleting ? 'Deleting...' : 'Delete Table'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(VectorStoreLeftPanel);
