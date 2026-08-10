"use client";

import { memo, useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/shared/Button";
import { Download, FileText, Folder, Trash2 } from "lucide-react";
import PagePanel from "@/components/shared/PagePanel";
import PanelPlaceholder from "@/components/shared/PanelPlaceholder";
import { getAuthToken, handleUnauthorized } from "@/lib/auth";

interface FileItem {
  id: string;
  filename: string;
  storage_key: string;
  file_size: number;
  uploaded_at: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round(bytes / Math.pow(k, index) * 100) / 100} ${sizes[index]}`;
}

function formatUploadDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fileType(filename: string): string {
  const extension = filename.split(".").pop();
  return extension && extension !== filename ? extension.toUpperCase() : "파일";
}

const FilesPanel = memo(function FilesPanel() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

      // Handle 401 Unauthorized - token expired
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

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

  const handleDownload = useCallback(async (storageKey: string, filename: string) => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Please login to Storage first (Connections page)");
      }

      const response = await fetch(
        `/api/storage/download/${encodeURIComponent(storageKey)}`,
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
        setError("Please login to Storage first (Connections page)");
        return;
      }

      const response = await fetch(
        `/api/storage/preview?key=${encodeURIComponent(file.storage_key)}`,
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
  // A stored file must never disappear from the list. If its name cannot be
  // recovered it is shown under its storage key rather than filtered out, so
  // the row stays reachable for preview and deletion.
  const currentFiles = filteredFiles.filter(f => {
    const relativePath = currentPathString
      ? f.filename.slice(currentPathPrefix.length)
      : f.filename;
    return !relativePath.includes('/');
  }).map(file => {
    const relativePath = currentPathString
      ? file.filename.slice(currentPathPrefix.length)
      : file.filename;
    return {
      ...file,
      displayName: relativePath || file.storage_key.split('/').pop() || "(이름 없는 파일)",
    };
  });

  return (
    <PagePanel
      toolbar={<>
        {/* Single Row: Breadcrumb, Search, Actions */}
        <div className="grid grid-cols-1 items-center gap-3 lg:grid-cols-3 lg:gap-6">
          {/* Left: Breadcrumb Navigation */}
          {/* A folder path, not the app's location. The icon and the slashes
              keep it from reading as a second copy of the top bar breadcrumb. */}
          <nav className="flex min-w-0 items-center gap-1" aria-label="폴더 경로">
            <Folder
              className="mr-1 h-4 w-4 shrink-0 text-muted-foreground"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <Button variant="ghost" size="sm" className="px-1 font-mono" onClick={() => setCurrentPath([])}>
              /
            </Button>
            {currentPath.map((folder, idx) => (
              <div key={idx} className="flex min-w-0 items-center gap-1">
                <span className="shrink-0 font-mono text-2xs text-muted-foreground" aria-hidden="true">/</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-w-0 px-1"
                  onClick={() => setCurrentPath(currentPath.slice(0, idx + 1))}
                  aria-current={idx === currentPath.length - 1 ? "location" : undefined}
                >
                  <span className="truncate">{folder}</span>
                </Button>
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
              className="w-full h-control-md pl-10 pr-10 text-xs bg-surface border border-border rounded-lg
                       focus-ring
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
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-card-foreground rounded-sm transition-smooth"
                title="검색어 지우기"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3 justify-end">
            <Button variant="ghost" size="md" onClick={fetchFiles} disabled={loading}>
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
              <span>새로고침</span>
            </Button>
            <Button variant="primary" size="md" onClick={handleFileSelect} disabled={uploading}>
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
              <span>업로드</span>
            </Button>
          </div>
        </div>
      </>}
      bodyScroll="hidden"
      bleed
    >


      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Error Banner */}
      {error && (
        <div className="bg-danger-surface border-b border-danger-border px-10 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <svg
                className="h-5 w-5 text-danger flex-shrink-0"
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
                <p className="text-xs text-danger font-medium">{error}</p>
                {error.includes("Storage service error") && (
                  <p className="text-2xs text-danger mt-1">
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
                className="px-3 py-2 text-2xs font-medium text-danger hover:bg-danger-surface rounded-sm transition-smooth"
              >
                다시 시도
              </button>
              <button
                onClick={() => setError(null)}
                className="text-danger hover:text-danger/80"
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
      <div className="flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-10">
        {loading && files.length === 0 ? (
          <PanelPlaceholder loading title="문서를 불러오는 중" />
        ) : (
          <div className="min-w-[720px] overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full table-fixed">
              <thead className="sticky top-0 z-navigation border-b border-border bg-muted">
                <tr>
                  <th className="w-auto px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                    이름
                  </th>
                  <th className="w-28 px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                    유형
                  </th>
                  <th className="w-28 px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                    크기
                  </th>
                  <th className="w-48 px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                    업로드 일시
                  </th>
                  <th className="w-28 px-4 py-3 text-center text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                    동작
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {folders.length === 0 && currentFiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center">
                      <Folder
                        className="mx-auto mb-3 h-icon-md w-icon-md text-muted-foreground"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      <p className="text-xs font-medium text-card-foreground">
                        {files.length === 0 ? "아직 올린 문서가 없습니다" : "검색 결과가 없습니다"}
                      </p>
                      <p className="mt-1 text-2xs text-muted-foreground">
                        {files.length === 0
                          ? "문서를 올리면 파싱·청킹 실험의 원본으로 사용할 수 있습니다."
                          : "검색어를 바꾸거나 상위 폴더로 이동해 보세요."}
                      </p>
                      {files.length === 0 && (
                        <Button variant="primary" size="sm" className="mt-4" onClick={handleFileSelect}>
                          문서 올리기
                        </Button>
                      )}
                    </td>
                  </tr>
                ) : (
                  <>
                    {folders.map((folder) => (
                      <tr key={`folder-${folder}`} className="transition-smooth hover:bg-muted">
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="max-w-full justify-start px-0"
                            onClick={() => setCurrentPath([...currentPath, folder])}
                            title={folder}
                          >
                            <Folder className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                            <span className="truncate text-xs font-medium">{folder}</span>
                          </Button>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">폴더</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">-</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">-</td>
                        <td className="px-4 py-3 text-center text-xs text-muted-foreground">-</td>
                      </tr>
                    ))}
                    {currentFiles.map((file) => (
                      <tr key={`file-${file.id}`} className="transition-smooth hover:bg-muted">
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="max-w-full justify-start px-0"
                            onClick={() => handlePreview(file)}
                            title={file.filename}
                          >
                            <FileText className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                            <span className="truncate text-xs font-medium">{file.displayName}</span>
                          </Button>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {fileType(file.displayName)}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatFileSize(file.file_size)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                          {formatUploadDate(file.uploaded_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownload(file.storage_key, file.filename)}
                              aria-label={`${file.displayName} 다운로드`}
                              title="다운로드"
                            >
                              <Download className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                            </Button>
                            <Button
                              variant="dangerGhost"
                              size="icon"
                              onClick={() => handleDelete(file.storage_key)}
                              aria-label={`${file.displayName} 삭제`}
                              title="삭제"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PagePanel>
  );
});

FilesPanel.displayName = "FilesPanel";

export default FilesPanel;
