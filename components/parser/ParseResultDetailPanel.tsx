"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch, handleUnauthorized } from "@/lib/auth";
import { JSON_VIEW_THEME } from "@/lib/json-view-theme";
import JsonView from "@uiw/react-json-view";

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

  // View mode for switching between different output formats
  const [viewMode, setViewMode] = useState<"text" | "html" | "markdown" | "json">("text");

  const fetchParseResult = useCallback(async () => {
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

      // Determine the default view mode based on available content
      if (data.json_content) {
        const jsonData = typeof data.json_content === "string"
          ? JSON.parse(data.json_content)
          : data.json_content;
        setEditedContent(jsonData);
        setViewMode("json");
      } else if (data.markdown_content) {
        setEditedContent(data.markdown_content);
        setViewMode("markdown");
      } else if (data.html_content) {
        setEditedContent(data.html_content);
        setViewMode("html");
      } else if (data.text_content) {
        setEditedContent(data.text_content);
        setViewMode("text");
      }
    } catch (error) {
      console.error("Error fetching parse result:", error);
      alert("Failed to load parse result");
    } finally {
      setLoading(false);
    }
  }, [resultId]);

  useEffect(() => {
    void fetchParseResult();
  }, [fetchParseResult]);

  useEffect(() => {
    const storageKey = result?.file_storage_key;
    let disposed = false;
    let objectUrl: string | null = null;

    const loadPreview = async () => {
      if (!storageKey) {
        setPreviewUrl(null);
        return;
      }

      setPreviewLoading(true);
      try {
        const response = await authFetch(
          `/api/storage/preview?key=${encodeURIComponent(storageKey)}`,
        );

        if (!response.ok) {
          console.error("Failed to load preview:", response.status);
          return;
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!disposed) {
          setPreviewUrl(objectUrl);
        }
      } catch (error) {
        console.error("Error loading preview:", error);
      } finally {
        if (!disposed) {
          setPreviewLoading(false);
        }
      }
    };

    void loadPreview();

    return () => {
      disposed = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [result?.file_storage_key]);

  const handleViewModeChange = useCallback((newMode: "text" | "html" | "markdown" | "json") => {
    if (!result) return;

    setViewMode(newMode);

    // Load the content for the selected view mode
    if (newMode === "json" && result.json_content) {
      const jsonData = typeof result.json_content === "string"
        ? JSON.parse(result.json_content)
        : result.json_content;
      setEditedContent(jsonData);
    } else if (newMode === "markdown" && result.markdown_content) {
      setEditedContent(result.markdown_content);
    } else if (newMode === "html" && result.html_content) {
      setEditedContent(result.html_content);
    } else if (newMode === "text" && result.text_content) {
      setEditedContent(result.text_content);
    } else {
      // No content available for this mode
      setEditedContent("");
    }
  }, [result]);

  const handleSave = async () => {
    if (!result) return;

    setSaving(true);
    try {
      const updateData: any = {
        id: result.id,
      };

      // Update the specific field based on current view mode
      if (viewMode === "json") {
        updateData.json_content = JSON.stringify(editedContent);
      } else if (viewMode === "markdown") {
        updateData.markdown_content = editedContent;
      } else if (viewMode === "html") {
        updateData.html_content = editedContent;
      } else if (viewMode === "text") {
        updateData.text_content = editedContent;
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
            className="animate-spin h-8 w-8 mx-auto mb-2 text-card-foreground"
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
          <p className="text-xs text-muted-foreground">Loading parse result...</p>
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
            <h2 className="text-xs font-semibold text-surface-foreground">{result.file_name}</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Parser: {result.parser_type} • {(result.file_size / 1024).toFixed(1)} KB • {new Date(result.created_at).toLocaleString()}
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-xs font-medium bg-muted text-surface-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-smooth rounded-lg"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Content Grid */}
      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
        {/* Left Panel - Original File Viewer */}
        <div className="flex flex-col border border-border rounded-lg overflow-hidden bg-card">
          <div className="flex-1 overflow-auto bg-upload-zone">
            {previewLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <svg
                    className="animate-spin h-8 w-8 mx-auto mb-2 text-card-foreground"
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
                  <p className="text-xs text-muted-foreground">Loading preview...</p>
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
                      <p className="text-xs text-muted-foreground">
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
                    <svg className="w-20 h-20 mx-auto mb-4 text-danger" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18.5,9H13V3.5L18.5,9M6,20V4H12V10H18V20H6Z" />
                    </svg>
                  ) : result.mime_type.startsWith('image/') ? (
                    <svg className="w-20 h-20 mx-auto mb-4 text-card-foreground" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z" />
                    </svg>
                  ) : (
                    <svg className="w-20 h-20 mx-auto mb-4 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13,9V3.5L18.5,9M6,2C4.89,2 4,2.89 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6Z" />
                    </svg>
                  )}

                  {/* File Information */}
                  <h3 className="text-xs font-semibold text-surface-foreground mb-2">
                    {result.file_name}
                  </h3>
                  <div className="space-y-1 text-xs text-muted-foreground mb-4">
                    <p>Type: {result.mime_type}</p>
                    <p>Size: {(result.file_size / 1024).toFixed(2)} KB</p>
                    <p>Parser: {result.parser_type}</p>
                    {result.processing_time && (
                      <p>Processing time: {result.processing_time}ms</p>
                    )}
                  </div>

                  {/* Info Message */}
                  <div className="bg-warning-surface border border-warning-border rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-warning flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
                      </svg>
                      <div className="flex-1 text-left">
                        <p className="text-xs font-medium text-warning">
                          Original file preview unavailable
                        </p>
                        <p className="text-xs text-warning mt-1">
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
          {/* Format Selector Tabs */}
          <div className="flex items-center gap-1 bg-muted border-b border-border p-2">
            {result.text_content && (
              <button
                onClick={() => handleViewModeChange("text")}
                className={`px-3 py-2 text-xs font-medium rounded-sm transition-smooth ${
                  viewMode === "text"
                    ? "bg-card text-card-foreground shadow-sm"
                    : "text-muted-foreground hover:text-card-foreground"
                }`}
              >
                Text
              </button>
            )}
            {result.html_content && (
              <button
                onClick={() => handleViewModeChange("html")}
                className={`px-3 py-2 text-xs font-medium rounded-sm transition-smooth ${
                  viewMode === "html"
                    ? "bg-card text-card-foreground shadow-sm"
                    : "text-muted-foreground hover:text-card-foreground"
                }`}
              >
                HTML
              </button>
            )}
            {result.markdown_content && (
              <button
                onClick={() => handleViewModeChange("markdown")}
                className={`px-3 py-2 text-xs font-medium rounded-sm transition-smooth ${
                  viewMode === "markdown"
                    ? "bg-card text-card-foreground shadow-sm"
                    : "text-muted-foreground hover:text-card-foreground"
                }`}
              >
                Markdown
              </button>
            )}
            {result.json_content && (
              <button
                onClick={() => handleViewModeChange("json")}
                className={`px-3 py-2 text-xs font-medium rounded-sm transition-smooth ${
                  viewMode === "json"
                    ? "bg-card text-card-foreground shadow-sm"
                    : "text-muted-foreground hover:text-card-foreground"
                }`}
              >
                JSON
              </button>
            )}
          </div>
          <div className="flex-1 overflow-auto p-4">
            {viewMode === "json" && typeof editedContent === 'object' ? (
              // JSON viewer with syntax highlighting
              <div className="h-full overflow-auto">
                <JsonView value={editedContent} style={JSON_VIEW_THEME} />
              </div>
            ) : (
              // Simple text editor for text, markdown, html formats
              <textarea
                value={typeof editedContent === 'string' ? editedContent : JSON.stringify(editedContent, null, 2)}
                onChange={(e) => {
                  // Try to parse as JSON if viewing JSON mode, otherwise keep as string
                  if (viewMode === "json") {
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
                className="w-full h-full p-4 bg-muted border border-control rounded-lg resize-none font-mono text-xs text-surface-foreground focus-ring"
                placeholder="Edit content here..."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
