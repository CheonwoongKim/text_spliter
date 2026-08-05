"use client";

import { memo, useCallback, useState, useEffect } from "react";
import type { ParserType, ParserConfig } from "@/lib/types";
import { getAuthToken } from "@/lib/auth";
import { getDocumentEngine, listDocumentEngines } from "@/lib/document-engines";

const documentEngines = listDocumentEngines();

interface StorageFile {
  id: string;
  filename: string;
  storage_key: string;
  file_size: number;
  uploaded_at: string;
}

interface ParserLeftPanelProps {
  config: ParserConfig;
  loading: boolean;
  selectedFile: File | null;
  onConfigChange: (updates: Partial<ParserConfig>) => void;
  onFileSelect: (file: File | null, storageKey?: string | null) => void;
  onParse: (parserTypes: ParserType[]) => void;
  onReset: () => void;
}

function ParserLeftPanel({
  config,
  loading,
  selectedFile,
  onConfigChange,
  onFileSelect,
  onParse,
  onReset,
}: ParserLeftPanelProps) {
  const selectedEngine = getDocumentEngine(config.parserType);
  const [uploadMode, setUploadMode] = useState<"upload" | "select">("upload");
  const [storageFiles, setStorageFiles] = useState<StorageFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFileKey, setSelectedFileKey] = useState<string | null>(null);
  const [experimentEngines, setExperimentEngines] = useState<ParserType[]>([
    config.parserType,
  ]);

  const toggleExperimentEngine = useCallback((parserType: ParserType) => {
    setExperimentEngines((current) => {
      if (current.includes(parserType)) {
        return current.length === 1
          ? current
          : current.filter((candidate) => candidate !== parserType);
      }

      return [...current, parserType];
    });
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file, null);  // null indicates this is a direct upload
        setSelectedFileKey(null);
      }
    },
    [onFileSelect]
  );

  const handleParserTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onConfigChange({ parserType: e.target.value as ParserType });
    },
    [onConfigChange]
  );

  const handleAzureOutputFormatChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onConfigChange({ azureOutputFormat: e.target.value as 'text' | 'markdown' });
    },
    [onConfigChange]
  );

  const handleLanguageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onConfigChange({ language: e.target.value });
    },
    [onConfigChange]
  );

  const handlePageRangeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onConfigChange({ pageRange: e.target.value });
    },
    [onConfigChange]
  );

  const handleAzureModelIdChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onConfigChange({ azureModelId: e.target.value });
    },
    [onConfigChange]
  );

  const handleLlamaTierChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onConfigChange({ llamaTier: e.target.value as ParserConfig["llamaTier"] });
    },
    [onConfigChange]
  );

  const handleLlamaVersionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onConfigChange({ llamaVersion: e.target.value });
    },
    [onConfigChange]
  );

  const handleGoogleProcessorIdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onConfigChange({ googleProcessorId: e.target.value });
    },
    [onConfigChange]
  );

  const handleGoogleLocationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onConfigChange({ googleLocation: e.target.value });
    },
    [onConfigChange]
  );

  const handleDoclingOutputFormatChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onConfigChange({ doclingOutputFormat: e.target.value as 'markdown' | 'html' | 'json' });
    },
    [onConfigChange]
  );

  const handleDoclingPipelineChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onConfigChange({ doclingPipeline: e.target.value as ParserConfig["doclingPipeline"] });
    },
    [onConfigChange]
  );

  const handleDoclingOcrModeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onConfigChange({ doclingOcrMode: e.target.value as ParserConfig["doclingOcrMode"] });
    },
    [onConfigChange]
  );

  const handleDoclingTableModeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onConfigChange({ doclingTableMode: e.target.value as ParserConfig["doclingTableMode"] });
    },
    [onConfigChange]
  );

  const handleExtractImagesChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onConfigChange({ extractImages: e.target.checked });
    },
    [onConfigChange]
  );

  const fetchStorageFiles = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setLoadingFiles(false);
      return;
    }

    setLoadingFiles(true);
    try {
      const response = await fetch("/api/storage/files", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setStorageFiles(data.files || []);
    } catch (err) {
      console.error("Error fetching storage files:", err);
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
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load file");
      }

      const blob = await response.blob();

      // Convert blob to File object
      const file = new File([blob], displayName, { type: blob.type });

      onFileSelect(file, fileKey);  // Pass the storage key
      setSelectedFileKey(fileKey);
    } catch (err) {
      alert(`Failed to load file: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, [onFileSelect]);

  useEffect(() => {
    if (uploadMode === "select") {
      fetchStorageFiles();
    }
  }, [uploadMode, fetchStorageFiles]);

  const acceptedFileTypes = config.parserType === "Docling"
    ? ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.html,.htm,.md,.txt"
    : ".pdf,.png,.jpg,.jpeg,.docx,.pptx";
  const acceptedFileLabel = config.parserType === "Docling"
    ? "PDF, images, Office, HTML, Markdown, CSV, TXT"
    : "PDF, PNG, JPG, JPEG, DOCX, PPTX";

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex-1 overflow-y-auto py-6 pb-24">
        {/* File Upload Section */}
        <div className="mb-10">
          {/* Header with tabs */}
          <div className="flex justify-between items-center mb-2">
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              <button
                onClick={() => setUploadMode("upload")}
                className={`px-3 py-1 text-xs font-medium rounded transition-smooth whitespace-nowrap ${
                  uploadMode === "upload"
                    ? "bg-card text-card-foreground shadow-sm"
                    : "text-muted-foreground hover:text-card-foreground"
                }`}
              >
                Upload
              </button>
              <button
                onClick={() => setUploadMode("select")}
                className={`px-3 py-1 text-xs font-medium rounded transition-smooth whitespace-nowrap ${
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

          {/* File Upload Content */}
          <div className="h-[300px]">
            {uploadMode === "upload" ? (
              selectedFile ? (
                <div className="h-full flex flex-col border border-border rounded-lg overflow-hidden">
                  <div className="p-3 bg-muted/30 border-b border-border flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-xs font-medium text-surface-foreground">{selectedFile.name}</span>
                      </div>
                      <button
                        onClick={() => {
                          onFileSelect(null, null);
                          setSelectedFileKey(null);
                        }}
                        className="text-xs text-muted-foreground hover:text-surface-foreground transition-smooth"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 p-4 overflow-auto">
                    <div className="flex items-center gap-3">
                      <svg className="w-8 h-8 text-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-card-foreground mb-1">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedFile.type || 'Unknown type'} • {(selectedFile.size / 1024).toFixed(2)} KB
                          {selectedFileKey && <span> • from storage</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    accept={acceptedFileTypes}
                    onChange={handleFileChange}
                    disabled={loading}
                    className="hidden"
                  />
                </div>
              ) : (
                <label
                  htmlFor="file-upload"
                  className="w-full h-full border-2 border-dashed border-border rounded-lg
                           hover:border-accent hover:bg-accent/5
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-smooth flex flex-col items-center justify-center gap-3 cursor-pointer"
                >
                  <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <div className="text-center">
                    <p className="text-sm font-medium text-surface-foreground mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {acceptedFileLabel} (max 100MB)
                    </p>
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    accept={acceptedFileTypes}
                    onChange={handleFileChange}
                    disabled={loading}
                    className="hidden"
                  />
                </label>
              )
            ) : (
              // Select from Storage mode
              <div className="h-full flex flex-col border border-border rounded-lg overflow-hidden">
                {selectedFile && (
                  <div className="border-b border-border p-3 bg-muted/30 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-xs font-medium text-card-foreground">{selectedFile.name}</span>
                        <span className="text-xs text-muted-foreground">(from storage)</span>
                      </div>
                      <button
                        onClick={() => {
                          onFileSelect(null, null);
                          setSelectedFileKey(null);
                        }}
                        className="text-xs text-muted-foreground hover:text-surface-foreground transition-smooth"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
                {loadingFiles ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                  </div>
                ) : storageFiles.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
                    <svg className="w-12 h-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <p className="text-sm text-muted-foreground text-center">
                      No files in storage.<br />Upload files in the Files page.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto p-2">
                    {storageFiles.map((file) => (
                      <button
                        key={file.id}
                        onClick={() => handleSelectFile(file.storage_key, file.filename)}
                        disabled={loading}
                        className={`w-full text-left p-3 mb-2 rounded-lg border transition-smooth ${
                          selectedFileKey === file.storage_key
                            ? "border-accent bg-accent/10"
                            : "border-border hover:border-accent/50 hover:bg-muted"
                        } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-surface-foreground truncate">
                              {file.filename}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(file.file_size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Document processing engine selection */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-surface-foreground mb-4">
            Document Processing Engine
          </h3>
        <div>
          <label className="block text-sm text-muted-foreground mb-2">
            Engine
          </label>
          <select
            value={config.parserType}
            onChange={handleParserTypeChange}
            disabled={loading}
            className="w-full h-12 px-3 border border-border rounded-lg
                     focus-ring bg-card text-card-foreground
                     transition-smooth disabled:opacity-disabled disabled:cursor-not-allowed"
          >
            {documentEngines.map((engine) => (
              <option key={engine.id} value={engine.parserType}>
                {engine.displayName}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {selectedEngine.stages.map((stage) => (
              <span
                key={stage}
                className="px-2 py-1 text-[11px] font-medium rounded-md bg-muted text-muted-foreground"
              >
                {stage === "ocr" ? "OCR" :
                  stage === "layout" ? "Layout" :
                  stage === "structure" ? "Structure" :
                  stage === "visual-understanding" ? "Vision" : "Extraction"}
              </span>
            ))}
            <span className="px-2 py-1 text-[11px] font-medium rounded-md border border-border text-muted-foreground">
              {selectedEngine.deployment === "self-hosted" ? "Self-hosted" : "Managed"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {selectedEngine.category === "ocr-layout-hybrid"
              ? "OCR과 레이아웃 분석을 결합해 문서 구조를 복원합니다."
              : selectedEngine.category === "document-vlm"
              ? "Vision-Language Model로 문서 구조와 시각적 맥락을 해석합니다."
              : "텍스트뿐 아니라 레이아웃과 구조를 문서 표현으로 변환합니다."}
          </p>

          <div className="mt-5 pt-5 border-t border-border">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-sm font-medium text-card-foreground">Experiment batch</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  체크한 엔진을 같은 원본에 순차 실행합니다.
                </p>
              </div>
              <span className="shrink-0 px-2 py-1 rounded-full bg-muted text-[11px] text-muted-foreground">
                {experimentEngines.length} selected
              </span>
            </div>
            <div className="space-y-2">
              {documentEngines.map((engine) => {
                const checked = experimentEngines.includes(engine.parserType);
                const editing = config.parserType === engine.parserType;
                return (
                  <label
                    key={engine.id}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-smooth ${
                      checked
                        ? "border-accent/60 bg-accent/5"
                        : "border-border hover:border-border-darkest"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleExperimentEngine(engine.parserType)}
                      disabled={loading || (checked && experimentEngines.length === 1)}
                      className="w-4 h-4 rounded border-border text-accent focus:ring-2 focus:ring-accent/20"
                    />
                    <span className="min-w-0 flex-1 text-xs font-medium text-card-foreground truncate">
                      {engine.displayName}
                    </span>
                    {editing && (
                      <span className="text-[10px] font-medium text-accent">Editing settings</span>
                    )}
                  </label>
                );
              })}
            </div>
            <p className="text-[11px] leading-4 text-muted-foreground mt-3">
              위 Engine 선택은 옵션 편집 대상을 바꾸며, 체크된 모든 엔진의 현재 설정이 배치에 사용됩니다.
            </p>
          </div>
        </div>
        </div>

        {/* Parser Settings */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-surface-foreground mb-4">
            Parser Settings
          </h3>

          {/* Upstage: All formats are automatically retrieved */}

          {/* Azure Output Format */}
          {config.parserType === "Azure" && (
            <div className="mb-4">
              <label className="block text-sm text-muted-foreground mb-2">
                Output Format
              </label>
              <select
                value={config.azureOutputFormat || 'markdown'}
                onChange={handleAzureOutputFormatChange}
                disabled={loading}
                className="w-full h-12 px-3 border border-border rounded-lg
                         focus-ring bg-card text-card-foreground
                         transition-smooth disabled:opacity-disabled disabled:cursor-not-allowed"
              >
                <option value="text">Text</option>
                <option value="markdown">Markdown</option>
              </select>
              <p className="text-xs text-muted-foreground mt-2">
                Azure는 Text와 Markdown 형식을 지원합니다.
              </p>
            </div>
          )}

          {config.parserType === "Upstage" && (
            <div className="mb-4">
              <label className="block text-sm text-muted-foreground mb-2">
                OCR Language
              </label>
              <input
                type="text"
                value={config.language || ""}
                onChange={handleLanguageChange}
                disabled={loading}
                placeholder="ko, en, ja, etc."
                className="w-full h-12 px-3 border border-border rounded-lg
                         focus-ring bg-card text-card-foreground placeholder-light
                         transition-smooth disabled:opacity-disabled disabled:cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Upstage 내부 OCR에 전달할 언어 코드입니다.
              </p>
            </div>
          )}

          {/* Azure specific settings */}
          {config.parserType === "Azure" && (
            <div className="mb-4">
              <label className="block text-sm text-muted-foreground mb-2">
                Azure Model ID
              </label>
              <select
                value={config.azureModelId || 'prebuilt-layout'}
                onChange={handleAzureModelIdChange}
                disabled={loading}
                className="w-full h-12 px-3 border border-border rounded-lg
                         focus-ring bg-card text-card-foreground
                         transition-smooth disabled:opacity-disabled disabled:cursor-not-allowed"
              >
                <option value="prebuilt-layout">Prebuilt Layout</option>
                <option value="prebuilt-read">Prebuilt Read</option>
                <option value="prebuilt-document">Prebuilt Document</option>
              </select>
              <p className="text-xs text-muted-foreground mt-2">
                사용할 Azure Document Intelligence 모델을 선택하세요.
              </p>
            </div>
          )}

          {/* LlamaIndex specific settings */}
          {config.parserType === "LlamaIndex" && (
            <>
              <div className="mb-4">
                <label className="block text-sm text-muted-foreground mb-2">
                  Parsing Tier
                </label>
                <select
                  value={config.llamaTier || "agentic"}
                  onChange={handleLlamaTierChange}
                  disabled={loading}
                  className="w-full h-12 px-3 border border-border rounded-lg
                           focus-ring bg-card text-card-foreground
                           transition-smooth disabled:opacity-disabled disabled:cursor-not-allowed"
                >
                  <option value="fast">Fast (text only)</option>
                  <option value="cost_effective">Cost Effective</option>
                  <option value="agentic">Agentic</option>
                  <option value="agentic_plus">Agentic Plus</option>
                </select>
                <p className="text-xs text-muted-foreground mt-2">
                  복잡한 표와 스캔 문서는 Agentic 이상을 권장합니다.
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm text-muted-foreground mb-2">
                  Parser Version
                </label>
                <input
                  type="text"
                  value={config.llamaVersion || "latest"}
                  onChange={handleLlamaVersionChange}
                  disabled={loading}
                  placeholder="latest or YYYY-MM-DD"
                  className="w-full h-12 px-3 border border-border rounded-lg
                           focus-ring bg-card text-card-foreground placeholder-light
                           transition-smooth disabled:opacity-disabled disabled:cursor-not-allowed"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm text-muted-foreground mb-2">
                  Page Range (Optional)
                </label>
                <input
                  type="text"
                  value={config.pageRange || ""}
                  onChange={handlePageRangeChange}
                  disabled={loading}
                  placeholder="1-5 or 1,3,5-10"
                  className="w-full h-12 px-3 border border-border rounded-lg
                           focus-ring bg-card text-card-foreground placeholder-light
                           transition-smooth disabled:opacity-disabled disabled:cursor-not-allowed"
                />
              </div>
              <div className="mb-4 border-t border-border pt-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  OCR Options
                </p>
                <label className="block text-sm text-muted-foreground mb-2">
                  OCR Language
                </label>
                <input
                  type="text"
                  value={config.language || ""}
                  onChange={handleLanguageChange}
                  disabled={loading}
                  placeholder="ko, en, ja, etc."
                  className="w-full h-12 px-3 border border-border rounded-lg
                           focus-ring bg-card text-card-foreground placeholder-light
                           transition-smooth disabled:opacity-disabled disabled:cursor-not-allowed"
                />
              </div>
            </>
          )}

          {/* Google specific settings */}
          {config.parserType === "Google" && (
            <>
              <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Google Document AI는 JSON 형식으로만 응답합니다. 텍스트는 응답에서 자동으로 추출됩니다.
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm text-muted-foreground mb-2">
                  Processor Location
                </label>
                <input
                  type="text"
                  value={config.googleLocation || ''}
                  onChange={handleGoogleLocationChange}
                  disabled={loading}
                  placeholder="us or eu"
                  className="w-full h-12 px-3 border border-border rounded-lg
                           focus-ring bg-card text-card-foreground placeholder-light
                           transition-smooth disabled:opacity-disabled disabled:cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  프로세서 위치를 입력하세요 (예: us, eu).
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm text-muted-foreground mb-2">
                  Processor ID
                </label>
                <input
                  type="text"
                  value={config.googleProcessorId || ''}
                  onChange={handleGoogleProcessorIdChange}
                  disabled={loading}
                  placeholder="your-processor-id"
                  className="w-full h-12 px-3 border border-border rounded-lg
                           focus-ring bg-card text-card-foreground placeholder-light
                           transition-smooth disabled:opacity-disabled disabled:cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Document AI 프로세서 ID를 입력하세요.
                </p>
              </div>
            </>
          )}

          {/* Docling specific settings */}
          {config.parserType === "Docling" && (
            <>
              <div className="mb-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                <p className="text-xs text-purple-700 dark:text-purple-300">
                  Docling (IBM Research)은 PDF, DOCX, PPTX, XLSX, HTML, 이미지 등 다양한 문서 형식을 지원합니다.
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm text-muted-foreground mb-2">
                  Output Format
                </label>
                <select
                  value={config.doclingOutputFormat || 'markdown'}
                  onChange={handleDoclingOutputFormatChange}
                  disabled={loading}
                  className="w-full h-12 px-3 border border-border rounded-lg
                           focus-ring bg-card text-card-foreground
                           transition-smooth disabled:opacity-disabled disabled:cursor-not-allowed"
                >
                  <option value="markdown">Markdown</option>
                  <option value="html">HTML</option>
                  <option value="json">JSON</option>
                </select>
                <p className="text-xs text-muted-foreground mt-2">
                  출력 형식을 선택하세요. Markdown이 권장됩니다.
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm text-muted-foreground mb-2">
                  Parser Pipeline
                </label>
                <select
                  value={config.doclingPipeline || "standard"}
                  onChange={handleDoclingPipelineChange}
                  disabled={loading}
                  className="w-full h-12 px-3 border border-border rounded-lg
                           focus-ring bg-card text-card-foreground
                           transition-smooth disabled:opacity-disabled disabled:cursor-not-allowed"
                >
                  <option value="standard">Standard</option>
                  <option value="vlm">VLM</option>
                </select>
                <p className="text-xs text-muted-foreground mt-2">
                  VLM은 복잡한 레이아웃에 유리하지만 더 많은 연산이 필요합니다.
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm text-muted-foreground mb-2">
                  Table Structure Mode
                </label>
                <select
                  value={config.doclingTableMode || "accurate"}
                  onChange={handleDoclingTableModeChange}
                  disabled={loading}
                  className="w-full h-12 px-3 border border-border rounded-lg
                           focus-ring bg-card text-card-foreground
                           transition-smooth disabled:opacity-disabled disabled:cursor-not-allowed"
                >
                  <option value="fast">Fast</option>
                  <option value="accurate">Accurate</option>
                </select>
              </div>
              <label className="mb-4 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.extractImages || false}
                  onChange={handleExtractImagesChange}
                  disabled={loading}
                  className="w-4 h-4 rounded border-border text-accent
                           focus:ring-2 focus:ring-accent/20 disabled:opacity-disabled
                           disabled:cursor-not-allowed"
                />
                <span className="text-sm text-card-foreground">Embed Images</span>
              </label>
              <div className="mb-4 border-t border-border pt-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  OCR Options
                </p>
                <label className="block text-sm text-muted-foreground mb-2">
                  OCR Mode
                </label>
                <select
                  value={config.doclingOcrMode || "auto"}
                  onChange={handleDoclingOcrModeChange}
                  disabled={loading}
                  className="w-full h-12 px-3 border border-border rounded-lg
                           focus-ring bg-card text-card-foreground
                           transition-smooth disabled:opacity-disabled disabled:cursor-not-allowed"
                >
                  <option value="disabled">Disabled (native text only)</option>
                  <option value="auto">Auto</option>
                  <option value="force">Force OCR</option>
                </select>
              </div>
              {config.doclingOcrMode !== "disabled" && (
                <div className="mb-4">
                  <label className="block text-sm text-muted-foreground mb-2">
                    OCR Language
                  </label>
                  <input
                    type="text"
                    value={config.language || ""}
                    onChange={handleLanguageChange}
                    disabled={loading}
                    placeholder="ko, en, ja, etc."
                    className="w-full h-12 px-3 border border-border rounded-lg
                             focus-ring bg-card text-card-foreground placeholder-light
                             transition-smooth disabled:opacity-disabled disabled:cursor-not-allowed"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Buttons - Floating */}
      <div className="absolute bottom-0 left-0 right-0 bg-surface border-t border-border px-6 py-6">
        <div className="flex items-center justify-between">
          {/* Reset Button */}
          <button
            onClick={onReset}
            disabled={loading}
            className="text-muted-foreground hover:text-surface-foreground disabled:opacity-disabled
                     disabled:cursor-not-allowed font-medium text-sm
                     transition-smooth flex items-center gap-2"
          >
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
            Reset
          </button>

          {/* Parse Button */}
          <button
            onClick={() => onParse(experimentEngines)}
            disabled={loading || !selectedFile || experimentEngines.length === 0}
            className="text-white hover:text-white/90 disabled:text-muted-foreground
                     disabled:cursor-not-allowed font-medium text-sm
                     transition-smooth flex items-center gap-2"
          >
          {loading ? (
            <>
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
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
              Processing {experimentEngines.length}...
            </>
          ) : (
            <>
              {experimentEngines.length > 1
                ? `Run ${experimentEngines.length} Parsers`
                : "Parse Document"}
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
                  d="M9 5l7 7-7 7"
                />
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
