"use client";

import { useState, useCallback, useEffect } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import LeftPanel from "@/components/LeftPanel";
import RightPanel from "@/components/RightPanel";
import ParserLeftPanel from "@/components/ParserLeftPanel";
import ParserRightPanel from "@/components/ParserRightPanel";
import LicensesPanel from "@/components/LicensesPanel";
import VectorStoreLeftPanel from "@/components/VectorStoreLeftPanel";
import VectorStoreRightPanel from "@/components/VectorStoreRightPanel";
import StoragePanel from "@/components/StoragePanel";
import FilesPanel from "@/components/FilesPanel";
import { getAuthToken } from "@/lib/auth";
import type {
  SplitterConfig,
  SplitterType,
  ViewMode,
  SplitResponse,
  SplitRequest,
  ParserConfig,
  ParseResponse,
  VectorStoreConfig,
  DatabaseSchema,
  TableDataResponse,
} from "@/lib/types";

export default function Home() {
  // State
  const [activeMenu, setActiveMenu] = useState<"parser" | "splitter" | "licenses" | "vectorstore" | "storage" | "files">("splitter");

  // Splitter state
  const [text, setText] = useState("");
  const [config, setConfig] = useState<SplitterConfig>({
    splitterType: "RecursiveCharacterTextSplitter",
    chunkSize: 1000,
    chunkOverlap: 200,
    // separator: undefined by default, let LangChain use its default
    separators: ["\n\n", "\n", " ", ""],
    encodingName: "cl100k_base",
    language: "python",
    breakpointType: "percentile",
  });
  const [result, setResult] = useState<SplitResponse | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parser state
  const [parserConfig, setParserConfig] = useState<ParserConfig>({
    parserType: "Upstage",
    upstageOutputFormat: "markdown",
    extractImages: false,
    extractTables: false,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null);
  const [parserLoading, setParserLoading] = useState(false);
  const [parserError, setParserError] = useState<string | null>(null);

  // VectorStore state
  const [vectorStoreConfig, setVectorStoreConfig] = useState<VectorStoreConfig>({});
  const [schemas, setSchemas] = useState<DatabaseSchema[]>([]);
  const [tableData, setTableData] = useState<TableDataResponse | null>(null);
  const [vectorLoading, setVectorLoading] = useState(false);

  // Handlers
  const handleSplitterTypeChange = useCallback((type: SplitterType) => {
    setConfig((prev) => ({
      ...prev,
      splitterType: type,
    }));
  }, []);

  const handleConfigChange = useCallback(
    (updates: Partial<SplitterConfig>) => {
      setConfig((prev) => ({
        ...prev,
        ...updates,
      }));
    },
    []
  );

  const handleSplit = useCallback(async () => {
    if (!text.trim()) {
      alert("Please enter text to split.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const requestBody: SplitRequest = {
        text,
        config,
      };

      const response = await fetch("/api/split", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to split text");
      }

      const data: SplitResponse = await response.json();
      setResult(data);
    } catch (err) {
      console.error("Error splitting text:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  }, [text, config]);

  // Parser handlers
  const handleParserConfigChange = useCallback(
    (updates: Partial<ParserConfig>) => {
      setParserConfig((prev) => ({
        ...prev,
        ...updates,
      }));
    },
    []
  );

  const handleFileSelect = useCallback((file: File | null) => {
    setSelectedFile(file);
    setParseResult(null);
  }, []);

  const handleParserReset = useCallback(() => {
    setSelectedFile(null);
    setParseResult(null);
    setParserError(null);
  }, []);

  const handleSplitterReset = useCallback(() => {
    setText("");
    setResult(null);
    setError(null);
  }, []);

  const handleParse = useCallback(async () => {
    if (!selectedFile) {
      alert("Please select a file to parse.");
      return;
    }

    setParserLoading(true);
    setParserError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("parserType", parserConfig.parserType);

      // Common settings
      if (parserConfig.language) {
        formData.append("language", parserConfig.language);
      }
      if (parserConfig.extractImages !== undefined) {
        formData.append("extractImages", String(parserConfig.extractImages));
      }
      if (parserConfig.extractTables !== undefined) {
        formData.append("extractTables", String(parserConfig.extractTables));
      }
      if (parserConfig.pageRange) {
        formData.append("pageRange", parserConfig.pageRange);
      }

      // Upstage specific
      if (parserConfig.upstageOutputFormat) {
        formData.append("upstageOutputFormat", parserConfig.upstageOutputFormat);
      }

      // Azure specific
      if (parserConfig.azureModelId) {
        formData.append("azureModelId", parserConfig.azureModelId);
      }
      if (parserConfig.azureOutputFormat) {
        formData.append("azureOutputFormat", parserConfig.azureOutputFormat);
      }

      // LlamaIndex specific
      if (parserConfig.llamaResultType) {
        formData.append("llamaResultType", parserConfig.llamaResultType);
      }
      if (parserConfig.llamaGpt4oMode !== undefined) {
        formData.append("llamaGpt4oMode", String(parserConfig.llamaGpt4oMode));
      }

      // Google specific
      if (parserConfig.googleProcessorId) {
        formData.append("googleProcessorId", parserConfig.googleProcessorId);
      }
      if (parserConfig.googleLocation) {
        formData.append("googleLocation", parserConfig.googleLocation);
      }

      const token = getAuthToken();
      if (!token) {
        throw new Error("Please login to use the parser");
      }

      const response = await fetch("/api/parse", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to parse document");
      }

      const data: ParseResponse = await response.json();
      setParseResult(data);
    } catch (err) {
      console.error("Error parsing document:", err);
      setParserError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setParserLoading(false);
    }
  }, [selectedFile, parserConfig]);

  // VectorStore handlers
  const handleVectorStoreConfigChange = useCallback(
    (updates: Partial<VectorStoreConfig>) => {
      setVectorStoreConfig((prev) => ({
        ...prev,
        ...updates,
      }));
    },
    []
  );

  const handleRefreshSchemas = useCallback(async () => {
    setVectorLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        console.log('No auth token found');
        setVectorLoading(false);
        return;
      }

      const response = await fetch('/api/vectorstore/schemas', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch schemas');
      }

      const data = await response.json();
      setSchemas(data);
      setVectorLoading(false);
    } catch (err) {
      console.error("Error fetching schemas:", err);
      setError(err instanceof Error ? err.message : 'Failed to fetch schemas');
      setVectorLoading(false);
    }
  }, []);

  const handleLoadTableData = useCallback(async () => {
    if (!vectorStoreConfig.selectedTable) return;

    setVectorLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        console.log('No auth token found');
        setVectorLoading(false);
        return;
      }

      const response = await fetch(
        `/api/vectorstore/table-data?table=${vectorStoreConfig.selectedTable}&schema=${vectorStoreConfig.selectedSchema || 'public'}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch table data');
      }

      const data = await response.json();
      setTableData(data);
      setVectorLoading(false);
    } catch (err) {
      console.error("Error loading table data:", err);
      setError(err instanceof Error ? err.message : 'Failed to load table data');
      setVectorLoading(false);
    }
  }, [vectorStoreConfig.selectedTable, vectorStoreConfig.selectedSchema]);

  const handleRefreshTableData = useCallback(() => {
    handleLoadTableData();
  }, [handleLoadTableData]);

  // Auto-load table data when table is selected
  useEffect(() => {
    if (vectorStoreConfig.selectedTable) {
      handleLoadTableData();
    } else {
      setTableData(null);
    }
  }, [vectorStoreConfig.selectedTable, handleLoadTableData]);

  // Load schemas when VDB page is opened
  useEffect(() => {
    if (activeMenu === "vectorstore" && schemas.length === 0) {
      handleRefreshSchemas();
    }
  }, [activeMenu, schemas.length, handleRefreshSchemas]);

  return (
    <div className="h-screen flex bg-surface">
      {/* Sidebar */}
      <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header
          title={
            activeMenu === "parser"
              ? "Parser"
              : activeMenu === "licenses"
              ? "Connect"
              : activeMenu === "vectorstore"
              ? "Vector Database"
              : activeMenu === "storage"
              ? "Storage"
              : activeMenu === "files"
              ? "Files"
              : "Text Splitter"
          }
        />

      {/* Error Banner */}
      {(activeMenu === "parser" ? parserError : error) && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-10 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg
                className="h-5 w-5 text-red-400 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm text-red-800 dark:text-red-200">
                {activeMenu === "parser" ? parserError : error}
              </span>
            </div>
            <button
              onClick={() => activeMenu === "parser" ? setParserError(null) : setError(null)}
              className="text-red-800 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100"
              aria-label="Close error message"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden bg-surface">
        <ErrorBoundary>
          <div className="h-full">
            {activeMenu === "licenses" ? (
              <LicensesPanel />
            ) : activeMenu === "storage" ? (
              <StoragePanel />
            ) : activeMenu === "files" ? (
              <FilesPanel />
            ) : activeMenu === "vectorstore" ? (
            <div className="h-full grid grid-cols-1 lg:grid-cols-10">
              {/* VectorStore Left Panel */}
              <div className="h-full overflow-hidden lg:col-span-2">
                <VectorStoreLeftPanel
                  config={vectorStoreConfig}
                  schemas={schemas}
                  loading={vectorLoading}
                  onConfigChange={handleVectorStoreConfigChange}
                  onRefresh={handleRefreshSchemas}
                />
              </div>

              {/* VectorStore Right Panel */}
              <div className="h-full overflow-hidden lg:col-span-8">
                <VectorStoreRightPanel
                  selectedSchema={vectorStoreConfig.selectedSchema}
                  selectedTable={vectorStoreConfig.selectedTable}
                  tableData={tableData}
                  loading={vectorLoading}
                  onLoadTable={handleLoadTableData}
                  onRefresh={handleRefreshTableData}
                />
              </div>
            </div>
          ) : activeMenu === "parser" ? (
            <div className="h-full grid grid-cols-1 lg:grid-cols-10 gap-10 px-10">
              {/* Parser Left Panel */}
              <div className="h-full overflow-hidden lg:col-span-3">
                <ParserLeftPanel
                  config={parserConfig}
                  loading={parserLoading}
                  selectedFile={selectedFile}
                  onConfigChange={handleParserConfigChange}
                  onFileSelect={handleFileSelect}
                  onParse={handleParse}
                  onReset={handleParserReset}
                />
              </div>

              {/* Parser Right Panel */}
              <div className="h-full overflow-hidden lg:col-span-7">
                <ParserRightPanel
                  result={parseResult}
                  selectedFile={selectedFile}
                  config={parserConfig}
                />
              </div>
            </div>
          ) : (
            <div className="h-full grid grid-cols-1 lg:grid-cols-10 gap-10 px-10">
              {/* Left Panel */}
              <div className="h-full overflow-hidden lg:col-span-3">
                <LeftPanel
                  text={text}
                  config={config}
                  loading={loading}
                  onTextChange={setText}
                  onSplitterTypeChange={handleSplitterTypeChange}
                  onConfigChange={handleConfigChange}
                  onSplit={handleSplit}
                  onReset={handleSplitterReset}
                />
              </div>

              {/* Right Panel */}
              <div className="h-full overflow-hidden lg:col-span-7">
                <RightPanel
                  result={result}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  text={text}
                  config={config}
                />
              </div>
            </div>
          )}
          </div>
        </ErrorBoundary>
      </main>
      </div>
    </div>
  );
}
