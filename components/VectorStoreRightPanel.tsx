"use client";

import { memo, useState, useCallback } from "react";
import type { TableDataResponse } from "@/lib/types";

interface VectorStoreRightPanelProps {
  selectedSchema: string | undefined;
  selectedTable: string | undefined;
  tableData: TableDataResponse | null;
  loading: boolean;
  onLoadTable: () => void;
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
  tableData,
  loading,
  onLoadTable,
  onRefresh,
}: VectorStoreRightPanelProps) {
  const [page, setPage] = useState(0);
  const [modalData, setModalData] = useState<CellModalData | null>(null);
  const [copied, setCopied] = useState(false);
  const rowsPerPage = 50;

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
    setCopied(false);
  }, [formatCellValue]);

  const handleCloseModal = useCallback(() => {
    setModalData(null);
    setCopied(false);
  }, []);

  const handleCopy = useCallback(() => {
    if (modalData) {
      navigator.clipboard.writeText(modalData.formattedValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [modalData]);

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
    <div className="h-full flex flex-col bg-surface border-l border-border">
      {/* Header */}
      <div className="border-b border-border bg-card pl-6 pr-0 py-3">
        <div className="flex items-center justify-between pr-6">
          <div>
            <h3 className="text-sm font-medium text-card-foreground">
              {selectedTable ? (
                <>
                  <span className="text-muted-foreground">{selectedSchema}.</span>
                  {selectedTable}
                </>
              ) : (
                "테이블을 선택하세요"
              )}
            </h3>
          </div>
          <button
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
          </button>
        </div>
      </div>

      {/* Table Data */}
      <div className="flex-1 overflow-auto">
        {!selectedTable ? (
          <div></div>
        ) : loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          </div>
        ) : !tableData || tableData.rows.length === 0 ? (
          <div></div>
        ) : (
          <div className="min-w-full">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-muted border-b border-border">
                <tr>
                  {tableData.columns.map((column, index) => (
                    <th
                      key={column.name}
                      className={`px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider ${
                        index < tableData.columns.length - 1 ? 'border-r border-border' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {column.isPrimaryKey && (
                          <svg
                            className="w-3 h-3 text-accent"
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
                    className="hover:bg-muted/30 transition-colors"
                  >
                    {tableData.columns.map((column, colIndex) => (
                      <td
                        key={`${rowIndex}-${column.name}`}
                        className={`px-4 py-3 text-sm text-card-foreground ${
                          colIndex < tableData.columns.length - 1 ? 'border-r border-border' : ''
                        }`}
                      >
                        <div
                          onClick={() => handleCellClick(column.name, row[column.name])}
                          className="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer hover:text-accent transition-colors"
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
            {tableData.rows.length > rowsPerPage && (
              <div className="sticky bottom-0 bg-card border-t border-border pl-6 pr-0 py-3 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {page * rowsPerPage + 1} to{" "}
                  {Math.min((page + 1) * rowsPerPage, tableData.rows.length)} of{" "}
                  {tableData.rows.length} rows
                </p>
                <div className="flex gap-2 mr-6">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1 text-sm border border-border rounded hover:bg-muted
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={(page + 1) * rowsPerPage >= tableData.rows.length}
                    className="px-3 py-1 text-sm border border-border rounded hover:bg-muted
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cell Content Modal */}
      {modalData && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={handleCloseModal}
        >
          <div
            className="bg-card rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h3 className="text-sm font-medium text-card-foreground">
                  {modalData.columnName}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {typeof modalData.value === "object" && modalData.value !== null
                    ? "JSON Object"
                    : typeof modalData.value}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg
                           bg-accent/10 text-accent hover:bg-accent/20
                           transition-smooth flex items-center gap-1.5"
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
                  className="p-1.5 text-muted-foreground hover:text-card-foreground
                           hover:bg-muted rounded transition-smooth"
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
              <pre className="text-sm text-card-foreground whitespace-pre-wrap break-words font-mono bg-surface p-4 rounded-lg border border-border">
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
