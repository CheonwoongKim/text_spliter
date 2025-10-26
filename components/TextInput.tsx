"use client";

import { useRef, useState, useCallback, memo } from "react";
import { readFile, isValidFileType } from "@/lib/fileReader";
import { InputMode } from "@/lib/types";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
}

function TextInput({ value, onChange }: TextInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<InputMode>("upload");
  const [fileName, setFileName] = useState<string>("");
  const [plaintextValue, setPlaintextValue] = useState<string>("");

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
  }, [onChange]);

  const handlePlaintextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setPlaintextValue(val);
    onChange(val);
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
        ) : (
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
        )}
      </div>
    </div>
  );
}

export default memo(TextInput);
