import JsonView from "@uiw/react-json-view";
import { LoaderCircle } from "lucide-react";
import type { CSSProperties } from "react";

import ModalDialog from "@/components/shared/ModalDialog";
import type {
  FullSplitResult,
  VectorUploadMessage,
} from "@/components/storage/storage-types";
import { JSON_VIEW_THEME } from "@/lib/json-view-theme";

interface SplitResultDialogProps {
  result: FullSplitResult | null;
  onClose: () => void;
}

export function SplitResultDialog({ result, onClose }: SplitResultDialogProps) {
  if (!result) return null;

  return (
    <ModalDialog
      title="Split Result"
      description={`${result.chunk_count} chunks`}
      onClose={onClose}
      panelClassName="max-w-3xl h-[80vh]"
    >
      <div className="flex-1 overflow-auto bg-card p-6">
        <JsonView
          value={result}
          style={{
            ...JSON_VIEW_THEME,
            "--w-rjv-background-color": "transparent",
          } as CSSProperties}
          collapsed={false}
          displayDataTypes={false}
          enableClipboard
        />
      </div>
    </ModalDialog>
  );
}

interface VectorUploadDialogProps {
  open: boolean;
  tables: string[];
  tablesLoading: boolean;
  selectedTable: string;
  batchSize: number;
  uploading: boolean;
  message: VectorUploadMessage | null;
  onSelectedTableChange: (table: string) => void;
  onBatchSizeChange: (batchSize: number) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function VectorUploadDialog({
  open,
  tables,
  tablesLoading,
  selectedTable,
  batchSize,
  uploading,
  message,
  onSelectedTableChange,
  onBatchSizeChange,
  onSubmit,
  onClose,
}: VectorUploadDialogProps) {
  if (!open) return null;

  return (
    <ModalDialog
      title="Upload to Vector Database"
      onClose={onClose}
      panelClassName="max-w-lg rounded-lg"
      headerClassName="rounded-t-lg"
    >
      <div className="space-y-4 bg-card p-6">
        {message && (
          <div
            className={`rounded-lg border p-3 text-xs ${
              message.type === "success"
                ? "border-success-border bg-success-surface text-success"
                : "border-danger-border bg-danger-surface text-danger"
            }`}
            role="status"
          >
            {message.text}
          </div>
        )}

        <div>
          <label htmlFor="storage-vector-collection" className="mb-2 block text-2xs font-medium text-card-foreground">
            Vector Collection <span className="text-danger">*</span>
          </label>
          {tablesLoading ? (
            <div className="flex h-10 items-center justify-center rounded-lg border border-border bg-surface">
              <LoaderCircle className="h-5 w-5 animate-spin text-card-foreground" strokeWidth={1} aria-label="Loading vector collections" />
            </div>
          ) : tables.length === 0 ? (
            <div className="rounded-lg border border-warning-border bg-warning-surface p-3">
              <p className="text-2xs text-warning">
                No collections found. Create a collection in the VDB page first.
              </p>
            </div>
          ) : (
            <>
              <select
                id="storage-vector-collection"
                value={selectedTable}
                onChange={(event) => onSelectedTableChange(event.target.value)}
                disabled={uploading}
                className="focus-ring h-10 w-full rounded-lg border border-border bg-surface px-3 text-xs text-card-foreground disabled:opacity-disabled"
              >
                <option value="">Select a collection...</option>
                {tables.map((tableName) => (
                  <option key={tableName} value={tableName}>
                    {tableName}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-2xs text-muted-foreground">
                Select the owner-scoped collection where chunks will be uploaded
              </p>
            </>
          )}
        </div>

        <div>
          <label htmlFor="storage-vector-batch-size" className="mb-2 block text-2xs font-medium text-card-foreground">
            Batch Size
          </label>
          <input
            id="storage-vector-batch-size"
            type="number"
            value={batchSize}
            onChange={(event) => {
              onBatchSizeChange(Math.max(1, Math.min(100, Number.parseInt(event.target.value, 10) || 10)));
            }}
            min="1"
            max="100"
            disabled={uploading}
            className="focus-ring h-10 w-full rounded-lg border border-border bg-surface px-3 text-xs text-card-foreground disabled:opacity-disabled"
          />
          <p className="mt-1 text-2xs text-muted-foreground">
            Number of chunks to process at once (1-100). Lower values reduce rate limit errors.
          </p>
        </div>

        <div className="rounded-lg bg-upload-zone p-3">
          <p className="text-2xs text-muted-foreground">
            <strong className="text-card-foreground">Note:</strong> This generates OpenAI embeddings and stores them in the managed Supabase Vector Store. Make sure:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-2xs text-muted-foreground">
            <li>OpenAI API key is configured in Connect page</li>
            <li>The target collection has been created in the VDB page</li>
          </ul>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 rounded-b-lg border-t border-border bg-card px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          disabled={uploading}
          className="px-4 py-2 text-xs font-medium text-muted-foreground transition-smooth hover:text-card-foreground disabled:opacity-disabled"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={uploading || !selectedTable.trim()}
          className="px-4 py-2 text-xs font-medium text-card-foreground transition-smooth hover:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-disabled"
        >
          {uploading ? "Uploading..." : "Upload to VDB"}
        </button>
      </div>
    </ModalDialog>
  );
}
