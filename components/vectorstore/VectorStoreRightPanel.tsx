"use client";

import { Database, LoaderCircle } from "lucide-react";
import { memo, useState, useCallback, useEffect } from "react";
import type { TableDataResponse } from "@/lib/types";
import { VDB_ROWS_PER_PAGE } from "@/lib/constants";
import { useCopyToClipboard } from "@/lib/hooks/useCopyToClipboard";
import Pagination from "@/components/shared/Pagination";
import RagTestPanel from "@/components/vectorstore/RagTestPanel";

interface VectorStoreRightPanelProps {
  selectedSchema: string | undefined;
  selectedTable: string | undefined;
  selectedTableEmbeddingModel?: string;
  selectedTableVectorDimension?: number;
  tableData: TableDataResponse | null;
  loading: boolean;
  onRefresh: () => void;
}

interface CellModalData {
  columnName: string;
  value: any;
  formattedValue: string;
}

function VectorStoreRightPanel({
  selectedSchema,
  selectedTable,
  selectedTableEmbeddingModel,
  selectedTableVectorDimension,
  tableData,
  loading,
  onRefresh,
}: VectorStoreRightPanelProps) {
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState<"data" | "rag">("data");
  const [modalData, setModalData] = useState<CellModalData | null>(null);
  const { copied, copy, reset } = useCopyToClipboard();
  const rowsPerPage = VDB_ROWS_PER_PAGE;

  useEffect(() => {
    setPage(0);
    setActiveTab("data");
  }, [selectedSchema, selectedTable]);

  const formatCellValue = useCallback((value: any) => {
    if (value === null || value === undefined) {
      return "null";
    }
    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }, []);

  const handleCellClick = useCallback((columnName: string, value: any) => {
    const formattedValue = formatCellValue(value);
    setModalData({ columnName, value, formattedValue });
    reset();
  }, [formatCellValue, reset]);

  const handleCloseModal = useCallback(() => {
    setModalData(null);
    reset();
  }, [reset]);

  const handleCopy = useCallback(() => {
    if (modalData) {
      copy(modalData.formattedValue);
    }
  }, [modalData, copy]);

  const renderCellContent = useCallback((value: any) => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">null</span>;
    }
    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  }, []);

  return (
    <div className="h-full flex flex-col bg-surface border-l border-border-subtle">
      {/* Header */}
      <div className="border-b border-border-subtle bg-card pl-6 pr-0 py-3">
        <div className="flex items-center justify-between pr-6">
          <div className="flex items-center gap-4">
            <h3 className="text-xs font-medium text-card-foreground">
              {selectedTable ? (
                <>
                  <span className="text-muted-foreground">{selectedSchema}.</span>
                  {selectedTable}
                </>
              ) : (
                "Select a collection"
              )}
            </h3>
            {selectedTable && (
              <div className="flex items-center gap-1 rounded-lg bg-upload-zone p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("data")}
                  className={`px-3 py-1 rounded-lg text-2xs font-medium transition-colors ${
                    activeTab === "data"
                      ? "bg-card text-card-foreground shadow-sm"
                      : "text-muted-foreground hover:text-card-foreground"
                  }`}
                >
                  Data
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("rag")}
                  className={`px-3 py-1 rounded-lg text-2xs font-medium transition-colors ${
                    activeTab === "rag"
                      ? "bg-card text-card-foreground shadow-sm"
                      : "text-muted-foreground hover:text-card-foreground"
                  }`}
                >
                  RAG Test
                </button>
              </div>
            )}
          </div>
          {activeTab === "data" && <button
            onClick={onRefresh}
            disabled={loading || !selectedTable}
            className="p-2 text-muted-foreground hover:text-card-foreground
                     disabled:opacity-disabled disabled:cursor-not-allowed
                     transition-smooth"
            title="Refresh"
          >
            {loading ? (
              <svg
                className="animate-spin h-4 w-4"
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
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
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
            )}
          </button>}
        </div>
      </div>

      {/* Table Data */}
      {activeTab === "rag" ? (
        <div className="flex-1 overflow-hidden">
          <RagTestPanel
            selectedSchema={selectedSchema}
            selectedTable={selectedTable}
            collectionEmbeddingModel={selectedTableEmbeddingModel}
            collectionVectorDimension={selectedTableVectorDimension}
          />
        </div>
      ) : <div className="flex-1 overflow-auto">
        {!selectedTable ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Database
              className="mb-3 h-icon-md w-icon-md text-muted-foreground"
              strokeWidth={1}
              aria-hidden="true"
            />
            <p className="text-xs font-medium text-card-foreground">No collection selected</p>
            <p className="mt-1 text-2xs text-muted-foreground">
              Choose a collection from the left panel.
            </p>
          </div>
        ) : loading ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <LoaderCircle
              className="mb-3 h-icon-md w-icon-md animate-spin text-muted-foreground"
              strokeWidth={1}
              aria-hidden="true"
            />
            <p className="text-xs font-medium text-card-foreground">Loading collection</p>
          </div>
        ) : !tableData || tableData.rows.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Database
              className="mb-3 h-icon-md w-icon-md text-muted-foreground"
              strokeWidth={1}
              aria-hidden="true"
            />
            <p className="text-xs font-medium text-card-foreground">Collection is empty</p>
            <p className="mt-1 text-2xs text-muted-foreground">
              Upload chunks to see rows here.
            </p>
          </div>
        ) : (
          <div className="min-w-full">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-muted border-b border-border">
                <tr>
                  {tableData.columns.map((column, index) => (
                    <th
                      key={column.name}
                      className={`px-4 py-3 text-left text-2xs font-medium text-muted-foreground uppercase tracking-wide ${
                        index < tableData.columns.length - 1 ? 'border-r border-border' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {column.isPrimaryKey && (
                          <svg
                            className="w-3 h-3 text-card-foreground"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                            />
                          </svg>
                        )}
                        <span>{column.name}</span>
                        <span className="text-muted-foreground/50 font-normal lowercase">
                          {column.type}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-border">
                {tableData.rows.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="hover:bg-muted transition-colors"
                  >
                    {tableData.columns.map((column, colIndex) => (
                      <td
                        key={`${rowIndex}-${column.name}`}
                        className={`px-4 py-3 text-xs text-card-foreground ${
                          colIndex < tableData.columns.length - 1 ? 'border-r border-border' : ''
                        }`}
                      >
                        <div
                          onClick={() => handleCellClick(column.name, row[column.name])}
                          className="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer hover:text-card-foreground transition-colors"
                          title="Click to view full content"
                        >
                          {renderCellContent(row[column.name])}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <Pagination
              page={page}
              total={tableData.rows.length}
              rowsPerPage={rowsPerPage}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>}

      {/* Cell Content Modal */}
      {modalData && (
        <div
          className="fixed inset-0 bg-overlay flex items-center justify-center z-modal"
          onClick={handleCloseModal}
        >
          <div
            className="bg-card rounded-lg shadow-lg max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h3 className="text-xs font-medium text-card-foreground">
                  {modalData.columnName}
                </h3>
                <p className="text-2xs text-muted-foreground mt-1">
                  {typeof modalData.value === "object" && modalData.value !== null
                    ? "JSON Object"
                    : typeof modalData.value}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 text-2xs font-medium rounded-lg
                           bg-upload-zone text-card-foreground hover:bg-muted
                           transition-smooth flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
                <button
                  onClick={handleCloseModal}
                  className="p-2 text-muted-foreground hover:text-card-foreground
                           hover:bg-muted rounded-sm transition-smooth"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto px-6 py-4">
              <pre className="text-xs text-card-foreground whitespace-pre-wrap break-words font-mono bg-surface p-4 rounded-lg border border-border">
                {modalData.formattedValue}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(VectorStoreRightPanel);
