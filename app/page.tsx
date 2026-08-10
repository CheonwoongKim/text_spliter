"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import ErrorBoundary from "@/components/layout/ErrorBoundary";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import MyPagePanel from "@/components/account/MyPagePanel";
import LeftPanel from "@/components/splitter/LeftPanel";
import RightPanel from "@/components/splitter/RightPanel";
import ParserLeftPanel from "@/components/parser/ParserLeftPanel";
import ParserRightPanel from "@/components/parser/ParserRightPanel";
import SettingsPanel, { type SettingsSection } from "@/components/settings/SettingsPanel";
import VectorStoreLeftPanel from "@/components/vectorstore/VectorStoreLeftPanel";
import VectorStoreRightPanel from "@/components/vectorstore/VectorStoreRightPanel";
import StoragePanel from "@/components/storage/StoragePanel";
import FilesPanel from "@/components/storage/FilesPanel";
import ParseResultDetailPanel from "@/components/parser/ParseResultDetailPanel";
import EvaluationPanel from "@/components/evaluation/EvaluationPanel";
import MemoryGuidePanel from "@/components/guides/MemoryGuidePanel";
import { getAuthToken } from "@/lib/auth";
import { useDocumentEngineSettings } from "@/lib/hooks/useDocumentEngineSettings";
import { useWorkbenchHandoff } from "@/lib/hooks/useWorkbenchHandoff";
import { isVisionEngine } from "@/lib/document-engines";
import { useSplitterExperiment } from "@/lib/hooks/useSplitterExperiment";
import {
  APP_MENU_STORAGE_KEY,
  DEFAULT_APP_MENU,
  getAppMenuBreadcrumbs,
  normalizeAppMenu,
  type AppMenu,
} from "@/lib/navigation";
import { MANAGED_VECTOR_SCHEMA } from "@/lib/vectorstore";
import type {
  DocumentEngineConfig,
  DocumentEngineType,
  ParserExperimentPlan,
  ParseResponse,
  VectorStoreConfig,
  DatabaseSchema,
  TableDataResponse,
} from "@/lib/types";

export default function Home() {
  // State
  const [activeMenu, setActiveMenu] = useState<AppMenu | "parse-detail">(DEFAULT_APP_MENU);
  const [selectedParseResultId, setSelectedParseResultId] = useState<number | null>(null);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("connections");
  const [settingsParserEngine, setSettingsParserEngine] = useState<DocumentEngineType>("Upstage");

  useEffect(() => {
    try {
      setActiveMenu(normalizeAppMenu(window.localStorage.getItem(APP_MENU_STORAGE_KEY)));
    } catch {
      setActiveMenu(DEFAULT_APP_MENU);
    }
  }, []);

  const handleMenuChange = useCallback((menu: AppMenu) => {
    setSelectedParseResultId(null);
    setActiveMenu(menu);
    try {
      window.localStorage.setItem(APP_MENU_STORAGE_KEY, menu);
    } catch {
      // Navigation still works when storage is unavailable.
    }
  }, []);

  const {
    splitterHandoff,
    vectorStoreHandoff,
    sendParseRunToSplitter,
    sendSplitResultToVectorStore,
    clearVectorStoreHandoff,
  } = useWorkbenchHandoff(handleMenuChange);

  const handleOpenParserSettings = useCallback((engineType: DocumentEngineType) => {
    setSettingsParserEngine(engineType);
    setSettingsSection("document-engines");
    handleMenuChange("settings");
  }, [handleMenuChange]);

  const splitter = useSplitterExperiment();
  const {
    replaceSource: replaceSplitterSource,
    setError: setSplitterError,
  } = splitter;

  // Parser state
  const [primaryParserEngine, setPrimaryParserEngine] = useState<DocumentEngineType>("Upstage");
  const parserSettings = useDocumentEngineSettings();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileStorageKey, setSelectedFileStorageKey] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null);
  const [parseRuns, setParseRuns] = useState<ParseResponse[]>([]);
  const [parserLoading, setParserLoading] = useState(false);
  const [parserError, setParserError] = useState<string | null>(null);

  // VectorStore state
  const [vectorStoreConfig, setVectorStoreConfig] = useState<VectorStoreConfig>({});
  const [schemas, setSchemas] = useState<DatabaseSchema[]>([]);
  const [tableData, setTableData] = useState<TableDataResponse | null>(null);
  const [vectorLoading, setVectorLoading] = useState(false);
  const [vectorError, setVectorError] = useState<string | null>(null);

  // Parser handlers
  const handleFileSelect = useCallback((file: File | null, storageKey?: string | null) => {
    setSelectedFile(file);
    setSelectedFileStorageKey(storageKey || null);
    setParseResult(null);
    setParseRuns([]);
  }, []);

  const handleParserReset = useCallback(() => {
    setSelectedFile(null);
    setSelectedFileStorageKey(null);
    setParseResult(null);
    setParseRuns([]);
    setParserError(null);
  }, []);

  const handleParse = useCallback(async (plan: ParserExperimentPlan) => {
    if (!selectedFile) {
      alert("Please select a file to parse.");
      return;
    }

    const seenEngines = new Set<DocumentEngineType>();
    const engines = plan.engines.filter(({ parserType }) => {
      if (seenEngines.has(parserType)) return false;
      seenEngines.add(parserType);
      return true;
    });
    if (engines.length === 0) {
      alert("Please select at least one parser.");
      return;
    }

    setParserLoading(true);
    setParserError(null);
    setParseResult(null);
    setParseRuns([]);

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Please login to use the parser");
      }

      const failures: string[] = [];
      const experimentId = crypto.randomUUID();
      let primaryResult: ParseResponse | null = null;
      let fallbackResult: ParseResponse | null = null;

      // Run sequentially to avoid provider rate spikes and retain successful
      // candidates even when one of the configured engines fails.
      for (const { parserType, config: engineConfig } of engines) {
        try {
          const formData = new FormData();
          formData.append("file", selectedFile);
          const visionEngine = isVisionEngine(parserType);
          if (visionEngine) {
            formData.append("engineType", parserType);
            formData.append("config", JSON.stringify(engineConfig));
          } else {
            formData.append("parserType", parserType);
          }
          formData.append("experimentId", experimentId);
          formData.append(
            "experimentRole",
            parserType === plan.primaryEngine ? "primary" : "additional"
          );

          if (engineConfig.language) formData.append("language", engineConfig.language);
          if (engineConfig.extractImages !== undefined) {
            formData.append("extractImages", String(engineConfig.extractImages));
          }
          if (engineConfig.extractTables !== undefined) {
            formData.append("extractTables", String(engineConfig.extractTables));
          }
          if (engineConfig.pageRange) formData.append("pageRange", engineConfig.pageRange);
          if (engineConfig.upstageOutputFormat) {
            formData.append("upstageOutputFormat", engineConfig.upstageOutputFormat);
          }
          if (engineConfig.azureModelId) formData.append("azureModelId", engineConfig.azureModelId);
          if (engineConfig.azureOutputFormat) {
            formData.append("azureOutputFormat", engineConfig.azureOutputFormat);
          }
          if (engineConfig.llamaTier) formData.append("llamaTier", engineConfig.llamaTier);
          if (engineConfig.llamaVersion) formData.append("llamaVersion", engineConfig.llamaVersion);
          if (engineConfig.doclingOutputFormat) {
            formData.append("doclingOutputFormat", engineConfig.doclingOutputFormat);
          }
          if (engineConfig.doclingOcrMode) {
            formData.append("doclingOcrMode", engineConfig.doclingOcrMode);
          }
          if (engineConfig.doclingPipeline) {
            formData.append("doclingPipeline", engineConfig.doclingPipeline);
          }
          if (engineConfig.doclingTableMode) {
            formData.append("doclingTableMode", engineConfig.doclingTableMode);
          }
          if (engineConfig.googleProcessorId) {
            formData.append("googleProcessorId", engineConfig.googleProcessorId);
          }
          if (engineConfig.googleLocation) {
            formData.append("googleLocation", engineConfig.googleLocation);
          }

          const response = await fetch(visionEngine ? "/api/vision" : "/api/parse", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to parse document");
          }

          const data: ParseResponse = await response.json();
          if (parserType === plan.primaryEngine) {
            primaryResult = data;
            setParseResult(data);
          } else if (!fallbackResult) {
            fallbackResult = data;
          }
          setParseRuns((previousRuns) => [...previousRuns, data]);
        } catch (engineError) {
          const message = engineError instanceof Error
            ? engineError.message
            : "Unknown parser error";
          failures.push(`${parserType}: ${message}`);
          console.warn(`[Parser experiment] ${parserType} failed:`, engineError);
        }
      }

      setParseResult(primaryResult || fallbackResult);

      if (failures.length > 0) {
        setParserError(
          `${engines.length - failures.length}/${engines.length} document engines completed. ${failures.join(" | ")}`
        );
      }
    } catch (err) {
      console.error("Error parsing document:", err);
      setParserError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setParserLoading(false);
    }
  }, [selectedFile]);

  // A parser run handed to the splitter replaces the source text and its
  // provenance, and invalidates any chunks produced from the previous source.
  useEffect(() => {
    if (!splitterHandoff) return;

    // Runs compare strategies over one source, so a new source starts over.
    replaceSplitterSource(splitterHandoff.text, splitterHandoff.sourceMetadata);
  }, [replaceSplitterSource, splitterHandoff]);

  const splitterSourceHandoff = useMemo(
    () => splitterHandoff
      ? { token: splitterHandoff.token, label: splitterHandoff.engineLabel }
      : null,
    [splitterHandoff],
  );

  const vectorUploadHandoff = useMemo(
    () => vectorStoreHandoff
      ? { token: vectorStoreHandoff.token, splitResultId: vectorStoreHandoff.splitResultId }
      : null,
    [vectorStoreHandoff],
  );

  const selectedCollection = useMemo(() => {
    const { selectedSchema, selectedTable } = vectorStoreConfig;
    if (!selectedTable) return undefined;

    return schemas
      .find((schema) => schema.name === (selectedSchema || MANAGED_VECTOR_SCHEMA))
      ?.tables.find((table) => table.name === selectedTable);
  }, [schemas, vectorStoreConfig]);

  const handleUseRunInSplitter = useCallback((runIndex: number) => {
    const run = parseRuns[runIndex];
    if (!run) return;

    if (!sendParseRunToSplitter(run, runIndex)) {
      setParserError("This engine returned no text that can be chunked.");
    }
  }, [parseRuns, sendParseRunToSplitter]);

  const handleSelectParseRun = useCallback((runId: string) => {
    const selectedRun = parseRuns.find((run, index) => (
      run.run?.id || `legacy-run-${index}`
    ) === runId);
    if (selectedRun) setParseResult(selectedRun);
  }, [parseRuns]);

  const handleClearParseRuns = useCallback(() => {
    setParseRuns([]);
    setParseResult(null);
  }, []);

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
      setVectorError(err instanceof Error ? err.message : 'Failed to fetch schemas');
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
        `/api/vectorstore/table-data?table=${vectorStoreConfig.selectedTable}&schema=${vectorStoreConfig.selectedSchema || MANAGED_VECTOR_SCHEMA}`,
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
      setVectorError(err instanceof Error ? err.message : 'Failed to load table data');
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

  // Handler to navigate to parse result detail page
  // Each workspace reports its own failures; a vector store error must not
  // surface on the splitter screen.
  const activeError = activeMenu === "parser"
    ? parserError
    : activeMenu === "vectorstore"
      ? vectorError
      : activeMenu === "splitter"
        ? splitter.error
        : null;

  const dismissActiveError = useCallback(() => {
    if (activeMenu === "parser") setParserError(null);
    else if (activeMenu === "vectorstore") setVectorError(null);
    else if (activeMenu === "splitter") setSplitterError(null);
  }, [activeMenu, setSplitterError]);

  const handleNavigateToParseDetail = useCallback((id: number) => {
    setSelectedParseResultId(id);
    setActiveMenu("parse-detail");
  }, []);

  // Handler to go back from detail page to storage
  const handleBackToStorage = useCallback(() => {
    setSelectedParseResultId(null);
    setActiveMenu("storage");
  }, []);

  return (
    <div className="workspace-app h-screen flex bg-card text-xs">
      {/* Sidebar */}
      <Sidebar
        activeMenu={activeMenu === "parse-detail" ? "storage" : activeMenu}
        onMenuChange={handleMenuChange}
      />

      {/* Main Content */}
      <div className="min-w-0 flex-1 flex flex-col">
        {/* Header */}
        <Header
          breadcrumbs={
            activeMenu === "parse-detail"
              ? ["Workflow", "Runs", "Parse Result Detail"]
              : getAppMenuBreadcrumbs(activeMenu)
          }
          activeMenu={activeMenu === "parse-detail" ? "storage" : activeMenu}
          onMenuChange={handleMenuChange}
        />

      {/* Error Banner */}
      {activeError && (
        <div className="bg-danger-surface border-b border-danger-border px-4 sm:px-6 lg:px-10 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg
                className="h-5 w-5 text-danger mr-2"
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
              <span className="text-xs text-danger">
                {activeError}
              </span>
            </div>
            <button
              onClick={dismissActiveError}
              className="text-danger hover:text-danger/80"
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
      <main className="flex-1 overflow-hidden">
        <ErrorBoundary>
          <div className="h-full">
            {activeMenu === "mypage" ? (
              <MyPagePanel />
            ) : activeMenu === "settings" ? (
              <SettingsPanel
                activeSection={settingsSection}
                onSectionChange={setSettingsSection}
                selectedParserEngine={settingsParserEngine}
                onSelectedParserEngineChange={setSettingsParserEngine}
                parserConfigs={parserSettings.configs}
                savedParserConfigs={parserSettings.savedConfigs}
                persistedParserEngines={parserSettings.persistedEngines}
                dirtyParserEngines={parserSettings.dirtyEngines}
                parserSettingsLoading={parserSettings.loading}
                parserSettingsSavingEngine={parserSettings.savingEngine}
                parserSettingsError={parserSettings.error}
                onParserConfigChange={parserSettings.updateConfig}
                onSaveParserConfig={parserSettings.saveConfig}
                onReloadParserSettings={parserSettings.reload}
              />
            ) : activeMenu === "storage" ? (
              <StoragePanel
                onNavigateToDetail={handleNavigateToParseDetail}
                vectorUploadHandoff={vectorUploadHandoff}
                onVectorUploadHandoffConsumed={clearVectorStoreHandoff}
              />
            ) : activeMenu === "files" ? (
              <FilesPanel />
            ) : activeMenu === "memory" ? (
              <MemoryGuidePanel />
            ) : activeMenu === "evaluation" ? (
              <EvaluationPanel />
            ) : activeMenu === "parse-detail" && selectedParseResultId ? (
              <div className="h-full px-4 py-6 sm:px-6 lg:px-10">
                <ParseResultDetailPanel
                  resultId={selectedParseResultId}
                  onBack={handleBackToStorage}
                />
              </div>
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
                  selectedTableEmbeddingModel={selectedCollection?.embeddingModel}
                  selectedTableVectorDimension={selectedCollection?.vectorDimension}
                  tableData={tableData}
                  loading={vectorLoading}
                  onRefresh={handleRefreshTableData}
                />
              </div>
            </div>
          ) : activeMenu === "parser" ? (
            <div className="h-full grid grid-cols-1 gap-6 pr-4 sm:pr-6 lg:grid-cols-10 lg:gap-0 lg:pr-10">
              {/* Parser Left Panel */}
              <div className="h-full overflow-hidden lg:col-span-3 lg:border-r lg:border-border-subtle">
                <ParserLeftPanel
                  primaryEngine={primaryParserEngine}
                  engineConfigs={parserSettings.savedConfigs}
                  persistedEngines={parserSettings.persistedEngines}
                  settingsLoading={parserSettings.loading}
                  settingsReady={parserSettings.ready}
                  settingsError={parserSettings.error}
                  loading={parserLoading}
                  selectedFile={selectedFile}
                  onPrimaryEngineChange={setPrimaryParserEngine}
                  onOpenSettings={handleOpenParserSettings}
                  onFileSelect={handleFileSelect}
                  onParse={handleParse}
                  onReset={handleParserReset}
                />
              </div>

              {/* Parser Right Panel */}
              <div className="h-full overflow-hidden pl-4 sm:pl-6 lg:col-span-7 lg:pl-10">
                <ParserRightPanel
                  result={parseResult}
                  runs={parseRuns}
                  loading={parserLoading}
                  selectedFile={selectedFile}
                  selectedFileStorageKey={selectedFileStorageKey}
                  config={{
                    parserType: primaryParserEngine,
                    ...parserSettings.savedConfigs[primaryParserEngine],
                  } satisfies DocumentEngineConfig & { parserType: DocumentEngineType }}
                  onSelectRun={handleSelectParseRun}
                  onClearRuns={handleClearParseRuns}
                  onUseInSplitter={handleUseRunInSplitter}
                />
              </div>
            </div>
          ) : (
            <div className="h-full grid grid-cols-1 gap-6 px-4 sm:px-6 lg:grid-cols-10 lg:gap-0 lg:px-10">
              {/* Left Panel */}
              <div className="h-full overflow-hidden lg:col-span-3 lg:border-r lg:border-border-subtle">
                <LeftPanel
                  text={splitter.text}
                  config={splitter.config}
                  loading={splitter.loading}
                  onTextChange={splitter.setText}
                  onSourceMetadataChange={splitter.setSourceMetadata}
                  onSplitterTypeChange={splitter.changeSplitterType}
                  onConfigChange={splitter.changeConfig}
                  onSplit={splitter.split}
                  onReset={splitter.reset}
                  handoff={splitterSourceHandoff}
                  structureSplitAvailable={splitter.structureSplitAvailable}
                />
              </div>

              {/* Right Panel */}
              <div className="h-full overflow-hidden lg:col-span-7 lg:pl-10">
                <RightPanel
                  result={splitter.result}
                  loading={splitter.loading}
                  viewMode={splitter.viewMode}
                  onViewModeChange={splitter.setViewMode}
                  text={splitter.text}
                  config={splitter.config}
                  onSendToVectorStore={sendSplitResultToVectorStore}
                  runs={splitter.runs}
                  selectedRunId={splitter.selectedRunId}
                  onSelectRun={splitter.selectRun}
                  onClearRuns={splitter.clearRuns}
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
