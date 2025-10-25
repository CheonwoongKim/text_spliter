"use client";

import { memo, useCallback, useState } from "react";
import type { VectorStoreConfig, DatabaseSchema } from "@/lib/types";

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

  const handleSchemaChange = useCallback((schemaName: string) => {
    setSelectedSchemaName(schemaName);
  }, []);

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
          <div className="space-y-1">
            {filteredTables.map((table) => (
              <button
                key={`${selectedSchemaName}.${table.name}`}
                onClick={() => handleTableSelect(selectedSchemaName, table.name)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg
                         transition-smooth text-left ${
                           config.selectedSchema === selectedSchemaName &&
                           config.selectedTable === table.name
                             ? "bg-accent/10 text-accent"
                             : "hover:bg-muted/50 text-card-foreground"
                         }`}
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
                    strokeWidth={1.5}
                    d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-sm flex-1">{table.name}</span>
                <span className="text-xs text-muted-foreground">
                  {table.rowCount} rows
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(VectorStoreLeftPanel);
