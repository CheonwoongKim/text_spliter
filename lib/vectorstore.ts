import {
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_EMBEDDING_MODEL,
} from "@/lib/constants";

export const MANAGED_VECTOR_SCHEMA = "vector_store";
export const MANAGED_VECTOR_DIMENSIONS = DEFAULT_EMBEDDING_DIMENSIONS;
export const MANAGED_VECTOR_EMBEDDING_MODEL = DEFAULT_EMBEDDING_MODEL;

const COLLECTION_NAME_PATTERN = /^[a-z][a-z0-9_]{0,62}$/;

export interface NormalizedVectorChunk {
  content: string;
  metadata: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeVectorCollectionName(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("Collection name is required.");
  }
  const normalized = value.trim().toLowerCase();
  if (!COLLECTION_NAME_PATTERN.test(normalized)) {
    throw new Error(
      "Collection name must start with a letter and contain only lowercase letters, numbers, or underscores."
    );
  }
  return normalized;
}

export function assertManagedVectorSchema(value: unknown): void {
  if (value !== MANAGED_VECTOR_SCHEMA) {
    throw new Error(`Vector Store only supports the ${MANAGED_VECTOR_SCHEMA} schema.`);
  }
}

export function normalizeVectorChunk(value: unknown): NormalizedVectorChunk {
  const record = isRecord(value) ? value : null;
  if (typeof value !== "string" && !record) {
    throw new Error("Every chunk must contain between 1 and 250,000 characters.");
  }
  const content = typeof value === "string"
    ? value
    : typeof record?.pageContent === "string"
      ? record.pageContent
      : typeof record?.text === "string"
        ? record.text
        : JSON.stringify(value);

  if (typeof content !== "string" || !content.trim() || content.length > 250_000) {
    throw new Error("Every chunk must contain between 1 and 250,000 characters.");
  }

  return {
    content,
    metadata: isRecord(record?.metadata) ? record.metadata : {},
  };
}

export function vectorPageRange(limitValue: unknown, offsetValue: unknown): {
  limit: number;
  offset: number;
  from: number;
  to: number;
} {
  const parsedLimit = Number(limitValue);
  const parsedOffset = Number(offsetValue);
  const limit = Number.isInteger(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 50;
  const offset = Number.isInteger(parsedOffset) ? Math.max(parsedOffset, 0) : 0;
  return { limit, offset, from: offset, to: offset + limit - 1 };
}
