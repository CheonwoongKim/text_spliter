"use client";

import { CloudUpload, FileText } from "lucide-react";
import { useRef, useState, useCallback, memo, useEffect } from "react";
import { readFile, isValidFileType } from "@/lib/fileReader";
import {
  extractParseResultSource,
  type StoredParseResultDetail,
} from "@/lib/parse-result-content";
import { InputMode, SourceMetadata } from "@/lib/types";
import { authFetch } from "@/lib/auth";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSourceMetadataChange?: (metadata: SourceMetadata | null) => void;
  /**
   * Set when a parser run was sent here directly. `token` changes on every
   * transfer so repeating the same handoff still reveals the received text.
   */
  handoff?: { token: number; label: string } | null;
}

interface ParseResult {
  id: number;
  run_id?: string | null;
  document_hash?: string | null;
  engine_id?: string | null;
  file_name: string;
  parser_type: string;
  file_size: number;
  mime_type: string;
  processing_time: number | null;
  created_at: string;
}

function TextInput({ value, onChange, onSourceMetadataChange, handoff }: TextInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<InputMode>("upload");
  const [fileName, setFileName] = useState<string>("");
  const [plaintextValue, setPlaintextValue] = useState<string>("");
  const [parseResults, setParseResults] = useState<ParseResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  useEffect(() => {
    setPlaintextValue(value);
  }, [value]);

  const handoffToken = handoff?.token;
  const handoffLabel = handoff?.label;

  // A received parser run must be visible and editable immediately, otherwise
  // the source text would change silently behind the upload tab.
  useEffect(() => {
    if (handoffToken === undefined) return;
    setActiveTab("plaintext");
    setFileName(handoffLabel || "");
  }, [handoffToken, handoffLabel]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isValidFileType(file)) {
      alert("Unsupported file type. Please upload TXT, PDF, DOC, or DOCX files.");
      return;
    }

    setLoading(true);
    try {
      const text = await readFile(file);
      setPlaintextValue(text);
      onChange(text);
      setFileName(file.name);
    } catch (error) {
      alert(`Failed to read file: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }, [onChange]);

  const handleClearFile = useCallback(() => {
    setPlaintextValue("");
    onChange("");
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    // Clear source metadata
    if (onSourceMetadataChange) {
      onSourceMetadataChange(null);
    }
  }, [onChange, onSourceMetadataChange]);

  const handlePlaintextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setPlaintextValue(val);
    onChange(val);
  }, [onChange]);

  const fetchParseResults = useCallback(async () => {
    setLoadingResults(true);
    try {
      const response = await authFetch("/api/parse-results");
      if (!response.ok) {
        throw new Error("Failed to fetch parse results");
      }
      const data = await response.json();
      setParseResults(data.results || []);
    } catch (error) {
      console.error("Error fetching parse results:", error);
      setParseResults([]);
    } finally {
      setLoadingResults(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "storage") {
      void fetchParseResults();
    }
  }, [activeTab, fetchParseResults]);

  const handleLoadParseResult = useCallback(async (result: ParseResult) => {
    setLoading(true);
    try {
      // Fetch full parse result details by ID
      const response = await authFetch(`/api/parse-results?id=${result.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch parse result details");
      }

      const detail: StoredParseResultDetail = await response.json();
      const source = extractParseResultSource(detail);

      if (!source) {
        alert("No text content found in parse result");
        return;
      }

      setPlaintextValue(source.text);
      onChange(source.text);
      setFileName(result.file_name);
      onSourceMetadataChange?.(source.metadata);
      setActiveTab("plaintext");
    } catch (error) {
      console.error("Error loading parse result:", error);
      alert("Failed to load parse result");
    } finally {
      setLoading(false);
    }
  }, [onChange, onSourceMetadataChange]);

  return (
    <div className="flex flex-col h-full">
      {/* Header with tabs */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-3 py-1 text-2xs font-medium rounded-sm transition-smooth whitespace-nowrap ${
              activeTab === "upload"
                ? "bg-card text-card-foreground shadow-sm"
                : "text-muted-foreground hover:text-card-foreground"
            }`}
          >
            Upload
          </button>
          <button
            onClick={() => setActiveTab("plaintext")}
            className={`px-3 py-1 text-2xs font-medium rounded-sm transition-smooth whitespace-nowrap ${
              activeTab === "plaintext"
                ? "bg-card text-card-foreground shadow-sm"
                : "text-muted-foreground hover:text-card-foreground"
            }`}
          >
            Plain Text
          </button>
          <button
            onClick={() => setActiveTab("storage")}
            className={`px-3 py-1 text-2xs font-medium rounded-sm transition-smooth whitespace-nowrap ${
              activeTab === "storage"
                ? "bg-card text-card-foreground shadow-sm"
                : "text-muted-foreground hover:text-card-foreground"
            }`}
          >
            Storage
          </button>
        </div>
        <span className="text-2xs text-muted-foreground">
          {plaintextValue.length.toLocaleString()} Characters
        </span>
      </div>

      {/* Content based on active tab */}
      <div className="flex-1 min-h-0">
        {activeTab === "upload" ? (
          <div className="h-full flex flex-col">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />

            {fileName ? (
              // Show file content with file name
              <div className="h-full flex flex-col">
                <div className="mb-2 flex items-center justify-between bg-muted rounded-lg p-3 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-2xs font-medium text-surface-foreground">{fileName}</span>
                  </div>
                  <button
                    onClick={handleClearFile}
                    className="text-2xs text-muted-foreground hover:text-surface-foreground transition-smooth"
                  >
                    Clear
                  </button>
                </div>
                <textarea
                  value={plaintextValue}
                  readOnly
                  className="flex-1 min-h-0 w-full p-4 border border-border rounded-lg
                             bg-card text-card-foreground
                             resize-none font-mono text-xs
                             scrollbar-thin"
                />
              </div>
            ) : (
              // Show upload button
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-lg
                           border border-dashed border-border bg-upload-zone
                           hover:border-border-darkest focus:border-surface-foreground focus:border-solid focus:outline-none
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-smooth"
              >
                <CloudUpload
                  className="h-icon-md w-icon-md text-muted-foreground"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <div className="text-center">
                  <p className="text-xs font-medium text-surface-foreground mb-1">
                    {loading ? "Loading..." : "Click to upload or drag and drop"}
                  </p>
                  <p className="text-2xs text-muted-foreground">
                    TXT, PDF, DOC, or DOCX (max 100MB)
                  </p>
                </div>
              </button>
            )}
          </div>
        ) : activeTab === "plaintext" ? (
          // Plain Text input
          <div className="flex h-full flex-col">
            {fileName && (
              <div className="mb-2 flex flex-shrink-0 items-center justify-between rounded-lg bg-muted p-3">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText
                    className="h-4 w-4 flex-shrink-0 text-muted-foreground"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <span className="truncate text-2xs font-medium text-surface-foreground">
                    Source: {fileName}
                  </span>
                </div>
                <button
                  onClick={handleClearFile}
                  className="flex-shrink-0 text-2xs text-muted-foreground transition-smooth hover:text-surface-foreground"
                >
                  Clear
                </button>
              </div>
            )}
            <textarea
              value={plaintextValue}
              onChange={handlePlaintextChange}
              placeholder="Type or paste your plain text here..."
              className="min-h-0 w-full flex-1 p-4 border border-border rounded-lg
                         focus-ring
                         bg-card text-card-foreground placeholder-light
                         resize-none font-mono text-xs
                         scrollbar-thin transition-smooth"
              maxLength={100000}
            />
          </div>
        ) : (
          // Storage - Parse Results list
          <div className="h-full flex flex-col border border-border rounded-lg bg-card overflow-hidden">
            {loadingResults ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <svg
                    className="animate-spin h-8 w-8 mx-auto mb-2 text-muted-foreground"
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
                  <p className="text-xs text-muted-foreground">Loading parse results...</p>
                </div>
              </div>
            ) : parseResults.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <svg
                    className="w-12 h-12 mx-auto mb-3 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                  <p className="text-xs font-medium text-surface-foreground mb-1">
                    No parse results found
                  </p>
                  <p className="text-2xs text-muted-foreground">
                    Parse documents first to see them here
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
                <div className="space-y-2">
                  {parseResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleLoadParseResult(result)}
                      className="w-full p-3 border border-border rounded-lg bg-surface
                                 hover:border-border-darkest hover:bg-muted
                                 transition-smooth text-left group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <svg
                            className="w-4 h-4 text-muted-foreground flex-shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <span className="text-xs font-medium text-surface-foreground truncate">
                            {result.file_name}
                          </span>
                        </div>
                        <svg
                          className="w-4 h-4 text-muted-foreground group-hover:text-card-foreground flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                      </div>
                      <div className="flex items-center gap-2 text-2xs text-muted-foreground">
                        <span className="px-2 py-1 bg-muted rounded-sm">
                          {result.parser_type}
                        </span>
                        <span className="px-2 py-1 bg-muted rounded-sm">
                          {(result.file_size / 1024).toFixed(1)} KB
                        </span>
                        <span>
                          {new Date(result.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(TextInput);
