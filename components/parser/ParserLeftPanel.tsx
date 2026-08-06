"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { getAuthToken } from "@/lib/auth";
import { getDocumentEngine, listDocumentEngines } from "@/lib/document-engines";
import { summarizeDocumentEngineConfig } from "@/lib/document-engine-settings";
import { buildParserExperimentEngines } from "@/lib/parser-experiment";
import {
  getParserFileTypeProfile,
  isParserFileSupported,
} from "@/lib/parser-file-types";
import type {
  DocumentEngineConfigMap,
  DocumentEngineType,
  ParserExperimentPlan,
} from "@/lib/types";

const documentEngines = listDocumentEngines();

interface StorageFile {
  id: string;
  filename: string;
  storage_key: string;
  file_size: number;
  uploaded_at: string;
}

interface ParserLeftPanelProps {
  primaryEngine: DocumentEngineType;
  engineConfigs: DocumentEngineConfigMap;
  persistedEngines: ReadonlySet<DocumentEngineType>;
  settingsLoading: boolean;
  settingsReady: boolean;
  settingsError: string | null;
  loading: boolean;
  selectedFile: File | null;
  onPrimaryEngineChange: (engineType: DocumentEngineType) => void;
  onOpenSettings: (engineType: DocumentEngineType) => void;
  onFileSelect: (file: File | null, storageKey?: string | null) => void;
  onParse: (plan: ParserExperimentPlan) => void;
  onReset: () => void;
}

function ParserLeftPanel({
  primaryEngine,
  engineConfigs,
  persistedEngines,
  settingsLoading,
  settingsReady,
  settingsError,
  loading,
  selectedFile,
  onPrimaryEngineChange,
  onOpenSettings,
  onFileSelect,
  onParse,
  onReset,
}: ParserLeftPanelProps) {
  const selectedEngine = getDocumentEngine(primaryEngine);
  const [uploadMode, setUploadMode] = useState<"upload" | "select">("upload");
  const [storageFiles, setStorageFiles] = useState<StorageFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFileKey, setSelectedFileKey] = useState<string | null>(null);
  const [additionalExperimentEngines, setAdditionalExperimentEngines] = useState<DocumentEngineType[]>([]);
  const experimentEngines = buildParserExperimentEngines(
    primaryEngine,
    additionalExperimentEngines
  );
  const acceptedFileProfile = getParserFileTypeProfile(experimentEngines);
  const selectedFileSupported = selectedFile
    ? isParserFileSupported(selectedFile.name, experimentEngines)
    : true;

  useEffect(() => {
    setAdditionalExperimentEngines((current) =>
      current.includes(primaryEngine)
        ? current.filter((candidate) => candidate !== primaryEngine)
        : current
    );
  }, [primaryEngine]);

  const toggleExperimentEngine = useCallback((engineType: DocumentEngineType) => {
    if (engineType === primaryEngine) return;

    setAdditionalExperimentEngines((current) =>
      current.includes(engineType)
        ? current.filter((candidate) => candidate !== engineType)
        : [...current, engineType]
    );
  }, [primaryEngine]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isParserFileSupported(file.name, experimentEngines)) {
      event.target.value = "";
      alert(`Choose a supported file type: ${acceptedFileProfile.label}`);
      return;
    }

    onFileSelect(file, null);
    setSelectedFileKey(null);
  }, [acceptedFileProfile.label, experimentEngines, onFileSelect]);

  const fetchStorageFiles = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setLoadingFiles(false);
      return;
    }

    setLoadingFiles(true);
    try {
      const response = await fetch("/api/storage/files", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;

      const data = await response.json();
      setStorageFiles(data.files || []);
    } catch (storageError) {
      console.error("Error fetching storage files:", storageError);
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  const handleSelectFile = useCallback(async (fileKey: string, displayName: string) => {
    try {
      const token = getAuthToken();
      if (!token) {
        alert("Please login to Storage first");
        return;
      }

      const response = await fetch(
        `/api/storage/preview?key=${encodeURIComponent(fileKey)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("Failed to load file");

      const blob = await response.blob();
      onFileSelect(new File([blob], displayName, { type: blob.type }), fileKey);
      setSelectedFileKey(fileKey);
    } catch (storageError) {
      alert(
        `Failed to load file: ${
          storageError instanceof Error ? storageError.message : "Unknown error"
        }`
      );
    }
  }, [onFileSelect]);

  useEffect(() => {
    if (uploadMode === "select") fetchStorageFiles();
  }, [fetchStorageFiles, uploadMode]);

  const clearSelectedFile = () => {
    onFileSelect(null, null);
    setSelectedFileKey(null);
  };

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex-1 overflow-y-auto py-6 pb-16">
        <section className="mb-10">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setUploadMode("upload")}
                className={`whitespace-nowrap rounded-sm px-3 py-1 text-xs font-medium transition-smooth ${
                  uploadMode === "upload"
                    ? "bg-card text-card-foreground shadow-sm"
                    : "text-muted-foreground hover:text-card-foreground"
                }`}
              >
                Upload
              </button>
              <button
                type="button"
                onClick={() => setUploadMode("select")}
                className={`whitespace-nowrap rounded-sm px-3 py-1 text-xs font-medium transition-smooth ${
                  uploadMode === "select"
                    ? "bg-card text-card-foreground shadow-sm"
                    : "text-muted-foreground hover:text-card-foreground"
                }`}
              >
                Select from Storage
              </button>
            </div>
            {selectedFile && (
              <span className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(2)} KB
              </span>
            )}
          </div>

          {selectedFile && !selectedFileSupported && (
            <p role="alert" className="mb-2 text-xs text-danger">
              This file is not supported by every selected engine. Choose: {acceptedFileProfile.label}.
            </p>
          )}

          <div className="h-[300px]">
            {uploadMode === "upload" ? (
              selectedFile ? (
                <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border">
                  <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted px-3 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <svg className="h-4 w-4 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="truncate text-xs font-medium text-card-foreground">
                        {selectedFile.name}
                      </span>
                    </div>
                    <button type="button" onClick={clearSelectedFile} className="text-xs text-muted-foreground transition-smooth hover:text-card-foreground">
                      Clear
                    </button>
                  </div>
                  <div className="flex min-h-0 flex-1 items-center gap-3 overflow-auto p-4">
                    <svg className="h-8 w-8 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="min-w-0">
                      <p className="truncate text-base font-medium text-card-foreground">
                        {selectedFile.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selectedFile.type || "Unknown type"} · {(selectedFile.size / 1024).toFixed(2)} KB
                        {selectedFileKey ? " · from storage" : ""}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="file-upload"
                  className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border transition-smooth hover:border-accent hover:bg-accent/5"
                >
                  <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <div className="text-center">
                    <p className="text-base font-medium text-card-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {acceptedFileProfile.label} (max 50MB)
                    </p>
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    accept={acceptedFileProfile.accept}
                    onChange={handleFileChange}
                    disabled={loading}
                    className="hidden"
                  />
                </label>
              )
            ) : (
              <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border">
                {selectedFile && (
                  <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted px-3 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-xs font-medium text-card-foreground">
                        {selectedFile.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">from storage</span>
                    </div>
                    <button type="button" onClick={clearSelectedFile} className="text-xs text-muted-foreground transition-smooth hover:text-card-foreground">
                      Clear
                    </button>
                  </div>
                )}

                {loadingFiles ? (
                  <div className="flex flex-1 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-accent" />
                  </div>
                ) : storageFiles.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                    <svg className="h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <p className="text-base text-muted-foreground">
                      No files in storage.<br />Upload files in the Files page.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto p-2">
                    {storageFiles.map((file) => {
                      const supported = isParserFileSupported(file.filename, experimentEngines);
                      return (
                        <button
                          key={file.id}
                          type="button"
                          onClick={() => handleSelectFile(file.storage_key, file.filename)}
                          disabled={loading || !supported}
                          title={supported ? undefined : `Supported types: ${acceptedFileProfile.label}`}
                          className={`mb-2 w-full rounded-lg border p-3 text-left transition-smooth ${
                            selectedFileKey === file.storage_key
                              ? "border-accent bg-accent/10"
                              : "border-border hover:border-accent/50 hover:bg-muted"
                          } ${loading || !supported ? "cursor-not-allowed opacity-disabled" : ""}`}
                        >
                          <p className="truncate text-base font-medium text-card-foreground">
                            {file.filename}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {supported
                              ? `${(file.file_size / 1024).toFixed(2)} KB`
                              : "Not supported by all selected engines"}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="mb-6">
          <h3 className="mb-4 text-base font-medium text-card-foreground">
            Document processing engine
          </h3>

          <label className="block text-xs text-muted-foreground mb-2">
            Primary engine
          </label>
          <select
            value={primaryEngine}
            onChange={(event) => onPrimaryEngineChange(event.target.value as DocumentEngineType)}
            disabled={loading}
            className="h-control-xl w-full rounded-lg border border-border bg-card px-3 text-card-foreground transition-smooth focus-ring disabled:cursor-not-allowed disabled:opacity-disabled"
          >
            {documentEngines.map((engine) => (
              <option key={engine.id} value={engine.engineType}>
                {engine.kind === "vision" ? `Vision · ${engine.displayName}` : `Parser · ${engine.displayName}`}
              </option>
            ))}
          </select>

          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground" title={summarizeDocumentEngineConfig(primaryEngine, engineConfigs[primaryEngine])}>
                {summarizeDocumentEngineConfig(primaryEngine, engineConfigs[primaryEngine])}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {persistedEngines.has(primaryEngine) ? "Saved profile" : "Built-in default"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenSettings(primaryEngine)}
              className="shrink-0 text-xs font-medium text-accent transition-smooth hover:text-accent/80"
            >
              Open settings
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {selectedEngine.stages.map((stage) => (
              <span key={stage} className="rounded-lg bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                {stage === "ocr"
                  ? "OCR"
                  : stage === "layout"
                    ? "Layout"
                    : stage === "structure"
                      ? "Structure"
                      : stage === "visual-understanding"
                        ? "Vision"
                        : "Extraction"}
              </span>
            ))}
          </div>

          <div className="mt-6 border-t border-border pt-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-medium text-card-foreground">Additional engines</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  선택한 엔진을 Primary 다음에 순차 실행합니다.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                {additionalExperimentEngines.length} selected
              </span>
            </div>

            <div className="space-y-2">
              {documentEngines
                .filter((engine) => engine.engineType !== primaryEngine)
                .map((engine) => {
                  const checked = additionalExperimentEngines.includes(engine.engineType);
                  const summary = summarizeDocumentEngineConfig(
                    engine.engineType,
                    engineConfigs[engine.engineType]
                  );
                  return (
                    <label
                      key={engine.id}
                      className={`flex h-control-xl cursor-pointer items-center gap-3 rounded-lg border px-3 transition-smooth ${
                        checked
                          ? "border-accent bg-accent/5"
                          : "border-border hover:border-border-darkest"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleExperimentEngine(engine.engineType)}
                        disabled={loading}
                        className="h-4 w-4 rounded-sm border-border text-accent focus:ring-2 focus:ring-accent/20"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-card-foreground">
                          {engine.displayName}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground" title={summary}>
                          {summary}
                        </span>
                      </span>
                    </label>
                  );
                })}
            </div>

            <button
              type="button"
              onClick={() => onOpenSettings(primaryEngine)}
              className="mt-3 text-xs font-medium text-accent transition-smooth hover:text-accent/80"
            >
              Manage all engine settings
            </button>
          </div>

          {settingsLoading && (
            <p className="mt-4 text-xs text-muted-foreground">Loading saved engine profiles...</p>
          )}
          {settingsError && (
            <div role="alert" className="mt-4 rounded-lg border border-danger-border bg-danger-surface px-3 py-3">
              <p className="text-xs text-danger">{settingsError}</p>
              <button
                type="button"
                onClick={() => onOpenSettings(primaryEngine)}
                className="mt-2 text-xs font-medium text-danger transition-smooth hover:text-danger/80"
              >
                Review engine settings
              </button>
            </div>
          )}
        </section>
      </div>

      <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-surface px-6 py-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onReset}
            disabled={loading}
            className="flex items-center gap-2 text-base font-medium text-muted-foreground transition-smooth hover:text-card-foreground disabled:cursor-not-allowed disabled:opacity-disabled"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset
          </button>

          <button
            type="button"
            onClick={() => onParse({
              primaryEngine,
              engines: experimentEngines.map((parserType) => ({
                parserType,
                config: { ...engineConfigs[parserType] },
              })),
            })}
            disabled={
              loading
              || !settingsReady
              || !selectedFile
              || !selectedFileSupported
              || experimentEngines.length === 0
            }
            className="flex items-center gap-2 text-base font-medium text-accent transition-smooth hover:text-accent/80 disabled:cursor-not-allowed disabled:text-muted-foreground"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing {experimentEngines.length}...
              </>
            ) : (
              <>
                {experimentEngines.length > 1
                  ? `Run ${experimentEngines.length} Engines`
                  : "Process Document"}
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(ParserLeftPanel);
