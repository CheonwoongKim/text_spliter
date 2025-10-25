"use client";

import { memo, useCallback } from "react";
import type { ParserType, ParserConfig } from "@/lib/types";

interface ParserLeftPanelProps {
  config: ParserConfig;
  loading: boolean;
  selectedFile: File | null;
  onConfigChange: (updates: Partial<ParserConfig>) => void;
  onFileSelect: (file: File | null) => void;
  onParse: () => void;
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
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
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

  const handleUpstageOutputFormatChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onConfigChange({ upstageOutputFormat: e.target.value as 'text' | 'html' | 'markdown' });
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

  const handleExtractImagesChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onConfigChange({ extractImages: e.target.checked });
    },
    [onConfigChange]
  );

  const handleExtractTablesChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onConfigChange({ extractTables: e.target.checked });
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

  const handleLlamaResultTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onConfigChange({ llamaResultType: e.target.value as 'text' | 'markdown' | 'json' });
    },
    [onConfigChange]
  );

  const handleLlamaGpt4oModeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onConfigChange({ llamaGpt4oMode: e.target.checked });
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

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex-1 overflow-y-auto py-6 pb-24">
        {/* Parser Selection */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-surface-foreground mb-4">
            Parser Selection
          </h3>
        <div>
          <label className="block text-sm text-muted-foreground mb-2">
            Parser Type
          </label>
          <select
            value={config.parserType}
            onChange={handleParserTypeChange}
            disabled={loading}
            className="w-full h-12 px-3 border border-border rounded-lg
                     focus-ring bg-card text-card-foreground
                     transition-smooth disabled:opacity-disabled disabled:cursor-not-allowed"
          >
            <option value="Upstage">Upstage Document AI</option>
            <option value="LlamaIndex">LlamaIndex (LlamaParse)</option>
            <option value="Azure">Azure Document Intelligence</option>
            <option value="Google">Google Document AI</option>
          </select>
          <p className="text-xs text-muted-foreground mt-2">
            {config.parserType === "Upstage" &&
              "Upstage Document AI를 사용하여 PDF, 이미지 파일을 파싱합니다."}
            {config.parserType === "LlamaIndex" &&
              "LlamaIndex의 LlamaParse를 사용하여 PDF, DOCX, PPTX, 이미지 파일을 파싱합니다."}
            {config.parserType === "Azure" &&
              "Azure Document Intelligence를 사용하여 PDF, 이미지 파일을 파싱합니다."}
            {config.parserType === "Google" &&
              "Google Document AI를 사용하여 PDF, 이미지 파일을 파싱합니다."}
          </p>
        </div>
        </div>

        {/* Parser Settings */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-surface-foreground mb-4">
            Parser Settings
          </h3>

          {/* Upstage Output Format */}
          {config.parserType === "Upstage" && (
            <div className="mb-4">
              <label className="block text-sm text-muted-foreground mb-2">
                Output Format
              </label>
              <select
                value={config.upstageOutputFormat || 'markdown'}
                onChange={handleUpstageOutputFormatChange}
                disabled={loading}
                className="w-full h-12 px-3 border border-border rounded-lg
                         focus-ring bg-card text-card-foreground
                         transition-smooth disabled:opacity-disabled disabled:cursor-not-allowed"
              >
                <option value="text">Text</option>
                <option value="html">HTML</option>
                <option value="markdown">Markdown</option>
              </select>
              <p className="text-xs text-muted-foreground mt-2">
                Upstage는 Text, HTML, Markdown 형식을 모두 지원합니다.
              </p>
            </div>
          )}

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

          {/* OCR Language */}
          <div className="mb-4">
            <label className="block text-sm text-muted-foreground mb-2">
              OCR Language
            </label>
            <input
              type="text"
              value={config.language || ''}
              onChange={handleLanguageChange}
              disabled={loading}
              placeholder="ko, en, ja, etc."
              className="w-full h-12 px-3 border border-border rounded-lg
                       focus-ring bg-card text-card-foreground placeholder-light
                       transition-smooth disabled:opacity-disabled disabled:cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-2">
              OCR 언어 코드를 입력하세요 (예: ko, en, ja).
            </p>
          </div>

          {/* Page Range */}
          <div className="mb-4">
            <label className="block text-sm text-muted-foreground mb-2">
              Page Range (Optional)
            </label>
            <input
              type="text"
              value={config.pageRange || ''}
              onChange={handlePageRangeChange}
              disabled={loading}
              placeholder="e.g., 1-5 or 1,3,5-10"
              className="w-full h-12 px-3 border border-border rounded-lg
                       focus-ring bg-card text-card-foreground placeholder-light
                       transition-smooth disabled:opacity-disabled disabled:cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-2">
              특정 페이지만 파싱하려면 범위를 입력하세요 (예: 1-5, 1,3,5-10).
            </p>
          </div>

          {/* Extract Options */}
          <div className="mb-4 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.extractImages || false}
                onChange={handleExtractImagesChange}
                disabled={loading}
                className="w-4 h-4 rounded border-border text-accent
                         focus:ring-2 focus:ring-accent/20 disabled:opacity-disabled
                         disabled:cursor-not-allowed"
              />
              <span className="text-sm text-card-foreground">Extract Images</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.extractTables || false}
                onChange={handleExtractTablesChange}
                disabled={loading}
                className="w-4 h-4 rounded border-border text-accent
                         focus:ring-2 focus:ring-accent/20 disabled:opacity-disabled
                         disabled:cursor-not-allowed"
              />
              <span className="text-sm text-card-foreground">Extract Tables</span>
            </label>
          </div>

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
                  Result Type
                </label>
                <select
                  value={config.llamaResultType || 'markdown'}
                  onChange={handleLlamaResultTypeChange}
                  disabled={loading}
                  className="w-full h-12 px-3 border border-border rounded-lg
                           focus-ring bg-card text-card-foreground
                           transition-smooth disabled:opacity-disabled disabled:cursor-not-allowed"
                >
                  <option value="text">Text</option>
                  <option value="markdown">Markdown</option>
                  <option value="json">JSON</option>
                </select>
                <p className="text-xs text-muted-foreground mt-2">
                  LlamaParse는 Text, Markdown, JSON 형식을 지원합니다.
                </p>
              </div>
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.llamaGpt4oMode || false}
                    onChange={handleLlamaGpt4oModeChange}
                    disabled={loading}
                    className="w-4 h-4 rounded border-border text-accent
                             focus:ring-2 focus:ring-accent/20 disabled:opacity-disabled
                             disabled:cursor-not-allowed"
                  />
                  <span className="text-sm text-card-foreground">Enable GPT-4o Mode</span>
                </label>
                <p className="text-xs text-muted-foreground mt-2">
                  더 정확한 결과를 위해 GPT-4o를 사용합니다 (처리 시간이 길어질 수 있습니다).
                </p>
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
        </div>

        {/* File Upload */}
        <div>
          <h3 className="text-sm font-medium text-surface-foreground mb-4">
            File Upload
          </h3>
        <div>
          {selectedFile ? (
            <div className="border-2 border-dashed border-border rounded-lg p-6 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <svg
                    className="w-6 h-6 text-accent"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-card-foreground">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="file-upload"
                    className="p-2 bg-muted hover:bg-muted/80 text-muted-foreground
                             rounded-md transition-smooth cursor-pointer"
                    title="Change file"
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
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                  </label>
                  <button
                    onClick={() => onFileSelect(null)}
                    className="p-2 bg-muted hover:bg-red-500/10 text-muted-foreground
                             hover:text-red-500 rounded-md transition-smooth"
                    title="Delete file"
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.docx,.pptx"
                onChange={handleFileChange}
                disabled={loading}
                className="hidden"
              />
            </div>
          ) : (
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center h-48
                       border-2 border-dashed border-border rounded-lg
                       cursor-pointer hover:border-accent transition-smooth
                       bg-muted/30 hover:bg-muted/50"
            >
              <svg
                className="w-6 h-6 mb-4 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-sm text-surface-foreground font-medium mb-1">
                파일을 선택하거나 드래그하세요
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, PNG, JPG, JPEG, DOCX, PPTX 파일 지원
              </p>
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.docx,.pptx"
                onChange={handleFileChange}
                disabled={loading}
                className="hidden"
              />
            </label>
          )}
        </div>
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
            onClick={onParse}
            disabled={loading}
            className="text-blue-500 hover:text-blue-600 disabled:text-muted-foreground
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
              Processing...
            </>
          ) : (
            <>
              Parse Document
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
