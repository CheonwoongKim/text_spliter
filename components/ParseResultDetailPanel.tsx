"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch, handleUnauthorized } from "@/lib/auth";
import JsonView from "@uiw/react-json-view";
import { darkTheme } from "@uiw/react-json-view/dark";

interface ParseResultDetailPanelProps {
  resultId: number;
  onBack: () => void;
}

interface ParseResultDetail {
  id: number;
  user_email: string;
  parser_type: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  file_storage_key: string | null;
  text_content: string | null;
  html_content: string | null;
  markdown_content: string | null;
  json_content: any | null;
  processing_time: number | null;
  created_at: string;
}

export default function ParseResultDetailPanel({
  resultId,
  onBack,
}: ParseResultDetailPanelProps) {
  const [result, setResult] = useState<ParseResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedContent, setEditedContent] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // For JSON with pages (LlamaParse)
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [pageEditMode, setPageEditMode] = useState<"text" | "markdown">("text");

  useEffect(() => {
    fetchParseResult();
  }, [resultId]);

  useEffect(() => {
    // Load preview if storage key exists
    if (result?.file_storage_key) {
      loadPreview(result.file_storage_key);
    }

    // Cleanup: revoke object URL when component unmounts or result changes
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [result?.file_storage_key]);

  const loadPreview = async (storageKey: string) => {
    setPreviewLoading(true);
    try {
      const response = await authFetch(`/api/storage/preview?key=${encodeURIComponent(storageKey)}`);

      if (!response.ok) {
        console.error('Failed to load preview:', response.status);
        setPreviewLoading(false);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (error) {
      console.error('Error loading preview:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const fetchParseResult = async () => {
    setLoading(true);
    try {
      const response = await authFetch(`/api/parse-results?id=${resultId}`);

      if (!response.ok) {
        if (response.status === 401) {
          handleUnauthorized();
          return;
        }
        throw new Error("Failed to fetch parse result");
      }

      const data: ParseResultDetail = await response.json();
      setResult(data);

      // Initialize edited content - prioritize JSON with pages for LlamaParse
      if (data.json_content) {
        const jsonData = typeof data.json_content === "string"
          ? JSON.parse(data.json_content)
          : data.json_content;
        setEditedContent(jsonData);
      } else if (data.markdown_content) {
        setEditedContent(data.markdown_content);
      } else if (data.text_content) {
        setEditedContent(data.text_content);
      } else if (data.html_content) {
        setEditedContent(data.html_content);
      }
    } catch (error) {
      console.error("Error fetching parse result:", error);
      alert("Failed to load parse result");
    } finally {
      setLoading(false);
    }
  };

  const handlePageTextChange = (pageIndex: number, field: "text" | "md", value: string) => {
    if (!editedContent?.pages) return;

    const updatedContent = { ...editedContent };
    updatedContent.pages[pageIndex][field] = value;
    setEditedContent(updatedContent);
  };

  const handleSave = async () => {
    if (!result) return;

    setSaving(true);
    try {
      const updateData: any = {
        id: result.id,
      };

      // Determine content type and update appropriate field
      if (result.json_content) {
        // If original was JSON, save as JSON
        updateData.json_content = JSON.stringify(editedContent);
      } else if (result.markdown_content) {
        updateData.markdown_content = editedContent;
      } else if (result.text_content) {
        updateData.text_content = editedContent;
      } else if (result.html_content) {
        updateData.html_content = editedContent;
      }

      const response = await authFetch("/api/parse-results", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error("Failed to update parse result");
      }

      alert("Parse result updated successfully!");
      fetchParseResult(); // Refresh data
    } catch (error) {
      console.error("Error saving parse result:", error);
      alert("Failed to save parse result");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-8 w-8 mx-auto mb-2 text-accent"
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
          <p className="text-sm text-muted-foreground">Loading parse result...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Parse result not found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-muted-foreground hover:text-surface-foreground transition-smooth"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-base font-semibold text-surface-foreground">{result.file_name}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Parser: {result.parser_type} • {(result.file_size / 1024).toFixed(1)} KB • {new Date(result.created_at).toLocaleString()}
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium bg-muted text-surface-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-smooth rounded-md"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Content Grid */}
      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
        {/* Left Panel - Original File Viewer */}
        <div className="flex flex-col border border-border rounded-lg overflow-hidden bg-card">
          <div className="flex-1 overflow-auto bg-muted/50">
            {previewLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <svg
                    className="animate-spin h-8 w-8 mx-auto mb-2 text-accent"
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
                  <p className="text-sm text-muted-foreground">Loading preview...</p>
                </div>
              </div>
            ) : previewUrl ? (
              <div className="h-full">
                {result.mime_type.startsWith('application/pdf') ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full"
                    title="PDF Preview"
                  />
                ) : result.mime_type.startsWith('image/') ? (
                  <div className="h-full flex items-center justify-center p-4">
                    <img
                      src={previewUrl}
                      alt={result.file_name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center p-8">
                    <div className="text-center">
                      <svg className="w-16 h-16 mx-auto mb-4 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M13,9V3.5L18.5,9M6,2C4.89,2 4,2.89 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6Z" />
                      </svg>
                      <p className="text-sm text-muted-foreground">
                        Preview not available for this file type
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8">
                <div className="text-center max-w-sm">
                  {/* File Icon based on mime type */}
                  {result.mime_type.startsWith('application/pdf') ? (
                    <svg className="w-20 h-20 mx-auto mb-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18.5,9H13V3.5L18.5,9M6,20V4H12V10H18V20H6Z" />
                    </svg>
                  ) : result.mime_type.startsWith('image/') ? (
                    <svg className="w-20 h-20 mx-auto mb-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z" />
                    </svg>
                  ) : (
                    <svg className="w-20 h-20 mx-auto mb-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13,9V3.5L18.5,9M6,2C4.89,2 4,2.89 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6Z" />
                    </svg>
                  )}

                  {/* File Information */}
                  <h4 className="text-lg font-semibold text-surface-foreground mb-2">
                    {result.file_name}
                  </h4>
                  <div className="space-y-1 text-sm text-muted-foreground mb-4">
                    <p>Type: {result.mime_type}</p>
                    <p>Size: {(result.file_size / 1024).toFixed(2)} KB</p>
                    <p>Parser: {result.parser_type}</p>
                    {result.processing_time && (
                      <p>Processing time: {result.processing_time}ms</p>
                    )}
                  </div>

                  {/* Info Message */}
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
                      </svg>
                      <div className="flex-1 text-left">
                        <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                          Original file preview unavailable
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                          The original file was not saved during parsing. Only the parsed content is available for editing.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Editable Parse Results */}
        <div className="flex flex-col border border-border rounded-lg overflow-hidden bg-card">
          <div className="flex-1 overflow-auto p-4">
            {editedContent?.pages && Array.isArray(editedContent.pages) ? (
                // Page-by-page editor for LlamaParse results
                <div className="h-full flex flex-col gap-4">
                  {/* Page selector */}
                  <div className="flex items-center gap-4 pb-4 border-b border-border">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-surface-foreground">Page:</label>
                      <select
                        value={selectedPageIndex}
                        onChange={(e) => setSelectedPageIndex(Number(e.target.value))}
                        className="px-3 py-1.5 bg-surface border border-border rounded-md text-sm text-surface-foreground focus-ring"
                      >
                        {editedContent.pages.map((page: any, index: number) => (
                          <option key={index} value={index}>
                            Page {page.page || index + 1}
                          </option>
                        ))}
                      </select>
                      <span className="text-xs text-muted-foreground">
                        of {editedContent.pages.length}
                      </span>
                    </div>
                    <div className="flex gap-1 bg-muted rounded-lg p-1 ml-auto">
                      <button
                        onClick={() => setPageEditMode("text")}
                        className={`px-3 py-1 text-xs font-medium rounded transition-smooth ${
                          pageEditMode === "text"
                            ? "bg-card text-card-foreground shadow-sm"
                            : "text-muted-foreground hover:text-card-foreground"
                        }`}
                      >
                        Text
                      </button>
                      <button
                        onClick={() => setPageEditMode("markdown")}
                        className={`px-3 py-1 text-xs font-medium rounded transition-smooth ${
                          pageEditMode === "markdown"
                            ? "bg-card text-card-foreground shadow-sm"
                            : "text-muted-foreground hover:text-card-foreground"
                        }`}
                      >
                        Markdown
                      </button>
                    </div>
                  </div>

                  {/* Page content editor */}
                  <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="mb-2">
                      <p className="text-xs text-muted-foreground">
                        Editing {pageEditMode === "text" ? "text" : "markdown"} content for page {editedContent.pages[selectedPageIndex]?.page || selectedPageIndex + 1}
                      </p>
                    </div>
                    <textarea
                      value={
                        pageEditMode === "text"
                          ? editedContent.pages[selectedPageIndex]?.text || ""
                          : editedContent.pages[selectedPageIndex]?.md || ""
                      }
                      onChange={(e) =>
                        handlePageTextChange(
                          selectedPageIndex,
                          pageEditMode === "text" ? "text" : "md",
                          e.target.value
                        )
                      }
                      className="flex-1 w-full p-4 bg-muted border border-border rounded-lg resize-none font-mono text-sm text-surface-foreground focus-ring"
                      placeholder="Edit page content here..."
                    />
                  </div>
                </div>
              ) : (
                // Simple text editor for non-LlamaParse results (text, markdown, html, or JSON without pages)
                <textarea
                  value={typeof editedContent === 'string' ? editedContent : JSON.stringify(editedContent, null, 2)}
                  onChange={(e) => {
                    // Try to parse as JSON if original was JSON, otherwise keep as string
                    if (result.json_content) {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setEditedContent(parsed);
                      } catch {
                        // Keep as string if invalid JSON
                        setEditedContent(e.target.value);
                      }
                    } else {
                      setEditedContent(e.target.value);
                    }
                  }}
                  className="w-full h-full p-4 bg-muted border border-border rounded-lg resize-none font-mono text-sm text-surface-foreground focus-ring"
                  placeholder="Edit content here..."
                />
              )
            }
          </div>
        </div>
      </div>
    </div>
  );
}
