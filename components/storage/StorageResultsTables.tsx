import { Archive, Eye, LoaderCircle, Trash2, Upload } from "lucide-react";
import PanelPlaceholder from "@/components/shared/PanelPlaceholder";
import { Button } from "@/components/shared/Button";

import Pagination from "@/components/shared/Pagination";
import type { ParseResult, SplitResult } from "@/components/storage/storage-types";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TableLoadingRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="h-96">
        <div className="flex h-full items-center justify-center">
          <LoaderCircle className="h-8 w-8 animate-spin text-card-foreground" strokeWidth={1} aria-label="Loading" />
        </div>
      </td>
    </tr>
  );
}

/**
 * The table keeps its header and columns when it has no rows, so the shape of
 * what will appear stays visible and the layout does not jump once the first
 * result lands.
 */
function TableEmptyRow({
  colSpan,
  message,
  description,
}: {
  colSpan: number;
  message: string;
  description?: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="h-96">
        <PanelPlaceholder icon={Archive} title={message} description={description} />
      </td>
    </tr>
  );
}

interface ParseResultsTableProps {
  results: ParseResult[];
  loading: boolean;
  page: number;
  total: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onView: (id: number) => void;
  onDelete: (id: number) => void;
}

export function ParseResultsTable({
  results,
  loading,
  page,
  total,
  rowsPerPage,
  onPageChange,
  onView,
  onDelete,
}: ParseResultsTableProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 border-b border-border bg-muted">
            <tr>
              <th className="w-32 whitespace-nowrap px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">유형</th>
              <th className="w-64 whitespace-nowrap px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">File Name</th>
              <th className="w-28 whitespace-nowrap px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">크기</th>
              <th className="w-48 whitespace-nowrap px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">MIME Type</th>
              <th className="w-28 whitespace-nowrap px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">시간</th>
              <th className="w-48 whitespace-nowrap px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">생성일</th>
              <th className="w-28 whitespace-nowrap px-4 py-3 text-center text-2xs font-semibold uppercase tracking-wide text-muted-foreground">동작</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && results.length === 0 ? (
              <TableLoadingRow colSpan={7} />
            ) : results.length === 0 ? (
              <TableEmptyRow
                colSpan={7}
                message="저장된 파싱 결과가 없습니다"
                description="파싱 화면에서 결과를 저장하면 여기에서 다시 열어보고 비교할 수 있습니다."
              />
            ) : (
              results.map((result) => (
                <tr key={result.id} className="transition-smooth hover:bg-muted">
                  <td className="w-32 whitespace-nowrap px-4 py-3">
                    <span className="inline-block whitespace-nowrap rounded-sm bg-upload-zone px-2 py-1 text-2xs font-medium text-card-foreground">
                      {result.parser_type}
                    </span>
                  </td>
                  <td className="w-64 truncate whitespace-nowrap px-4 py-3 text-xs font-medium text-card-foreground">{result.file_name}</td>
                  <td className="w-28 whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatFileSize(result.file_size)}</td>
                  <td className="w-48 truncate whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{result.mime_type}</td>
                  <td className="w-28 whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {result.processing_time ? `${result.processing_time}ms` : "-"}
                  </td>
                  <td className="w-48 whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDate(result.created_at)}</td>
                  <td className="w-28 whitespace-nowrap px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onView(result.id)} aria-label={`View ${result.file_name}`} title="View">
                        <Eye className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                      </Button>
                      <Button variant="dangerGhost" size="icon" onClick={() => onDelete(result.id)} aria-label={`Delete ${result.file_name}`} title="삭제">
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={total} rowsPerPage={rowsPerPage} onPageChange={onPageChange} />
    </div>
  );
}

interface SplitResultsTableProps {
  results: SplitResult[];
  loading: boolean;
  page: number;
  total: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onView: (id: number) => void;
  onUpload: (id: number) => void;
  onDelete: (id: number) => void;
}

export function SplitResultsTable({
  results,
  loading,
  page,
  total,
  rowsPerPage,
  onPageChange,
  onView,
  onUpload,
  onDelete,
}: SplitResultsTableProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 border-b border-border bg-muted">
            <tr>
              <th className="w-40 whitespace-nowrap px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">유형</th>
              <th className="w-64 whitespace-nowrap px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">미리보기</th>
              <th className="w-24 whitespace-nowrap px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Chunks</th>
              <th className="w-24 whitespace-nowrap px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">크기</th>
              <th className="w-28 whitespace-nowrap px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Overlap</th>
              <th className="w-28 whitespace-nowrap px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">시간</th>
              <th className="w-48 whitespace-nowrap px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">생성일</th>
              <th className="w-28 whitespace-nowrap px-4 py-3 text-center text-2xs font-semibold uppercase tracking-wide text-muted-foreground">동작</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && results.length === 0 ? (
              <TableLoadingRow colSpan={8} />
            ) : results.length === 0 ? (
              <TableEmptyRow
                colSpan={8}
                message="저장된 청킹 결과가 없습니다"
                description="청킹 화면에서 Save를 누르면 여기에 쌓이고, 벡터 인덱스로 올릴 수 있습니다."
              />
            ) : (
              results.map((result) => (
                <tr key={result.id} className="transition-smooth hover:bg-muted">
                  <td className="w-40 whitespace-nowrap px-4 py-3">
                    <span className="inline-block whitespace-nowrap rounded-sm bg-upload-zone px-2 py-1 text-2xs font-medium text-card-foreground">
                      {result.splitter_type}
                    </span>
                  </td>
                  <td className="w-64 truncate whitespace-nowrap px-4 py-3 text-xs text-card-foreground">{result.original_text_preview}</td>
                  <td className="w-24 whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{result.chunk_count}</td>
                  <td className="w-24 whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{result.chunk_size || "-"}</td>
                  <td className="w-28 whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{result.chunk_overlap || "-"}</td>
                  <td className="w-28 whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {result.processing_time ? `${result.processing_time}ms` : "-"}
                  </td>
                  <td className="w-48 whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDate(result.created_at)}</td>
                  <td className="w-28 whitespace-nowrap px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onView(result.id)} aria-label={`View split result ${result.id}`} title="View">
                        <Eye className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onUpload(result.id)} aria-label={`Upload split result ${result.id} to Vector DB`} title="Upload to Vector DB">
                        <Upload className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                      </Button>
                      <Button variant="dangerGhost" size="icon" onClick={() => onDelete(result.id)} aria-label={`Delete split result ${result.id}`} title="삭제">
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={total} rowsPerPage={rowsPerPage} onPageChange={onPageChange} />
    </div>
  );
}
