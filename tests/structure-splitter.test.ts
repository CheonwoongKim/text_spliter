import assert from "node:assert/strict";
import test from "node:test";
import type { NormalizedDocument } from "@/lib/document-ir";
import { splitText } from "@/lib/splitters";
import {
  isStructureSplittableDocument,
  splitDocumentByStructure,
  StructureSplitError,
} from "@/lib/structure-splitter";
import type { SplitterConfig } from "@/lib/types";

const TABLE_TEXT = [
  "Metric | Result",
  "Text accuracy | 98.4%",
  "Pages | 12",
  "Tables | 3",
].join("\n");

function document(): NormalizedDocument {
  return {
    schemaVersion: "1.0",
    pages: [
      {
        pageNumber: 1,
        blocks: [
          { id: "p1-h", type: "section-header", pageNumber: 1, readingOrder: 0, text: "Results" },
          { id: "p1-a", type: "paragraph", pageNumber: 1, readingOrder: 1, text: "First paragraph of the results section." },
          { id: "p1-t", type: "table", pageNumber: 1, readingOrder: 2, text: TABLE_TEXT },
          { id: "p1-f", type: "footer", pageNumber: 1, readingOrder: 3, text: "Confidential draft" },
        ],
      },
      {
        pageNumber: 2,
        blocks: [
          { id: "p2-a", type: "paragraph", pageNumber: 2, readingOrder: 0, text: "Second page discussion." },
        ],
      },
    ],
    statistics: { pageCount: 2, blockCount: 5, tableCount: 1, figureCount: 0, formulaCount: 0 },
  };
}

function config(overrides: Partial<SplitterConfig> = {}): SplitterConfig {
  return {
    splitterType: "DocumentStructureSplitter",
    chunkSize: 1000,
    chunkOverlap: 0,
    ...overrides,
  };
}

test("a table is never split across chunks", () => {
  const chunks = splitDocumentByStructure(document(), { chunkSize: 20 });
  const tableChunks = chunks.filter((chunk) => chunk.content.includes("Text accuracy"));

  assert.equal(tableChunks.length, 1, "the table must appear in exactly one chunk");
  assert.ok(
    tableChunks[0].content.includes("Tables | 3"),
    "the whole table must stay together even past the chunk budget",
  );
});

test("every chunk carries exact page and block provenance", () => {
  const chunks = splitDocumentByStructure(document(), { chunkSize: 1000 });

  for (const chunk of chunks) {
    const source = chunk.metadata.source;
    assert.ok(source?.pageNumber, "each chunk names its page");
    assert.ok((source?.blockIds?.length || 0) > 0, "each chunk names its blocks");
    assert.deepEqual(source?.pageNumbers, [source?.pageNumber]);
  }
});

test("chunks never straddle a page boundary", () => {
  const chunks = splitDocumentByStructure(document(), { chunkSize: 100_000 });
  const pages = new Set(chunks.map((chunk) => chunk.metadata.source?.pageNumber));

  assert.deepEqual([...pages].sort(), [1, 2]);
  for (const chunk of chunks) {
    assert.equal(chunk.metadata.source?.pageNumbers?.length, 1);
  }
});

test("headings travel with the content they introduce", () => {
  const chunks = splitDocumentByStructure(document(), { chunkSize: 20 });
  const tableChunk = chunks.find((chunk) => chunk.content.includes("Text accuracy"));

  assert.ok(tableChunk?.content.startsWith("Results"), "the table keeps its section heading");
});

test("running headers and footers are dropped", () => {
  const chunks = splitDocumentByStructure(document(), { chunkSize: 1000 });

  assert.ok(
    chunks.every((chunk) => !chunk.content.includes("Confidential draft")),
    "page furniture is not retrievable content",
  );
});

test("documents without blocks are rejected instead of silently degrading", () => {
  assert.equal(isStructureSplittableDocument(null), false);
  assert.equal(isStructureSplittableDocument({ pages: [] }), false);
  assert.equal(isStructureSplittableDocument({ pages: [{ blocks: [] }] }), false);
  assert.throws(
    () => splitDocumentByStructure({ ...document(), pages: [] }, { chunkSize: 100 }),
    StructureSplitError,
  );
});

test("splitText routes the structure splitter and keeps source provenance", async () => {
  const result = await splitText("ignored flat text", config(), {
    fileName: "report.pdf",
    parserType: "Upstage",
    documentHash: "d".repeat(64),
    originalJson: document(),
  });

  assert.equal(result.splitterType, "DocumentStructureSplitter");
  assert.ok(result.totalChunks > 0);
  assert.ok(result.statistics.maxChunkSize >= result.statistics.minChunkSize);
  for (const chunk of result.chunks) {
    assert.equal(chunk.metadata.source?.documentHash, "d".repeat(64));
    assert.equal(chunk.metadata.source?.parserType, "Upstage");
  }
});

test("the structure splitter refuses plain pasted text", async () => {
  await assert.rejects(
    () => splitText("just pasted text", config(), { fileName: "pasted.txt" }),
    /needs a parsed document/,
  );
});

test("chunk offsets stay ordered and non-overlapping", () => {
  const chunks = splitDocumentByStructure(document(), { chunkSize: 40 });

  for (let index = 1; index < chunks.length; index += 1) {
    const previous = chunks[index - 1].metadata;
    const current = chunks[index].metadata;
    assert.ok(
      current.startIndex >= previous.endIndex,
      "structure chunks do not overlap",
    );
  }
});
