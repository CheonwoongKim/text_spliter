import type { SourceMetadata } from "@/lib/types";

export interface StoredParseResultDetail {
  run_id?: string | null;
  document_hash?: string | null;
  parser_type: string;
  engine_id?: string | null;
  file_name: string;
  text_content?: string | null;
  html_content?: string | null;
  markdown_content?: string | null;
  json_content?: unknown;
  normalized_document?: unknown;
}

export interface ExtractedParseResultSource {
  text: string;
  metadata: SourceMetadata;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function stringField(record: UnknownRecord | null, key: string): string {
  const value = record?.[key];
  return typeof value === "string" ? value : "";
}

function joinPageField(value: unknown, field: string): string {
  if (!Array.isArray(value)) return "";

  return value
    .map((page) => stringField(asRecord(page), field))
    .filter((content) => content.trim())
    .join("\n\n");
}

function extractNestedPages(record: UnknownRecord, container: string, field: string): string {
  const nested = asRecord(record[container]);
  return joinPageField(nested?.pages, field);
}

function extractLlamaContent(value: unknown): string {
  const record = asRecord(value);
  if (!record) return "";

  const pages = record.pages;
  if (Array.isArray(pages)) {
    const markdown = joinPageField(pages, "md");
    if (markdown) return markdown;

    const text = joinPageField(pages, "text");
    if (text) return text;
  }

  return extractNestedPages(record, "markdown", "markdown")
    || extractNestedPages(record, "text", "text");
}

function extractNormalizedContent(value: unknown): string {
  const record = asRecord(value);
  if (!record) return "";

  return stringField(record, "markdown")
    || stringField(record, "text")
    || joinPageField(record.pages, "markdown")
    || joinPageField(record.pages, "text");
}

function extractProviderJsonContent(parserType: string, value: unknown): string {
  const record = asRecord(value);
  if (!record) return typeof value === "string" ? value : "";

  if (parserType === "LlamaIndex") {
    const llamaContent = extractLlamaContent(record);
    if (llamaContent) return llamaContent;
  }

  if (parserType === "Google") {
    const document = asRecord(record.document);
    const googleText = stringField(document, "text") || stringField(record, "text");
    if (googleText) return googleText;
  }

  const commonContent = stringField(record, "text")
    || stringField(record, "markdown")
    || stringField(record, "html")
    || stringField(record, "content");
  return commonContent || JSON.stringify(record, null, 2);
}

function extractLegacyTextContent(parserType: string, value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;

  const parsed = parseJsonValue(value);
  if (typeof parsed === "string") return value;

  if (parserType === "LlamaIndex") {
    return extractLlamaContent(parsed) || value;
  }

  return value;
}

export function extractParseResultSource(
  detail: StoredParseResultDetail,
): ExtractedParseResultSource | null {
  const normalizedDocument = parseJsonValue(detail.normalized_document);
  const jsonContent = parseJsonValue(detail.json_content);

  const text = extractNormalizedContent(normalizedDocument)
    || (detail.text_content
      ? extractLegacyTextContent(detail.parser_type, detail.text_content)
      : "")
    || detail.markdown_content
    || detail.html_content
    || extractProviderJsonContent(detail.parser_type, jsonContent);

  if (!text.trim()) return null;

  return {
    text,
    metadata: {
      fileName: detail.file_name,
      parserType: detail.parser_type,
      parseRunId: detail.run_id || undefined,
      documentHash: detail.document_hash || undefined,
      engineId: detail.engine_id || undefined,
      originalJson: detail.normalized_document ? normalizedDocument : jsonContent,
    },
  };
}
