/**
 * Maps chunk character offsets back to the pages and blocks of a Document IR.
 *
 * Retrieval metrics compare expected evidence (page, block) against the
 * provenance stored on each retrieved chunk. Without this map a chunk only
 * knows which document it came from, so any page- or block-level expectation is
 * unmatchable and the deterministic scores are meaningless.
 *
 * Positions are located by searching the real source text rather than assuming
 * how it was assembled. When a page or block cannot be located, no span is
 * emitted: an absent provenance is scored as unknown, a wrong one would be
 * scored as a false match.
 */

export interface DocumentTextSpan {
  start: number;
  end: number;
  pageNumber: number;
  blockId?: string;
}

export interface ChunkProvenance {
  pageNumber?: number;
  pageNumbers: number[];
  blockIds: string[];
}

interface PageLike {
  pageNumber?: unknown;
  text?: unknown;
  markdown?: unknown;
  blocks?: unknown;
}

interface BlockLike {
  id?: unknown;
  text?: unknown;
}

const MIN_ANCHOR_LENGTH = 12;

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function contentOf(value: { text?: unknown; markdown?: unknown }): string {
  if (typeof value.markdown === "string" && value.markdown.trim()) return value.markdown;
  if (typeof value.text === "string" && value.text.trim()) return value.text;
  return "";
}

/**
 * Locate `needle` at or after `from`. Falls back to a leading anchor because
 * providers may normalize trailing whitespace differently between the
 * document-level text and its per-page content.
 */
function locate(haystack: string, needle: string, from: number): { start: number; end: number } | null {
  if (!needle) return null;

  const exact = haystack.indexOf(needle, from);
  if (exact >= 0) return { start: exact, end: exact + needle.length };

  const anchor = needle.slice(0, Math.max(MIN_ANCHOR_LENGTH, Math.floor(needle.length / 4)));
  if (anchor.length < MIN_ANCHOR_LENGTH) return null;

  const anchored = haystack.indexOf(anchor, from);
  if (anchored < 0) return null;

  return { start: anchored, end: Math.min(anchored + needle.length, haystack.length) };
}

/**
 * Build ordered spans for a Document IR against the exact text that was chunked.
 * Block spans are preferred; a page contributes a single span when none of its
 * blocks could be located.
 */
export function buildDocumentSpanMap(document: unknown, sourceText: string): DocumentTextSpan[] {
  if (!document || typeof document !== "object" || !sourceText) return [];

  const pages = asArray((document as { pages?: unknown }).pages);
  const spans: DocumentTextSpan[] = [];
  let cursor = 0;

  for (const rawPage of pages) {
    if (!rawPage || typeof rawPage !== "object") continue;
    const page = rawPage as PageLike;
    const pageNumber = Number(page.pageNumber);
    if (!Number.isInteger(pageNumber) || pageNumber <= 0) continue;

    const pageContent = contentOf(page);
    const pageSpan = locate(sourceText, pageContent, cursor);
    const searchStart = pageSpan ? pageSpan.start : cursor;
    const searchEnd = pageSpan ? pageSpan.end : sourceText.length;

    let blockCursor = searchStart;
    let locatedBlocks = 0;

    for (const rawBlock of asArray(page.blocks)) {
      if (!rawBlock || typeof rawBlock !== "object") continue;
      const block = rawBlock as BlockLike;
      const blockId = typeof block.id === "string" ? block.id : "";
      const blockContent = contentOf(block);
      if (!blockId || !blockContent) continue;

      const blockSpan = locate(sourceText.slice(0, searchEnd), blockContent, blockCursor);
      if (!blockSpan) continue;

      spans.push({
        start: blockSpan.start,
        end: blockSpan.end,
        pageNumber,
        blockId,
      });
      blockCursor = blockSpan.end;
      locatedBlocks += 1;
    }

    if (locatedBlocks === 0 && pageSpan) {
      spans.push({ start: pageSpan.start, end: pageSpan.end, pageNumber });
    }

    if (pageSpan) cursor = pageSpan.end;
  }

  return spans.sort((left, right) => left.start - right.start);
}

/**
 * Resolve which pages and blocks a chunk covers. `pageNumber` reports the page
 * holding the largest share of the chunk so single-value consumers stay stable.
 */
export function resolveChunkProvenance(
  spans: DocumentTextSpan[],
  start: number,
  end: number,
): ChunkProvenance {
  const empty: ChunkProvenance = { pageNumbers: [], blockIds: [] };
  if (spans.length === 0 || !Number.isInteger(start) || !Number.isInteger(end) || end <= start) {
    return empty;
  }

  const overlapByPage = new Map<number, number>();
  const blockIds: string[] = [];

  for (const span of spans) {
    const overlap = Math.min(span.end, end) - Math.max(span.start, start);
    if (overlap <= 0) continue;

    overlapByPage.set(span.pageNumber, (overlapByPage.get(span.pageNumber) || 0) + overlap);
    if (span.blockId && !blockIds.includes(span.blockId)) blockIds.push(span.blockId);
  }

  if (overlapByPage.size === 0) return empty;

  const pageNumbers = [...overlapByPage.keys()].sort((left, right) => left - right);
  const dominantPage = [...overlapByPage.entries()].reduce(
    (best, entry) => entry[1] > best[1] ? entry : best,
  )[0];

  return { pageNumber: dominantPage, pageNumbers, blockIds };
}
