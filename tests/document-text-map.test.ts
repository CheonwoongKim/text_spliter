import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDocumentSpanMap,
  resolveChunkProvenance,
} from "@/lib/document-text-map";
import { splitText } from "@/lib/splitters";

const PAGE_ONE = "Introduction paragraph about document processing pipelines.";
const PAGE_ONE_TABLE = "Metric Result\nText accuracy 98.4%";
const PAGE_TWO = "Second page discusses retrieval evaluation and chunk provenance.";

const DOCUMENT = {
  schemaVersion: "1.0",
  pages: [
    {
      pageNumber: 1,
      text: `${PAGE_ONE}\n\n${PAGE_ONE_TABLE}`,
      blocks: [
        { id: "p1-intro", type: "paragraph", pageNumber: 1, text: PAGE_ONE },
        { id: "p1-table", type: "table", pageNumber: 1, text: PAGE_ONE_TABLE },
      ],
    },
    {
      pageNumber: 2,
      text: PAGE_TWO,
      blocks: [
        { id: "p2-body", type: "paragraph", pageNumber: 2, text: PAGE_TWO },
      ],
    },
  ],
};

const SOURCE_TEXT = `${PAGE_ONE}\n\n${PAGE_ONE_TABLE}\n\n${PAGE_TWO}`;

test("span map locates every block of a document inside the chunked text", () => {
  const spans = buildDocumentSpanMap(DOCUMENT, SOURCE_TEXT);

  assert.deepEqual(
    spans.map((span) => span.blockId),
    ["p1-intro", "p1-table", "p2-body"],
  );
  assert.equal(spans[0].pageNumber, 1);
  assert.equal(spans[2].pageNumber, 2);
  assert.equal(SOURCE_TEXT.slice(spans[1].start, spans[1].end), PAGE_ONE_TABLE);
});

test("span map stays empty for input it cannot align rather than guessing", () => {
  assert.deepEqual(buildDocumentSpanMap(DOCUMENT, ""), []);
  assert.deepEqual(buildDocumentSpanMap(null, SOURCE_TEXT), []);
  assert.deepEqual(buildDocumentSpanMap({ pages: [] }, SOURCE_TEXT), []);
});

test("a page without locatable blocks still contributes a page-level span", () => {
  const spans = buildDocumentSpanMap(
    { pages: [{ pageNumber: 4, text: PAGE_TWO, blocks: [{ id: "missing", text: "absent" }] }] },
    SOURCE_TEXT,
  );

  assert.equal(spans.length, 1);
  assert.equal(spans[0].pageNumber, 4);
  assert.equal(spans[0].blockId, undefined);
});

test("chunk provenance reports every covered page and block", () => {
  const spans = buildDocumentSpanMap(DOCUMENT, SOURCE_TEXT);
  const wholeDocument = resolveChunkProvenance(spans, 0, SOURCE_TEXT.length);

  assert.deepEqual(wholeDocument.pageNumbers, [1, 2]);
  assert.deepEqual(wholeDocument.blockIds, ["p1-intro", "p1-table", "p2-body"]);
});

test("chunk provenance picks the page holding most of the chunk", () => {
  const spans = buildDocumentSpanMap(DOCUMENT, SOURCE_TEXT);
  const secondPageStart = SOURCE_TEXT.indexOf(PAGE_TWO);
  const mostlySecondPage = resolveChunkProvenance(
    spans,
    secondPageStart - 4,
    SOURCE_TEXT.length,
  );

  assert.equal(mostlySecondPage.pageNumber, 2);
});

test("chunk provenance is empty when nothing overlaps or offsets are invalid", () => {
  const spans = buildDocumentSpanMap(DOCUMENT, SOURCE_TEXT);

  assert.deepEqual(resolveChunkProvenance(spans, 10, 10).pageNumbers, []);
  assert.deepEqual(resolveChunkProvenance([], 0, 10).blockIds, []);
});

test("splitting a parsed document records page provenance on each chunk", async () => {
  const result = await splitText(
    SOURCE_TEXT,
    {
      splitterType: "RecursiveCharacterTextSplitter",
      chunkSize: 70,
      chunkOverlap: 0,
      separators: ["\n\n", "\n", " ", ""],
    },
    {
      fileName: "report.pdf",
      parserType: "Upstage",
      documentHash: "b".repeat(64),
      originalJson: DOCUMENT,
    },
  );

  const pages = result.chunks.map((chunk) => chunk.metadata.source?.pageNumber);
  assert.ok(pages.some((page) => page === 1), "expected a chunk attributed to page 1");
  assert.ok(pages.some((page) => page === 2), "expected a chunk attributed to page 2");

  for (const chunk of result.chunks) {
    const source = chunk.metadata.source;
    assert.equal(source?.documentHash, "b".repeat(64));
    if (source?.pageNumber !== undefined) {
      assert.ok((source.blockIds?.length || 0) > 0, "an attributed chunk names its blocks");
    }
  }
});

test("splitting plain text without a document keeps provenance absent", async () => {
  const result = await splitText(
    SOURCE_TEXT,
    {
      splitterType: "RecursiveCharacterTextSplitter",
      chunkSize: 70,
      chunkOverlap: 0,
      separators: ["\n\n", "\n", " ", ""],
    },
    { fileName: "pasted.txt" },
  );

  for (const chunk of result.chunks) {
    assert.equal(chunk.metadata.source?.pageNumber, undefined);
    assert.equal(chunk.metadata.source?.blockIds, undefined);
  }
});
