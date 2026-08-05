import "server-only";

import { createHash } from "node:crypto";

const IDENTIFIER_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/;

export function isSafeDatabaseIdentifier(value: string): boolean {
  return IDENTIFIER_PATTERN.test(value) && value.length <= 63;
}

export function assertSafeDatabaseIdentifier(value: string, label: string): void {
  if (!isSafeDatabaseIdentifier(value)) {
    throw new Error(
      `${label} must start with a letter, contain only letters, numbers, and underscores, and be at most 63 characters.`
    );
  }
}

export function ragMatchFunctionName(tableName: string): string {
  const digest = createHash("sha256").update(tableName).digest("hex").slice(0, 10);
  return `rag_match_${tableName.slice(0, 36)}_${digest}`;
}

export function vectorSearchSetupSql({
  schemaName,
  tableName,
  vectorDimension,
}: {
  schemaName: string;
  tableName: string;
  vectorDimension: number;
}): string {
  assertSafeDatabaseIdentifier(schemaName, "Schema name");
  assertSafeDatabaseIdentifier(tableName, "Table name");

  if (!Number.isInteger(vectorDimension) || vectorDimension < 1 || vectorDimension > 4096) {
    throw new Error("Vector dimension must be an integer between 1 and 4096.");
  }

  const functionName = ragMatchFunctionName(tableName);

  return `
    CREATE OR REPLACE FUNCTION ${schemaName}.${functionName}(
      query_embedding vector(${vectorDimension}),
      match_count integer DEFAULT 5
    )
    RETURNS TABLE (
      id bigint,
      content text,
      metadata jsonb,
      similarity double precision
    )
    LANGUAGE sql
    STABLE
    SET search_path = ${schemaName}
    AS $function$
      SELECT
        documents.id,
        documents.content,
        COALESCE(documents.metadata, '{}'::jsonb),
        1 - (documents.embedding <=> query_embedding) AS similarity
      FROM ${schemaName}.${tableName} AS documents
      WHERE documents.embedding IS NOT NULL
      ORDER BY documents.embedding <=> query_embedding
      LIMIT LEAST(GREATEST(match_count, 1), 20);
    $function$;
  `;
}
