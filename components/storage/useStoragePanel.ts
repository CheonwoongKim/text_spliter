"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  FullSplitResult,
  ParseResult,
  ParseResultsResponse,
  SplitResult,
  SplitResultsResponse,
  StorageTab,
  VectorUploadMessage,
} from "@/components/storage/storage-types";
import { getAuthToken, handleUnauthorized } from "@/lib/auth";
import { DEFAULT_ROWS_PER_PAGE } from "@/lib/constants";
import { formatStorageSyncMessage } from "@/lib/storage-sync";

interface ManagedSchema {
  tables?: Array<{ name?: unknown }>;
}

function managedCollectionNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((schema) => {
    if (!schema || typeof schema !== "object") return [];
    const tables = (schema as ManagedSchema).tables;
    if (!Array.isArray(tables)) return [];
    return tables.flatMap((table) => typeof table.name === "string" ? [table.name] : []);
  });
}

export function useStoragePanel(onNavigateToDetail?: (id: number) => void) {
  const [activeTab, setActiveTab] = useState<StorageTab>("parse");
  const [results, setResults] = useState<ParseResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const [splitResults, setSplitResults] = useState<SplitResult[]>([]);
  const [splitTotal, setSplitTotal] = useState(0);
  const [splitLoading, setSplitLoading] = useState(true);
  const [splitError, setSplitError] = useState<string | null>(null);
  const [splitPage, setSplitPage] = useState(0);
  const [splitViewModalData, setSplitViewModalData] = useState<FullSplitResult | null>(null);

  const [syncing, setSyncing] = useState(false);
  const [showVdbModal, setShowVdbModal] = useState(false);
  const [vdbTableName, setVdbTableName] = useState("");
  const [vdbBatchSize, setVdbBatchSize] = useState(10);
  const [selectedSplitId, setSelectedSplitId] = useState<number | null>(null);
  const [vdbUploading, setVdbUploading] = useState(false);
  const [vdbMessage, setVdbMessage] = useState<VectorUploadMessage | null>(null);
  const [vdbTables, setVdbTables] = useState<string[]>([]);
  const [vdbTablesLoading, setVdbTablesLoading] = useState(false);
  const rowsPerPage = DEFAULT_ROWS_PER_PAGE;

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      if (!token) {
        setError("Please login first");
        return;
      }
      const response = await fetch(
        `/api/parse-results?limit=${rowsPerPage}&offset=${page * rowsPerPage}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || "Failed to fetch results");
      }
      const data = await response.json() as ParseResultsResponse;
      setResults(data.results);
      setTotal(data.total);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to fetch results");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  const fetchSplitResults = useCallback(async () => {
    setSplitLoading(true);
    setSplitError(null);
    try {
      const token = getAuthToken();
      if (!token) {
        setSplitError("Please login first");
        return;
      }
      const response = await fetch(
        `/api/split-results?limit=${rowsPerPage}&offset=${splitPage * rowsPerPage}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || "Failed to fetch split results");
      }
      const data = await response.json() as SplitResultsResponse;
      setSplitResults(data.results);
      setSplitTotal(data.total);
    } catch (caught) {
      setSplitError(caught instanceof Error ? caught.message : "Failed to fetch split results");
    } finally {
      setSplitLoading(false);
    }
  }, [rowsPerPage, splitPage]);

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm("Are you sure you want to delete this result?")) return;
    try {
      const token = getAuthToken();
      if (!token) {
        alert("Please login first");
        return;
      }
      const response = await fetch(`/api/parse-results?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete result");
      }
      await fetchResults();
    } catch (caught) {
      console.error("Error deleting result:", caught);
      alert(caught instanceof Error ? caught.message : "Failed to delete result");
    }
  }, [fetchResults]);

  const handleDeleteSplit = useCallback(async (id: number) => {
    if (!confirm("Are you sure you want to delete this result?")) return;
    try {
      const token = getAuthToken();
      if (!token) {
        alert("Please login first");
        return;
      }
      const response = await fetch(`/api/split-results?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete result");
      }
      await fetchSplitResults();
    } catch (caught) {
      console.error("Error deleting split result:", caught);
      alert(caught instanceof Error ? caught.message : "Failed to delete result");
    }
  }, [fetchSplitResults]);

  const handleUploadToVdb = useCallback(async (id: number) => {
    setSelectedSplitId(id);
    setVdbTableName("");
    setVdbBatchSize(10);
    setVdbMessage(null);
    setShowVdbModal(true);
    setVdbTablesLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        setVdbMessage({ type: "error", text: "Please login first" });
        return;
      }
      const response = await fetch("/api/vectorstore/schemas", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch vector collections");
      setVdbTables(managedCollectionNames(await response.json()));
    } catch (caught) {
      console.error("Error fetching vector collections:", caught);
      setVdbMessage({ type: "error", text: "Failed to load managed vector collections." });
    } finally {
      setVdbTablesLoading(false);
    }
  }, []);

  const handleVdbUploadSubmit = useCallback(async () => {
    if (!vdbTableName.trim()) {
      setVdbMessage({ type: "error", text: "Please select a vector collection" });
      return;
    }
    if (!selectedSplitId) {
      setVdbMessage({ type: "error", text: "No split result selected" });
      return;
    }

    setVdbUploading(true);
    setVdbMessage(null);
    try {
      const token = getAuthToken();
      if (!token) {
        handleUnauthorized();
        return;
      }
      const response = await fetch("/api/vectorstore/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          splitResultId: selectedSplitId,
          tableName: vdbTableName.trim(),
          batchSize: vdbBatchSize,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to upload to vector database");
      }
      setVdbMessage({
        type: "success",
        text: data.message || `Successfully uploaded ${data.chunksUploaded} chunks`,
      });
      setTimeout(() => {
        setShowVdbModal(false);
        setVdbMessage(null);
      }, 3000);
    } catch (caught) {
      console.error("Error uploading to VDB:", caught);
      setVdbMessage({
        type: "error",
        text: caught instanceof Error ? caught.message : "Failed to upload to vector database",
      });
    } finally {
      setVdbUploading(false);
    }
  }, [selectedSplitId, vdbBatchSize, vdbTableName]);

  const handleView = useCallback((id: number) => {
    onNavigateToDetail?.(id);
  }, [onNavigateToDetail]);

  const handleViewSplit = useCallback(async (id: number) => {
    try {
      const token = getAuthToken();
      if (!token) {
        alert("Please login first");
        return;
      }
      const response = await fetch(`/api/split-results?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch result");
      }
      setSplitViewModalData(await response.json() as FullSplitResult);
    } catch (caught) {
      console.error("Error fetching split result:", caught);
      alert(caught instanceof Error ? caught.message : "Failed to fetch result");
    }
  }, []);

  const handleCheckMigration = useCallback(async () => {
    setSyncing(true);
    try {
      const token = getAuthToken();
      if (!token) {
        alert("Please login first");
        return;
      }
      const response = await fetch("/api/parse-results/migrate", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to check migration");
      }
      const data = await response.json();
      alert(data.migrated
        ? "Migration executed successfully! You can now sync storage."
        : "Database is up to date. You can proceed to sync storage.");
    } catch (caught) {
      console.error("Error checking migration:", caught);
      alert(caught instanceof Error ? caught.message : "Failed to check migration");
    } finally {
      setSyncing(false);
    }
  }, []);

  const handleSyncStorage = useCallback(async () => {
    if (!confirm("Sync parse results with Files storage? This will match file names and add preview capability.")) return;
    setSyncing(true);
    try {
      const token = getAuthToken();
      if (!token) {
        alert("Please login first");
        return;
      }
      const response = await fetch("/api/parse-results/sync-storage", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to sync storage");
      }
      alert(formatStorageSyncMessage(await response.json()));
      await fetchResults();
    } catch (caught) {
      console.error("Error syncing storage:", caught);
      alert(caught instanceof Error ? caught.message : "Failed to sync storage");
    } finally {
      setSyncing(false);
    }
  }, [fetchResults]);

  useEffect(() => {
    if (activeTab === "parse") void fetchResults();
    else void fetchSplitResults();
  }, [activeTab, fetchResults, fetchSplitResults]);

  const dismissError = useCallback(() => {
    if (activeTab === "parse") setError(null);
    else setSplitError(null);
  }, [activeTab]);

  const closeVectorDialog = useCallback(() => setShowVdbModal(false), []);
  const closeSplitDialog = useCallback(() => setSplitViewModalData(null), []);

  return {
    activeTab,
    setActiveTab,
    results,
    total,
    loading,
    error,
    page,
    setPage,
    splitResults,
    splitTotal,
    splitLoading,
    splitError,
    splitPage,
    setSplitPage,
    splitViewModalData,
    syncing,
    showVdbModal,
    vdbTableName,
    setVdbTableName,
    vdbBatchSize,
    setVdbBatchSize,
    vdbUploading,
    vdbMessage,
    vdbTables,
    vdbTablesLoading,
    rowsPerPage,
    fetchResults,
    fetchSplitResults,
    handleDelete,
    handleDeleteSplit,
    handleUploadToVdb,
    handleVdbUploadSubmit,
    handleView,
    handleViewSplit,
    handleCheckMigration,
    handleSyncStorage,
    dismissError,
    closeVectorDialog,
    closeSplitDialog,
  };
}
