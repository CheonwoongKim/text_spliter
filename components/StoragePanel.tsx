"use client";

import { memo, useState, useEffect, useCallback } from "react";
import { getAuthToken } from "@/lib/auth";
import { DEFAULT_ROWS_PER_PAGE } from "@/lib/constants";
import Pagination from "./Pagination";

interface ParseResult {
  id: number;
  parser_type: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  processing_time: number | null;
  created_at: string;
}

interface ParseResultsResponse {
  results: ParseResult[];
  total: number;
}

interface SplitResult {
  id: number;
  splitter_type: string;
  chunk_size: number | null;
  chunk_overlap: number | null;
  chunk_count: number;
  processing_time: number | null;
  created_at: string;
  original_text_preview: string;
}

interface SplitResultsResponse {
  results: SplitResult[];
  total: number;
}

interface FullParseResult extends ParseResult {
  text_content: string | null;
  html_content: string | null;
  markdown_content: string | null;
  json_content: any | null;
}

interface FullSplitResult extends SplitResult {
  original_text: string;
  separator: string | null;
  separators: string[] | null;
  encoding_name: string | null;
  language: string | null;
  breakpoint_type: string | null;
  chunks: any[];
}

const StoragePanel = memo(function StoragePanel() {
  const [activeTab, setActiveTab] = useState<'parse' | 'split'>('parse');

  // Parse results state
  const [results, setResults] = useState<ParseResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [viewModalData, setViewModalData] = useState<FullParseResult | null>(null);
  const [viewMode, setViewMode] = useState<'text' | 'html' | 'markdown' | 'json'>('text');
  const [copied, setCopied] = useState(false);

  // Split results state
  const [splitResults, setSplitResults] = useState<SplitResult[]>([]);
  const [splitTotal, setSplitTotal] = useState(0);
  const [splitLoading, setSplitLoading] = useState(true);
  const [splitError, setSplitError] = useState<string | null>(null);
  const [splitPage, setSplitPage] = useState(0);
  const [splitViewModalData, setSplitViewModalData] = useState<FullSplitResult | null>(null);
  const [splitCopied, setSplitCopied] = useState(false);

  const rowsPerPage = DEFAULT_ROWS_PER_PAGE;

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      if (!token) {
        setError('Please login first');
        setLoading(false);
        return;
      }

      const response = await fetch(
        `/api/parse-results?limit=${rowsPerPage}&offset=${page * rowsPerPage}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to fetch results');
      }

      const data: ParseResultsResponse = await response.json();
      setResults(data.results);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch results');
    } finally {
      setLoading(false);
    }
  }, [page]);

  const fetchSplitResults = useCallback(async () => {
    setSplitLoading(true);
    setSplitError(null);

    try {
      const token = getAuthToken();
      if (!token) {
        setSplitError('Please login first');
        setSplitLoading(false);
        return;
      }

      const response = await fetch(
        `/api/split-results?limit=${rowsPerPage}&offset=${splitPage * rowsPerPage}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to fetch split results');
      }

      const data: SplitResultsResponse = await response.json();
      setSplitResults(data.results);
      setSplitTotal(data.total);
    } catch (err) {
      setSplitError(err instanceof Error ? err.message : 'Failed to fetch split results');
    } finally {
      setSplitLoading(false);
    }
  }, [splitPage]);

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('Are you sure you want to delete this result?')) {
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        alert('Please login first');
        return;
      }

      const response = await fetch(`/api/parse-results?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete result');
      }

      fetchResults();
    } catch (err) {
      console.error('Error deleting result:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete result');
    }
  }, [fetchResults]);

  const handleDeleteSplit = useCallback(async (id: number) => {
    if (!confirm('Are you sure you want to delete this result?')) {
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        alert('Please login first');
        return;
      }

      const response = await fetch(`/api/split-results?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete result');
      }

      fetchSplitResults();
    } catch (err) {
      console.error('Error deleting split result:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete result');
    }
  }, [fetchSplitResults]);

  const handleView = useCallback(async (id: number) => {
    try {
      const token = getAuthToken();
      if (!token) {
        alert('Please login first');
        return;
      }

      const response = await fetch(`/api/parse-results?id=${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch result');
      }

      const data: FullParseResult = await response.json();
      setViewModalData(data);

      if (data.markdown_content) {
        setViewMode('markdown');
      } else if (data.html_content) {
        setViewMode('html');
      } else if (data.json_content) {
        setViewMode('json');
      } else {
        setViewMode('text');
      }
      setCopied(false);
    } catch (err) {
      console.error('Error fetching result:', err);
      alert(err instanceof Error ? err.message : 'Failed to fetch result');
    }
  }, []);

  const handleViewSplit = useCallback(async (id: number) => {
    try {
      const token = getAuthToken();
      if (!token) {
        alert('Please login first');
        return;
      }

      const response = await fetch(`/api/split-results?id=${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch result');
      }

      const data: FullSplitResult = await response.json();
      setSplitViewModalData(data);
      setSplitCopied(false);
    } catch (err) {
      console.error('Error fetching split result:', err);
      alert(err instanceof Error ? err.message : 'Failed to fetch result');
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'parse') {
      fetchResults();
    } else {
      fetchSplitResults();
    }
  }, [activeTab, fetchResults, fetchSplitResults]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-full flex flex-col bg-surface">
      {/* Header */}
      <div className="border-b border-border bg-card px-10 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">
              {activeTab === 'parse'
                ? `${total} saved parse results`
                : `${splitTotal} saved split results`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Tab Toggle */}
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              <button
                onClick={() => setActiveTab('parse')}
                className={`px-3 py-1 text-xs font-medium rounded transition-smooth ${
                  activeTab === 'parse'
                    ? 'bg-card text-card-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-card-foreground'
                }`}
              >
                Parse Results
              </button>
              <button
                onClick={() => setActiveTab('split')}
                className={`px-3 py-1 text-xs font-medium rounded transition-smooth ${
                  activeTab === 'split'
                    ? 'bg-card text-card-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-card-foreground'
                }`}
              >
                Split Results
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={activeTab === 'parse' ? fetchResults : fetchSplitResults}
              disabled={activeTab === 'parse' ? loading : splitLoading}
              className="p-2 text-muted-foreground hover:text-card-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-smooth"
              title="Refresh"
            >
              {(activeTab === 'parse' ? loading : splitLoading) ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {((activeTab === 'parse' && error) || (activeTab === 'split' && splitError)) && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-10 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-red-800 dark:text-red-200">
                {activeTab === 'parse' ? error : splitError}
              </span>
            </div>
            <button
              onClick={() => activeTab === 'parse' ? setError(null) : setSplitError(null)}
              className="text-red-800 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col px-10 py-6 overflow-hidden">
        {activeTab === 'parse' ? (
          <div className="flex-1 flex flex-col bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="bg-muted border-b border-border sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32 whitespace-nowrap">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-64 whitespace-nowrap">File Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28 whitespace-nowrap">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-48 whitespace-nowrap">MIME Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28 whitespace-nowrap">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-48 whitespace-nowrap">Created</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading && results.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="h-96">
                        <div className="flex items-center justify-center h-full">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                        </div>
                      </td>
                    </tr>
                  ) : results.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="h-96">
                        <div className="flex flex-col items-center justify-center h-full">
                          <svg className="h-6 w-6 text-muted-foreground mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                          <p className="text-sm text-muted-foreground">No saved parse results yet</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    results.map((result) => (
                      <tr key={result.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 w-32 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium rounded bg-accent/10 text-accent whitespace-nowrap">
                            {result.parser_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-card-foreground font-medium truncate whitespace-nowrap w-64 max-w-xs">
                          {result.file_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground w-28 whitespace-nowrap">
                          {formatFileSize(result.file_size)}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground w-48 truncate whitespace-nowrap">
                          {result.mime_type}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground w-28 whitespace-nowrap">
                          {result.processing_time ? `${result.processing_time}ms` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground w-48 whitespace-nowrap">
                          {formatDate(result.created_at)}
                        </td>
                        <td className="px-4 py-3 w-28 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleView(result.id)}
                              className="p-2 text-muted-foreground hover:text-accent transition-smooth"
                              title="View"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(result.id)}
                              className="p-2 text-muted-foreground hover:text-red-500 transition-smooth"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              page={page}
              total={total}
              rowsPerPage={rowsPerPage}
              onPageChange={setPage}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="bg-muted border-b border-border sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-40 whitespace-nowrap">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-64 whitespace-nowrap">Preview</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24 whitespace-nowrap">Chunks</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24 whitespace-nowrap">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28 whitespace-nowrap">Overlap</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28 whitespace-nowrap">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-48 whitespace-nowrap">Created</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {splitLoading && splitResults.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="h-96">
                        <div className="flex items-center justify-center h-full">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                        </div>
                      </td>
                    </tr>
                  ) : splitResults.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="h-96">
                        <div className="flex flex-col items-center justify-center h-full">
                          <svg className="h-6 w-6 text-muted-foreground mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" />
                          </svg>
                          <p className="text-sm text-muted-foreground">No saved split results yet</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    splitResults.map((result) => (
                      <tr key={result.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 w-40 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium rounded bg-accent/10 text-accent whitespace-nowrap">
                            {result.splitter_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-card-foreground truncate whitespace-nowrap w-64 max-w-xs">
                          {result.original_text_preview}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground w-24 whitespace-nowrap">
                          {result.chunk_count}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground w-24 whitespace-nowrap">
                          {result.chunk_size || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground w-28 whitespace-nowrap">
                          {result.chunk_overlap || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground w-28 whitespace-nowrap">
                          {result.processing_time ? `${result.processing_time}ms` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground w-48 whitespace-nowrap">
                          {formatDate(result.created_at)}
                        </td>
                        <td className="px-4 py-3 w-28 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewSplit(result.id)}
                              className="p-2 text-muted-foreground hover:text-accent transition-smooth"
                              title="View"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteSplit(result.id)}
                              className="p-2 text-muted-foreground hover:text-red-500 transition-smooth"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              page={splitPage}
              total={splitTotal}
              rowsPerPage={rowsPerPage}
              onPageChange={setSplitPage}
            />
          </div>
        )}
      </div>

      {/* Parse Results View Modal */}
      {viewModalData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewModalData(null)}>
          <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-border px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-card-foreground truncate">
                {viewModalData.file_name}
              </h2>
              <button onClick={() => setViewModalData(null)} className="p-2 text-muted-foreground hover:text-card-foreground rounded-lg hover:bg-muted transition-smooth">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <pre className="text-sm text-card-foreground whitespace-pre-wrap font-mono">
                {viewModalData.text_content || viewModalData.markdown_content || viewModalData.html_content || 'No content available'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Split Results View Modal */}
      {splitViewModalData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSplitViewModalData(null)}>
          <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-border px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-card-foreground">Split Result</h2>
                <p className="text-xs text-muted-foreground mt-1">{splitViewModalData.chunk_count} chunks</p>
              </div>
              <button onClick={() => setSplitViewModalData(null)} className="p-2 text-muted-foreground hover:text-card-foreground rounded-lg hover:bg-muted transition-smooth">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-card-foreground mb-2">Original Text</h3>
                <pre className="text-sm text-card-foreground whitespace-pre-wrap font-mono bg-muted p-4 rounded">
                  {splitViewModalData.original_text}
                </pre>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-card-foreground mb-2">Chunks ({splitViewModalData.chunk_count})</h3>
                <div className="space-y-3">
                  {splitViewModalData.chunks.map((chunk: any, index: number) => (
                    <div key={index} className="bg-muted p-4 rounded">
                      <div className="text-xs font-semibold text-muted-foreground mb-2">Chunk {index + 1}</div>
                      <pre className="text-sm text-card-foreground whitespace-pre-wrap font-mono">
                        {typeof chunk === 'string' ? chunk : chunk.text || JSON.stringify(chunk, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

StoragePanel.displayName = 'StoragePanel';

export default StoragePanel;
