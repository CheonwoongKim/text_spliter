import type { NormalizedDocument } from "@/lib/document-ir";
import { extractNormalizedContent } from "@/lib/parse-result-content";
import type { ParseResponse, SourceMetadata } from "@/lib/types";

/**
 * Payload transferred from a completed parser run into the splitter workspace.
 *
 * The workbench compares engines, so a handoff must carry enough provenance for
 * later chunk, vector, and evaluation stages to attribute a chunk back to the
 * exact parse run that produced it.
 */
export interface SplitterHandoff {
  text: string;
  sourceMetadata: SourceMetadata;
  document?: NormalizedDocument;
  engineLabel: string;
}

/** Payload transferred from a saved split result into the vector store. */
export interface VectorStoreHandoff {
  splitResultId: number;
  chunkCount: number;
  sourceLabel: string;
}

function joinPageContent(pages: ParseResponse["pages"]): string {
  if (!Array.isArray(pages)) return "";

  return pages
    .map((page) => page.markdown || page.text || "")
    .filter((content) => content.trim())
    .join("\n\n");
}

export function parseRunEngineLabel(run: ParseResponse, index: number): string {
  return run.run?.engineId || run.metadata?.parserType || `Run ${index + 1}`;
}

/**
 * Resolve the source text for chunking using the same precedence as the stored
 * parse-result loader, so the same run yields identical text whether it reaches
 * the splitter directly or through Storage.
 */
export function resolveHandoffText(run: ParseResponse): string {
  return extractNormalizedContent(run.document)
    || run.markdown
    || run.text
    || joinPageContent(run.pages)
    || "";
}

export function buildSplitterHandoff(
  run: ParseResponse,
  index = 0,
): SplitterHandoff | null {
  const text = resolveHandoffText(run);
  if (!text.trim()) return null;

  return {
    text,
    sourceMetadata: {
      fileName: run.metadata?.fileName,
      parserType: run.metadata?.parserType,
      parseRunId: run.run?.id,
      documentHash: run.metadata?.documentHash,
      engineId: run.run?.engineId,
      originalJson: run.document ?? run.json,
    },
    document: run.document,
    engineLabel: parseRunEngineLabel(run, index),
  };
}
