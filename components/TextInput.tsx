"use client";

import { useRef, useState, useCallback, memo, useEffect } from "react";
import { readFile, isValidFileType } from "@/lib/fileReader";
import { InputMode, SourceMetadata } from "@/lib/types";
import { authFetch } from "@/lib/auth";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSourceMetadataChange?: (metadata: SourceMetadata | null) => void;
}

interface ParseResult {
  id: number;
  file_name: string;
  parser_type: string;
  file_size: number;
  mime_type: string;
  processing_time: number | null;
  created_at: string;
}

interface ParseResultDetail {
  id: number;
  user_email: string;
  parser_type: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  text_content: string | null;
  html_content: string | null;
  markdown_content: string | null;
  json_content: any | null;
  processing_time: number | null;
  created_at: string;
}

function TextInput({ value, onChange, onSourceMetadataChange }: TextInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<InputMode>("upload");
  const [fileName, setFileName] = useState<string>("");
  const [plaintextValue, setPlaintextValue] = useState<string>("");
  const [parseResults, setParseResults] = useState<ParseResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

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

  // Fetch parse results when Storage tab is active
  useEffect(() => {
    if (activeTab === "storage") {
      fetchParseResults();
    }
  }, [activeTab]);

  const fetchParseResults = async () => {
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
  };

  const handleLoadParseResult = useCallback(async (result: ParseResult) => {
    setLoading(true);
    try {
      // Fetch full parse result details by ID
      const response = await authFetch(`/api/parse-results?id=${result.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch parse result details");
      }

      const detail: ParseResultDetail = await response.json();
      console.log('[TextInput] Parse result detail:', detail);
      console.log('[TextInput] Parser type:', detail.parser_type);
      console.log('[TextInput] Has text_content:', !!detail.text_content);
      console.log('[TextInput] Has markdown_content:', !!detail.markdown_content);
      console.log('[TextInput] Has html_content:', !!detail.html_content);
      console.log('[TextInput] Has json_content:', !!detail.json_content);

      let textContent = "";

      // Try to extract text from the parsed result
      // Priority: text_content > markdown_content > html_content > json_content
      if (detail.text_content) {
        console.log('[TextInput] Using text_content');
        console.log('[TextInput] text_content preview:', detail.text_content.substring(0, 200));

        // Check if text_content is actually a JSON string
        if (detail.text_content.trim().startsWith('{') || detail.text_content.trim().startsWith('[')) {
          console.log('[TextInput] text_content looks like JSON, parsing it...');
          try {
            const jsonData = JSON.parse(detail.text_content);

            // Extract text based on parser type
            if (detail.parser_type === "LlamaIndex" && jsonData.pages && Array.isArray(jsonData.pages)) {
              console.log('[TextInput] Extracting from LlamaIndex JSON in text_content');
              const hasMarkdown = jsonData.pages.some((page: any) => page.md);
              if (hasMarkdown) {
                textContent = jsonData.pages
                  .map((page: any) => page.md || "")
                  .filter((md: string) => md.trim())
                  .join("\n\n");
              } else {
                textContent = jsonData.pages
                  .map((page: any) => page.text || "")
                  .filter((text: string) => text.trim())
                  .join("\n\n");
              }
            } else {
              // For other formats, use as-is
              textContent = detail.text_content;
            }
          } catch (e) {
            console.log('[TextInput] Failed to parse as JSON, using as-is');
            textContent = detail.text_content;
          }
        } else {
          textContent = detail.text_content;
        }
      } else if (detail.markdown_content) {
        console.log('[TextInput] Using markdown_content');
        textContent = detail.markdown_content;
      } else if (detail.html_content) {
        console.log('[TextInput] Using html_content');
        textContent = detail.html_content;
      } else if (detail.json_content) {
        console.log('[TextInput] Using json_content');
        // If json_content exists, extract text based on parser type
        const jsonData = typeof detail.json_content === "string"
          ? JSON.parse(detail.json_content)
          : detail.json_content;

        if (!jsonData) {
          alert("No content found in parse result");
          return;
        }

        // Parser-specific JSON extraction
        console.log('[TextInput] JSON data:', jsonData);

        if (detail.parser_type === "LlamaIndex") {
          console.log('[TextInput] Extracting from LlamaIndex JSON');
          // LlamaIndex: Extract text from pages array
          // Structure: { pages: [{ text, md, ... }], job_metadata: {...} }
          if (jsonData.pages && Array.isArray(jsonData.pages)) {
            console.log('[TextInput] Found pages array, length:', jsonData.pages.length);
            // Prefer markdown over text
            const hasMarkdown = jsonData.pages.some((page: any) => page.md);
            console.log('[TextInput] Has markdown:', hasMarkdown);

            if (hasMarkdown) {
              textContent = jsonData.pages
                .map((page: any) => page.md || "")
                .filter((md: string) => md.trim())
                .join("\n\n");
            } else {
              textContent = jsonData.pages
                .map((page: any) => page.text || "")
                .filter((text: string) => text.trim())
                .join("\n\n");
            }
            console.log('[TextInput] Extracted text length:', textContent.length);
          } else {
            console.log('[TextInput] No pages array found, using JSON stringify');
            textContent = JSON.stringify(jsonData, null, 2);
          }
        } else if (detail.parser_type === "Google") {
          console.log('[TextInput] Extracting from Google JSON');
          // Google: Extract text from document.text field
          if (jsonData.document && jsonData.document.text) {
            textContent = jsonData.document.text;
          } else if (jsonData.text) {
            textContent = jsonData.text;
          } else {
            textContent = JSON.stringify(jsonData, null, 2);
          }
        } else {
          // Other parsers: Try common fields or stringify
          if (jsonData.text) {
            textContent = jsonData.text;
          } else if (jsonData.markdown) {
            textContent = jsonData.markdown;
          } else if (jsonData.html) {
            textContent = jsonData.html;
          } else if (jsonData.content) {
            textContent = jsonData.content;
          } else {
            textContent = JSON.stringify(jsonData, null, 2);
          }
        }
      } else {
        alert("No content found in parse result");
        return;
      }

      if (!textContent || textContent.trim() === "") {
        alert("No text content extracted from parse result");
        return;
      }

      // Create source metadata to pass to parent
      const sourceMetadata: SourceMetadata = {
        fileName: detail.file_name,
        parserType: detail.parser_type,
        originalJson: detail.json_content ?
          (typeof detail.json_content === "string" ? JSON.parse(detail.json_content) : detail.json_content)
          : undefined,
      };

      setPlaintextValue(textContent);
      onChange(textContent);
      setFileName(result.file_name);

      // Pass source metadata to parent component
      if (onSourceMetadataChange) {
        onSourceMetadataChange(sourceMetadata);
      }

      setActiveTab("plaintext"); // Switch to plaintext tab to show the loaded content
    } catch (error) {
      console.error("Error loading parse result:", error);
      alert("Failed to load parse result");
    } finally {
      setLoading(false);
    }
  }, [onChange]);

  return (
    <div className="flex flex-col h-full">
      {/* Header with tabs */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-3 py-1 text-xs font-medium rounded transition-smooth whitespace-nowrap ${
              activeTab === "upload"
                ? "bg-card text-card-foreground shadow-sm"
                : "text-muted-foreground hover:text-card-foreground"
            }`}
          >
            Upload
          </button>
          <button
            onClick={() => setActiveTab("plaintext")}
            className={`px-3 py-1 text-xs font-medium rounded transition-smooth whitespace-nowrap ${
              activeTab === "plaintext"
                ? "bg-card text-card-foreground shadow-sm"
                : "text-muted-foreground hover:text-card-foreground"
            }`}
          >
            Plain Text
          </button>
          <button
            onClick={() => setActiveTab("storage")}
            className={`px-3 py-1 text-xs font-medium rounded transition-smooth whitespace-nowrap ${
              activeTab === "storage"
                ? "bg-card text-card-foreground shadow-sm"
                : "text-muted-foreground hover:text-card-foreground"
            }`}
          >
            Storage
          </button>
        </div>
        <span className="text-xs text-muted-foreground">
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
                    <span className="text-xs font-medium text-surface-foreground">{fileName}</span>
                  </div>
                  <button
                    onClick={handleClearFile}
                    className="text-xs text-muted-foreground hover:text-surface-foreground transition-smooth"
                  >
                    Clear
                  </button>
                </div>
                <textarea
                  value={plaintextValue}
                  readOnly
                  className="flex-1 min-h-0 w-full p-4 border border-border rounded-lg
                             bg-card text-card-foreground
                             resize-none font-mono text-sm
                             scrollbar-thin"
                />
              </div>
            ) : (
              // Show upload button
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="w-full h-full border-2 border-dashed border-border rounded-lg
                           hover:border-accent hover:bg-accent/5
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-smooth flex flex-col items-center justify-center gap-3"
              >
                <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div className="text-center">
                  <p className="text-sm font-medium text-surface-foreground mb-1">
                    {loading ? "Loading..." : "Click to upload or drag and drop"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    TXT, PDF, DOC, or DOCX (max 100MB)
                  </p>
                </div>
              </button>
            )}
          </div>
        ) : activeTab === "plaintext" ? (
          // Plain Text input
          <textarea
            value={plaintextValue}
            onChange={handlePlaintextChange}
            placeholder="Type or paste your plain text here..."
            className="w-full h-full p-4 border border-border rounded-lg
                       focus-ring
                       bg-card text-card-foreground placeholder-light
                       resize-none font-mono text-sm
                       scrollbar-thin transition-smooth"
            maxLength={100000}
          />
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
                  <p className="text-sm text-muted-foreground">Loading parse results...</p>
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
                  <p className="text-sm font-medium text-surface-foreground mb-1">
                    No parse results found
                  </p>
                  <p className="text-xs text-muted-foreground">
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
                                 hover:border-accent hover:bg-accent/5
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
                          <span className="text-sm font-medium text-surface-foreground truncate">
                            {result.file_name}
                          </span>
                        </div>
                        <svg
                          className="w-4 h-4 text-muted-foreground group-hover:text-accent flex-shrink-0"
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
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="px-2 py-0.5 bg-muted rounded">
                          {result.parser_type}
                        </span>
                        <span className="px-2 py-0.5 bg-muted rounded">
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
