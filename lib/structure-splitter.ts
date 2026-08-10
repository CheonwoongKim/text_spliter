import type {
  DocumentBlock,
  DocumentBlockType,
  NormalizedDocument,
} from "@/lib/document-ir";
import type { ChunkResult, SourceMetadata } from "@/lib/types";

/**
 * Chunks a document along its Document IR blocks instead of raw characters.
 *
 * Character splitting flattens the structure the parser worked to recover: a
 * table gets cut across its rows, a heading is separated from the text it
 * introduces, and page identity is lost. This splitter keeps those intact, and
 * because it walks the blocks directly, every chunk carries exact page and
 * block provenance rather than provenance inferred from offsets.
 */

/** Blocks that carry no retrievable meaning on their own. */
const SKIPPED_BLOCK_TYPES: ReadonlySet<DocumentBlockType> = new Set([
  "header",
  "footer",
  "page-number",
]);

/** Blocks that introduce the content following them. */
const HEADING_BLOCK_TYPES: ReadonlySet<DocumentBlockType> = new Set([
  "title",
  "section-header",
]);

/** Blocks whose meaning is destroyed by splitting them. */
const ATOMIC_BLOCK_TYPES: ReadonlySet<DocumentBlockType> = new Set([
  "table",
  "formula",
  "figure",
  "chart",
  "diagram",
]);

export interface StructureSplitOptions {
  chunkSize: number;
  /** Repeats the active heading on every chunk so context survives retrieval. */
  includeHeadingContext?: boolean;
}

export class StructureSplitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StructureSplitError";
  }
}

interface PendingChunk {
  pageNumber: number;
  blocks: DocumentBlock[];
  heading: string;
  length: number;
}

function blockText(block: DocumentBlock): string {
  const text = typeof block.text === "string" ? block.text.trim() : "";
  return text;
}

function orderedBlocks(blocks: DocumentBlock[]): DocumentBlock[] {
  return [...blocks].sort((left, right) => {
    const leftOrder = Number.isFinite(left.readingOrder) ? Number(left.readingOrder) : 0;
    const rightOrder = Number.isFinite(right.readingOrder) ? Number(right.readingOrder) : 0;
    return leftOrder - rightOrder;
  });
}

function renderChunk(pending: PendingChunk, includeHeading: boolean): string {
  const body = pending.blocks.map(blockText).filter(Boolean).join("\n\n");
  const headingIsFirstBlock = pending.blocks.some(
    (block) => HEADING_BLOCK_TYPES.has(block.type) && blockText(block) === pending.heading,
  );

  return includeHeading && pending.heading && !headingIsFirstBlock
    ? `${pending.heading}\n\n${body}`
    : body;
}

export function isStructureSplittableDocument(value: unknown): value is NormalizedDocument {
  if (!value || typeof value !== "object") return false;
  const pages = (value as { pages?: unknown }).pages;
  if (!Array.isArray(pages)) return false;

  return pages.some((page) => {
    const blocks = (page as { blocks?: unknown })?.blocks;
    return Array.isArray(blocks) && blocks.some((block) => blockText(block as DocumentBlock));
  });
}

/**
 * Split a document into chunks that respect block, table, and page boundaries.
 * `chunkSize` is a soft budget: an atomic block that exceeds it becomes its own
 * chunk rather than being cut in half.
 */
export function splitDocumentByStructure(
  document: NormalizedDocument,
  options: StructureSplitOptions,
  sourceMetadata?: SourceMetadata,
): ChunkResult[] {
  const chunkSize = Math.max(1, options.chunkSize);
  const includeHeading = options.includeHeadingContext !== false;

  if (!isStructureSplittableDocument(document)) {
    throw new StructureSplitError(
      "The Document Structure splitter needs a parsed document with blocks. "
      + "Chunk a parser result, or choose a character-based splitter.",
    );
  }

  const chunks: ChunkResult[] = [];
  let pending: PendingChunk | null = null;
  let cursor = 0;

  const flush = () => {
    if (!pending || pending.blocks.length === 0) {
      pending = null;
      return;
    }

    const content = renderChunk(pending, includeHeading);
    if (!content.trim()) {
      pending = null;
      return;
    }

    const startIndex = cursor;
    const endIndex = startIndex + content.length;
    cursor = endIndex + 2;

    chunks.push({
      index: chunks.length,
      content,
      metadata: {
        startIndex,
        endIndex,
        length: content.length,
        chunkSize,
        chunkOverlap: 0,
        source: {
          ...(sourceMetadata || {}),
          pageNumber: pending.pageNumber,
          pageNumbers: [pending.pageNumber],
          blockIds: pending.blocks.map((block) => block.id),
        },
      },
    });
    pending = null;
  };

  for (const page of document.pages) {
    // Page boundaries end a chunk: a chunk that straddles pages cannot report a
    // single page as its provenance.
    flush();
    let heading = "";

    for (const block of orderedBlocks(page.blocks || [])) {
      if (SKIPPED_BLOCK_TYPES.has(block.type)) continue;

      const text = blockText(block);
      if (!text) continue;

      if (HEADING_BLOCK_TYPES.has(block.type)) {
        flush();
        heading = text;
      }

      const atomic = ATOMIC_BLOCK_TYPES.has(block.type);
      const projected = (pending?.length || 0) + text.length;

      if (pending && (atomic || projected > chunkSize)) {
        flush();
      }

      if (!pending) {
        pending = {
          pageNumber: page.pageNumber,
          blocks: [],
          heading,
          length: heading && includeHeading ? heading.length : 0,
        };
      }

      pending.blocks.push(block);
      pending.length += text.length;

      // An atomic block is never merged with what follows it.
      if (atomic) flush();
    }

    flush();
  }

  return chunks;
}
