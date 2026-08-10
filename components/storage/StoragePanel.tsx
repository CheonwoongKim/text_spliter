"use client";

import { memo, useEffect } from "react";

import {
  SplitResultDialog,
  VectorUploadDialog,
} from "@/components/storage/StorageDialogs";
import StoragePanelHeader from "@/components/storage/StoragePanelHeader";
import {
  ParseResultsTable,
  SplitResultsTable,
} from "@/components/storage/StorageResultsTables";
import { useStoragePanel } from "@/components/storage/useStoragePanel";

interface StoragePanelProps {
  onNavigateToDetail?: (id: number) => void;
  /** Split result sent straight from the splitter, ready to embed. */
  vectorUploadHandoff?: { token: number; splitResultId: number } | null;
  onVectorUploadHandoffConsumed?: () => void;
}

const StoragePanel = memo(function StoragePanel({
  onNavigateToDetail,
  vectorUploadHandoff,
  onVectorUploadHandoffConsumed,
}: StoragePanelProps) {
  const storage = useStoragePanel(onNavigateToDetail);

  const handoffToken = vectorUploadHandoff?.token;
  const handoffSplitResultId = vectorUploadHandoff?.splitResultId;
  const { setActiveTab, handleUploadToVdb } = storage;

  // Chunks arriving from the splitter open the upload dialog directly, so the
  // user never has to find the row they just created.
  useEffect(() => {
    if (handoffToken === undefined || handoffSplitResultId === undefined) return;

    setActiveTab("split");
    void handleUploadToVdb(handoffSplitResultId);
    onVectorUploadHandoffConsumed?.();
  }, [
    handoffToken,
    handoffSplitResultId,
    setActiveTab,
    handleUploadToVdb,
    onVectorUploadHandoffConsumed,
  ]);

  return (
    <div className="flex h-full flex-col bg-surface">
      <StoragePanelHeader
        activeTab={storage.activeTab}
        parseTotal={storage.total}
        splitTotal={storage.splitTotal}
        loading={storage.loading}
        splitLoading={storage.splitLoading}
        syncing={storage.syncing}
        error={storage.error}
        splitError={storage.splitError}
        onTabChange={storage.setActiveTab}
        onCheckMigration={storage.handleCheckMigration}
        onSyncStorage={storage.handleSyncStorage}
        onRefreshParse={storage.fetchResults}
        onRefreshSplit={storage.fetchSplitResults}
        onDismissError={storage.dismissError}
      />

      <div className="flex flex-1 flex-col overflow-hidden px-4 py-6 sm:px-6 lg:px-10">
        {storage.activeTab === "parse" ? (
          <ParseResultsTable
            results={storage.results}
            loading={storage.loading}
            page={storage.page}
            total={storage.total}
            rowsPerPage={storage.rowsPerPage}
            onPageChange={storage.setPage}
            onView={storage.handleView}
            onDelete={storage.handleDelete}
          />
        ) : (
          <SplitResultsTable
            results={storage.splitResults}
            loading={storage.splitLoading}
            page={storage.splitPage}
            total={storage.splitTotal}
            rowsPerPage={storage.rowsPerPage}
            onPageChange={storage.setSplitPage}
            onView={storage.handleViewSplit}
            onUpload={storage.handleUploadToVdb}
            onDelete={storage.handleDeleteSplit}
          />
        )}
      </div>

      <SplitResultDialog result={storage.splitViewModalData} onClose={storage.closeSplitDialog} />
      <VectorUploadDialog
        open={storage.showVdbModal}
        tables={storage.vdbTables}
        tablesLoading={storage.vdbTablesLoading}
        selectedTable={storage.vdbTableName}
        batchSize={storage.vdbBatchSize}
        uploading={storage.vdbUploading}
        message={storage.vdbMessage}
        onSelectedTableChange={storage.setVdbTableName}
        onBatchSizeChange={storage.setVdbBatchSize}
        onSubmit={storage.handleVdbUploadSubmit}
        onClose={storage.closeVectorDialog}
      />
    </div>
  );
});

StoragePanel.displayName = "StoragePanel";

export default StoragePanel;
