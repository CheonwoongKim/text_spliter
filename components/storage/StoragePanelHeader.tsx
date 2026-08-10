import { Database, LoaderCircle, RefreshCw, RotateCw, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/shared/Button";

import type { StorageTab } from "@/components/storage/storage-types";

interface StoragePanelHeaderProps {
  activeTab: StorageTab;
  parseTotal: number;
  splitTotal: number;
  loading: boolean;
  splitLoading: boolean;
  syncing: boolean;
  error: string | null;
  splitError: string | null;
  onTabChange: (tab: StorageTab) => void;
  onCheckMigration: () => void;
  onSyncStorage: () => void;
  onRefreshParse: () => void;
  onRefreshSplit: () => void;
  onDismissError: () => void;
}

export default function StoragePanelHeader({
  activeTab,
  parseTotal,
  splitTotal,
  loading,
  splitLoading,
  syncing,
  error,
  splitError,
  onTabChange,
  onCheckMigration,
  onSyncStorage,
  onRefreshParse,
  onRefreshSplit,
  onDismissError,
}: StoragePanelHeaderProps) {
  const activeLoading = activeTab === "parse" ? loading : splitLoading;
  const activeError = activeTab === "parse" ? error : splitError;

  return (
    <>
      <div className="border-b border-border-subtle bg-card px-4 py-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between">
          <p className="text-2xs text-muted-foreground">
            {activeTab === "parse"
              ? `${parseTotal} saved parse results`
              : `${splitTotal} saved split results`}
          </p>

          <div className="flex items-center gap-3">
            <div className="flex gap-1 rounded-lg bg-muted p-1" role="tablist" aria-label="Stored result type">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "parse"}
                onClick={() => onTabChange("parse")}
                className={`rounded-sm px-3 py-1 text-2xs font-medium transition-smooth ${
                  activeTab === "parse"
                    ? "bg-card text-card-foreground shadow-sm"
                    : "text-muted-foreground hover:text-card-foreground"
                }`}
              >
                Parse Results
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "split"}
                onClick={() => onTabChange("split")}
                className={`rounded-sm px-3 py-1 text-2xs font-medium transition-smooth ${
                  activeTab === "split"
                    ? "bg-card text-card-foreground shadow-sm"
                    : "text-muted-foreground hover:text-card-foreground"
                }`}
              >
                Split Results
              </button>
            </div>

            {activeTab === "parse" && (
              <>
                <button
                  type="button"
                  onClick={onCheckMigration}
                  disabled={syncing || loading}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-2xs font-medium text-muted-foreground transition-smooth hover:text-card-foreground disabled:cursor-not-allowed disabled:opacity-disabled"
                  title="Check and run database migration"
                >
                  {syncing ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.5} aria-hidden="true" />
                  ) : (
                    <Database className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  )}
                  {syncing ? "Checking..." : "Check DB"}
                </button>
                <button
                  type="button"
                  onClick={onSyncStorage}
                  disabled={syncing || loading}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-2xs font-medium text-muted-foreground transition-smooth hover:text-card-foreground disabled:cursor-not-allowed disabled:opacity-disabled"
                  title="Sync with Files storage"
                >
                  {syncing ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.5} aria-hidden="true" />
                  ) : (
                    <RotateCw className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  )}
                  {syncing ? "Syncing..." : "Sync Storage"}
                </button>
              </>
            )}

            <Button variant="ghost" size="icon" onClick={activeTab === "parse" ? onRefreshParse : onRefreshSplit} disabled={activeLoading} title="Refresh" aria-label="Refresh stored results">
              {activeLoading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <RefreshCw className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {activeError && (
        <div className="border-b border-danger-border bg-danger-surface px-4 py-3 sm:px-6 lg:px-10" role="alert">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <TriangleAlert className="mr-2 h-5 w-5 text-danger" strokeWidth={1.5} aria-hidden="true" />
              <span className="text-xs text-danger">{activeError}</span>
            </div>
            <button
              type="button"
              onClick={onDismissError}
              className="text-danger transition-smooth hover:opacity-hover"
              aria-label="Dismiss storage error"
            >
              <X className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
