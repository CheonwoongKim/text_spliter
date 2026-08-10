export interface ParseResult {
  id: number;
  parser_type: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  processing_time: number | null;
  created_at: string;
}

export interface ParseResultsResponse {
  results: ParseResult[];
  total: number;
}

export interface SplitResult {
  id: number;
  splitter_type: string;
  chunk_size: number | null;
  chunk_overlap: number | null;
  chunk_count: number;
  processing_time: number | null;
  created_at: string;
  original_text_preview: string;
}

export interface SplitResultsResponse {
  results: SplitResult[];
  total: number;
}

export interface FullSplitResult extends SplitResult {
  original_text: string;
  separator: string | null;
  separators: string[] | null;
  encoding_name: string | null;
  language: string | null;
  breakpoint_type: string | null;
  chunks: unknown[];
}

export type StorageTab = "parse" | "split";
export type VectorUploadMessage = { type: "success" | "error"; text: string };
