"use client";

import { memo, useState, useCallback, useEffect, useRef } from "react";
import { getAuthToken } from "@/lib/auth";

interface FileItem {
  id: number;
  filename: string;
  file_size: number;
  uploaded_at: string;
}

const FilesPanel = memo(function FilesPanel() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setError("Please login first");
      setFiles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/storage/files", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch files' }));
        const errorMessage = errorData.error || "Failed to fetch files";
        setError(errorMessage);
        setFiles([]); // 에러 발생 시 빈 배열로 설정
        setLoading(false);
        return;
      }

      const data = await response.json().catch(() => ({ files: [] }));
      setFiles(data.files || []);
      setError(null); // 성공 시 에러 초기화
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch files";
      setError(errorMessage);
      setFiles([]); // 에러 발생 시 빈 배열로 설정
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (openMenuId !== null) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [openMenuId]);

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      setUploading(true);
      setError(null);

      try {
        const token = getAuthToken();
        if (!token) {
          throw new Error("Please login first");
        }

        const formData = new FormData();
        formData.append("file", selectedFile);

        const response = await fetch("/api/storage/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to upload file");
        }

        await fetchFiles();
      } catch (err) {
        console.error("Error uploading file:", err);
        setError(err instanceof Error ? err.message : "Failed to upload file");
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [fetchFiles]
  );

  const handleDelete = useCallback(
    async (filename: string) => {
      setOpenMenuId(null);
      if (!confirm("Are you sure you want to delete this file?")) {
        return;
      }

      try {
        const token = getAuthToken();
        if (!token) {
          throw new Error("Please login first");
        }

        const response = await fetch(
          `/api/storage/files?filename=${encodeURIComponent(filename)}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete file");
        }

        await fetchFiles();
      } catch (err) {
        console.error("Error deleting file:", err);
        setError(err instanceof Error ? err.message : "Failed to delete file");
      }
    },
    [fetchFiles]
  );

  const toggleMenu = useCallback((fileId: number) => {
    setOpenMenuId(prev => prev === fileId ? null : fileId);
  }, []);

  const handleDownload = useCallback(async (filename: string) => {
    setOpenMenuId(null);
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Please login to Storage first (Connect page)");
      }

      const response = await fetch(
        `/api/storage/download/${encodeURIComponent(filename)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to download file");
      }

      // Create a blob from the response and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error downloading file:", err);
      setError(err instanceof Error ? err.message : "Failed to download file");
    }
  }, []);

  const handlePreview = useCallback(async (file: FileItem) => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError("Please login to Storage first (Connect page)");
        return;
      }

      const response = await fetch(
        `/api/storage/preview?key=${encodeURIComponent(file.filename)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        // Try to get error message from response
        const errorData = await response.json().catch(() => ({ error: "Failed to load preview" }));
        setError(errorData.error || "Failed to load preview");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Open in new tab
      const newWindow = window.open(url, '_blank');

      // Clean up blob URL after a short delay
      if (newWindow) {
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 100);
      }
    } catch (err) {
      console.error("Error loading preview:", err);
      setError(err instanceof Error ? err.message : "Failed to load preview");
    }
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString("ko-KR", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredFiles = files.filter((file) =>
    file.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get current path string
  const currentPathString = currentPath.join('/');
  const currentPathPrefix = currentPathString ? currentPathString + '/' : '';

  // Get folders in current path
  const folders = [...new Set(
    filteredFiles
      .filter(f => {
        if (currentPathString) {
          return f.filename.startsWith(currentPathPrefix) && f.filename !== currentPathString;
        }
        return true;
      })
      .map(f => {
        const relativePath = currentPathString
          ? f.filename.slice(currentPathPrefix.length)
          : f.filename;
        const nextPart = relativePath.split('/')[0];
        return nextPart;
      })
      .filter(part => {
        // Filter out file names (has extension) to only get folders
        const hasMorePath = filteredFiles.some(f => {
          const relativePath = currentPathString
            ? f.filename.slice(currentPathPrefix.length)
            : f.filename;
          return relativePath.startsWith(part + '/');
        });
        return hasMorePath;
      })
  )];

  // Get files in current path (not in subfolders)
  const currentFiles = filteredFiles.filter(f => {
    const relativePath = currentPathString
      ? f.filename.slice(currentPathPrefix.length)
      : f.filename;
    // File is in current directory if it doesn't contain '/'
    return relativePath && !relativePath.includes('/');
  }).map(file => ({
    ...file,
    displayName: currentPathString
      ? file.filename.slice(currentPathPrefix.length)
      : file.filename
  }));

  return (
    <div className="h-full flex flex-col bg-surface">
      {/* Header */}
      <div className="border-b border-border bg-card px-10 py-3">
        {/* Single Row: Breadcrumb, Search, Actions */}
        <div className="grid grid-cols-3 gap-6 items-center">
          {/* Left: Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-sm">
            <button
              onClick={() => setCurrentPath([])}
              className="text-muted-foreground hover:text-card-foreground transition-smooth"
            >
              Home
            </button>
            {currentPath.map((folder, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <button
                  onClick={() => setCurrentPath(currentPath.slice(0, idx + 1))}
                  className="text-card-foreground hover:text-accent transition-smooth font-medium"
                >
                  {folder}
                </button>
              </div>
            ))}
          </nav>

          {/* Center: Search Input */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full h-9 pl-9 pr-9 text-sm bg-surface border border-border rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                       placeholder-light text-card-foreground transition-smooth"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-card-foreground rounded transition-smooth"
                title="Clear search"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={fetchFiles}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-card-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-smooth"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              )}
              <span>Refresh</span>
            </button>
            <button
              onClick={handleFileSelect}
              disabled={uploading}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-card-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-smooth"
            >
              {uploading ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L9 8m3-4v12"
                  />
                </svg>
              )}
              <span>Upload</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-10 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <svg
                className="h-5 w-5 text-red-400 flex-shrink-0"
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
              <div className="flex-1">
                <p className="text-sm text-red-800 dark:text-red-200 font-medium">{error}</p>
                {error.includes("Storage service error") && (
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                    The storage service is experiencing issues. Please contact the administrator or try again later.
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  setError(null);
                  fetchFiles();
                }}
                className="px-3 py-1.5 text-xs font-medium text-red-800 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-smooth"
              >
                Retry
              </button>
              <button
                onClick={() => setError(null)}
                className="text-red-800 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-10 py-6 overflow-auto">
        {loading && files.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96">
            <svg
              className="h-12 w-12 text-muted-foreground mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            <p className="text-sm text-muted-foreground mb-2">No files uploaded yet</p>
            <button
              onClick={handleFileSelect}
              className="text-sm text-accent hover:text-accent/80 transition-smooth"
            >
              Upload your first file
            </button>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96">
            <svg
              className="h-12 w-12 text-muted-foreground mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p className="text-sm text-muted-foreground mb-2">No files found</p>
            <p className="text-xs text-muted-foreground">Try adjusting your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Folder Cards */}
            {folders.map((folder) => (
              <div
                key={folder}
                onClick={() => setCurrentPath([...currentPath, folder])}
                className="bg-card border border-border rounded-lg p-4 hover:bg-accent/5 hover:shadow-md hover:border-accent/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  {/* Folder Icon */}
                  <div className="flex-shrink-0 w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-accent"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      />
                    </svg>
                  </div>

                  {/* Folder Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-card-foreground truncate" title={folder}>
                      {folder}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Folder</p>
                  </div>

                  {/* Arrow Icon */}
                  <div className="flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-smooth"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}

            {/* File Cards */}
            {currentFiles.map((file) => (
              <div
                key={file.id}
                onClick={() => handlePreview(file)}
                className="bg-card border border-border rounded-lg p-4 hover:bg-muted hover:shadow-md hover:border-accent/50 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {/* File Icon */}
                  <div className="flex-shrink-0 w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-accent"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                  </div>

                  {/* File Info */}
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-sm font-medium text-card-foreground truncate"
                      title={file.filename}
                    >
                      {file.displayName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatFileSize(file.file_size)}
                    </p>
                  </div>

                  {/* More Button */}
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMenu(file.id);
                      }}
                      className="p-2 text-muted-foreground hover:text-card-foreground hover:bg-muted rounded-lg transition-smooth"
                      title="More options"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {openMenuId === file.id && (
                      <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-10">
                        <button
                          onClick={() => handleDownload(file.filename)}
                          className="w-full px-4 py-2.5 text-left text-sm text-card-foreground hover:bg-muted transition-smooth flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </button>
                        <button
                          onClick={() => handleDelete(file.filename)}
                          className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-smooth flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

FilesPanel.displayName = "FilesPanel";
export default FilesPanel;
