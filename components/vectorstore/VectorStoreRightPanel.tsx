"use client";

import { Database } from "lucide-react";
import Modal from "@/components/shared/Modal";
import { Button } from "@/components/shared/Button";
import { memo, useState, useCallback, useEffect } from "react";
import type { TableDataResponse } from "@/lib/types";
import { VDB_ROWS_PER_PAGE } from "@/lib/constants";
import { useCopyToClipboard } from "@/lib/hooks/useCopyToClipboard";
import Pagination from "@/components/shared/Pagination";
import PanelPlaceholder from "@/components/shared/PanelPlaceholder";

interface VectorStoreRightPanelProps {
  selectedSchema: string | undefined;
  selectedTable: string | undefined;
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
  tableData,
  loading,
  onRefresh,
}: VectorStoreRightPanelProps) {
  const [page, setPage] = useState(0);
  const [modalData, setModalData] = useState<CellModalData | null>(null);
  const { copied, copy, reset } = useCopyToClipboard();
  const rowsPerPage = VDB_ROWS_PER_PAGE;

  useEffect(() => {
    setPage(0);
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
          </div>
          <Button variant="ghost" size="icon" onClick={onRefresh} disabled={loading || !selectedTable} title="Refresh">
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
          </Button>
        </div>
      </div>

      {/* Table Data */}
      <div className="flex-1 overflow-auto">
        {!selectedTable ? (
          <PanelPlaceholder
            icon={Database}
            title="컬렉션을 선택하세요"
            description="왼쪽 목록에서 컬렉션을 고르면 저장된 청크와 메타데이터를 볼 수 있습니다."
          />
        ) : loading ? (
          <PanelPlaceholder loading title="컬렉션을 불러오는 중" />
        ) : !tableData || tableData.rows.length === 0 ? (
          <PanelPlaceholder
            icon={Database}
            title="컬렉션이 비어 있습니다"
            description="청킹 화면에서 'Send to VDB'로 청크를 올리면 여기에 나타납니다."
          />
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
      </div>

      {/* Cell Content Modal */}
      <Modal
        isOpen={Boolean(modalData)}
        onClose={handleCloseModal}
        title={modalData?.columnName || ""}
        description={modalData && typeof modalData.value === "object" && modalData.value !== null
          ? "JSON Object"
          : modalData ? typeof modalData.value : undefined}
        size="xl"
        footer={
          <Button variant="soft" size="sm" onClick={handleCopy}>
            {copied ? "Copied" : "Copy"}
          </Button>
        }
      >
        <pre className="whitespace-pre-wrap break-words rounded-lg border border-border bg-surface p-4 font-mono text-xs text-card-foreground">
          {modalData?.formattedValue}
        </pre>
      </Modal>
    </div>
  );
}

export default memo(VectorStoreRightPanel);
