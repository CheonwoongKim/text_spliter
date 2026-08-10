"use client";

import { ArrowRight, Check, CloudUpload, FileText, FolderOpen, LoaderCircle, RotateCcw, Settings, X } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { getAuthToken } from "@/lib/auth";
import { listDocumentEngines } from "@/lib/document-engines";
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
  const [uploadMode, setUploadMode] = useState<"upload" | "select">("upload");
  const [storageFiles, setStorageFiles] = useState<StorageFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFileKey, setSelectedFileKey] = useState<string | null>(null);
  const [additionalExperimentEngines, setAdditionalExperimentEngines] = useState<DocumentEngineType[]>([]);
  const additionalEngineOptions = documentEngines.filter(
    (engine) => engine.engineType !== primaryEngine
  );
  const orderedAdditionalEngines = additionalEngineOptions
    .filter((engine) => additionalExperimentEngines.includes(engine.engineType))
    .map((engine) => engine.engineType);
  const experimentEngines = buildParserExperimentEngines(
    primaryEngine,
    orderedAdditionalEngines
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

  const toggleExperimentEngine = useCallback((
    engineType: DocumentEngineType,
    selected: boolean,
  ) => {
    setAdditionalExperimentEngines((current) =>
      selected
        ? current.includes(engineType) ? current : [...current, engineType]
        : current.filter((candidate) => candidate !== engineType)
    );
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isParserFileSupported(file.name, experimentEngines)) {
      event.target.value = "";
      alert(`Choose a supported file type: ${acceptedFileProfile.label}`);
      return;
    }

    onFileSelect(file, null);
    setSelectedFileKey(null);
  };

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
      <div className="min-h-0 flex-1 overflow-y-auto py-6 pb-6 pl-4 sm:pl-6 lg:pl-10 lg:pr-10">
        <section className="mb-10">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setUploadMode("upload")}
                className={`whitespace-nowrap rounded-sm px-3 py-1 text-2xs font-medium transition-smooth ${
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
                className={`whitespace-nowrap rounded-sm px-3 py-1 text-2xs font-medium transition-smooth ${
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

          <div className="h-parser-file-zone">
            {uploadMode === "upload" ? (
              selectedFile ? (
                <div className="relative flex h-full flex-col items-center justify-center gap-3 overflow-hidden
                                rounded-lg border border-border bg-upload-zone px-10 text-center">
                  <button
                    type="button"
                    onClick={clearSelectedFile}
                    aria-label="Clear selected file"
                    title="Clear selected file"
                    className="absolute right-3 top-3 flex h-control-sm w-control-sm items-center justify-center
                             rounded-lg text-muted-foreground transition-smooth hover:bg-muted
                             hover:text-card-foreground focus-ring"
                  >
                    <X className="h-4 w-4" strokeWidth={1} aria-hidden="true" />
                  </button>
                  <FileText
                    className="h-6 w-6 shrink-0 text-muted-foreground"
                    strokeWidth={1}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 max-w-full">
                    <p className="truncate text-xs font-medium text-card-foreground">
                      {selectedFile.name}
                    </p>
                    <p className="mt-1 text-2xs text-muted-foreground">
                      {selectedFile.type || "Unknown type"} · {(selectedFile.size / 1024).toFixed(2)} KB
                      {selectedFileKey ? " · from storage" : ""}
                    </p>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="file-upload"
                  className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3
                           rounded-lg border border-dashed border-border bg-upload-zone
                           transition-smooth hover:border-solid hover:border-surface-foreground
                           focus-within:border-solid focus-within:border-surface-foreground"
                >
                  <CloudUpload
                    className="h-6 w-6 text-muted-foreground"
                    strokeWidth={1}
                    aria-hidden="true"
                  />
                  <div className="text-center">
                    <p className="text-xs font-medium text-card-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="mt-1 text-2xs text-muted-foreground">
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
                    <LoaderCircle className="h-icon-md w-icon-md animate-spin text-muted-foreground" strokeWidth={1} aria-hidden="true" />
                  </div>
                ) : storageFiles.length === 0 ? (
                  <EmptyState
                    className="flex-1"
                    icon={(
                      <FolderOpen
                        className="h-6 w-6"
                        strokeWidth={1}
                        aria-hidden="true"
                      />
                    )}
                    title="No files in storage"
                    description="Upload files from the Files page to select them here."
                  />
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
                              ? "border-surface-foreground bg-upload-zone"
                              : "border-border hover:border-border-darkest hover:bg-muted"
                          } ${loading || !supported ? "cursor-not-allowed opacity-disabled" : ""}`}
                        >
                          <p className="truncate text-xs font-medium text-card-foreground">
                            {file.filename}
                          </p>
                          <p className="mt-1 text-2xs text-muted-foreground">
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
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
              Document processing engine
            </h3>
            <button
              type="button"
              onClick={() => onOpenSettings(primaryEngine)}
              aria-label="Engine settings"
              title="Engine settings"
              className="flex h-control-sm w-control-sm shrink-0 items-center justify-center rounded-lg
                       text-card-foreground transition-smooth hover:bg-muted focus-ring"
            >
              <Settings className="h-4 w-4" strokeWidth={1} aria-hidden="true" />
            </button>
          </div>

          <div>
            <p className="text-xs font-medium text-card-foreground">1. Primary engine</p>
            <p className="mt-1 text-2xs text-muted-foreground">
              Required. Runs first and provides the main result.
            </p>
          </div>

          <select
            value={primaryEngine}
            onChange={(event) => onPrimaryEngineChange(event.target.value as DocumentEngineType)}
            disabled={loading}
            className="mt-3 h-control-xl w-full rounded-lg border border-border bg-card px-3 text-xs
                     text-card-foreground transition-smooth focus-ring
                     disabled:cursor-not-allowed disabled:opacity-disabled"
          >
            {documentEngines.map((engine) => (
              <option key={engine.id} value={engine.engineType}>
                {engine.displayName} ({persistedEngines.has(engine.engineType) ? "saved" : "default"})
              </option>
            ))}
          </select>

          <div className="mt-6">
            <div className="mb-3">
              <p className="text-xs font-medium text-card-foreground">
                2. Additional engines <span className="font-normal text-muted-foreground">(optional)</span>
              </p>
              <p className="mt-1 text-2xs text-muted-foreground">
                Run after Primary when you want to compare results.
              </p>
            </div>

            <div
              role="group"
              aria-label="Additional engines"
              className="overflow-hidden rounded-lg border border-border"
            >
              {additionalEngineOptions.map((engine, index) => {
                const selected = additionalExperimentEngines.includes(engine.engineType);
                return (
                  <label
                    key={engine.id}
                    className={`flex h-control-xl cursor-pointer items-center gap-3 px-3 transition-smooth
                              hover:bg-muted ${index > 0 ? "border-t border-border" : ""}
                              ${loading ? "cursor-not-allowed opacity-disabled" : ""}`}
                  >
                    <span className="relative h-4 w-4 shrink-0">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(event) => toggleExperimentEngine(
                          engine.engineType,
                          event.target.checked,
                        )}
                        disabled={loading}
                        className="h-4 w-4 appearance-none rounded-lg border border-border bg-card
                                 checked:border-surface-foreground checked:bg-surface-foreground
                                 focus:outline-none focus-visible:border-surface-foreground"
                      />
                      {selected && (
                        <Check
                          className="pointer-events-none absolute inset-0 m-auto h-3 w-3 text-card"
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-card-foreground">
                      {engine.displayName}
                    </span>
                  </label>
                );
              })}
            </div>
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

      <div className="shrink-0">
        <div className="w-full bg-card/90 shadow-sm backdrop-blur-sm">
          <div className="h-px w-full bg-border" aria-hidden="true" />
          <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
          <button
            type="button"
            onClick={onReset}
            disabled={loading}
            className="flex items-center gap-2 text-xs font-medium text-muted-foreground transition-smooth hover:text-card-foreground disabled:cursor-not-allowed disabled:opacity-disabled"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={1} aria-hidden="true" />
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
            className="flex h-control-md items-center gap-2 rounded-lg bg-surface-foreground px-3 text-xs
                     font-medium text-surface transition-smooth hover:opacity-hover
                     disabled:cursor-not-allowed disabled:opacity-disabled"
          >
            {loading ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1} aria-hidden="true" />
                Processing {experimentEngines.length}...
              </>
            ) : (
              <>
                {experimentEngines.length > 1
                  ? `Run ${experimentEngines.length} Engines`
                  : "Process Document"}
                <ArrowRight className="h-4 w-4" strokeWidth={1} aria-hidden="true" />
              </>
            )}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ParserLeftPanel);
