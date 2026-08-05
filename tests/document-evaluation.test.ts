import assert from "node:assert/strict";
import test from "node:test";

import type { DocumentBlock, NormalizedDocument } from "../lib/document-ir";
import {
  assertNormalizedDocument,
  DOCUMENT_EVALUATION_MAX_BLOCK_PAIRS,
  DocumentEvaluationLimitError,
  estimateDocumentEvaluationBlockPairs,
  evaluateDocumentIR,
  isDocumentHash,
} from "../lib/document-evaluation";

function documentWithBlocks(blocks: DocumentBlock[]): NormalizedDocument {
  return {
    schemaVersion: "1.0",
    pages: blocks.length ? [{ pageNumber: 1, width: 100, height: 100, blocks }] : [],
    statistics: {
      pageCount: blocks.length ? 1 : 0,
      blockCount: blocks.length,
      tableCount: blocks.filter((block) => block.type === "table").length,
      figureCount: blocks.filter((block) => ["figure", "chart", "diagram"].includes(block.type)).length,
      formulaCount: blocks.filter((block) => block.type === "formula").length,
    },
  };
}

function paragraph(id: string, text: string, readingOrder = 0): DocumentBlock {
  return { id, type: "paragraph", pageNumber: 1, readingOrder, text };
}

function tableBlock(id: string, values: string[]): DocumentBlock {
  return {
    id,
    type: "table",
    pageNumber: 1,
    readingOrder: 0,
    table: {
      rowCount: 1,
      columnCount: values.length,
      cells: values.map((text, columnIndex) => ({ rowIndex: 0, columnIndex, text })),
    },
  };
}

test("identical table cell values receive perfect table scores", () => {
  const reference = documentWithBlocks([tableBlock("table-1", ["100", "200"])]);
  const result = evaluateDocumentIR(reference, structuredClone(reference));

  assert.equal(result.metrics.tableStructureScore, 1);
  assert.equal(result.metrics.tableCellTextSimilarity, 1);
  assert.equal(result.issues.some((issue) => issue.dimension === "table"), false);
});

test("wrong table cell values create a visible table issue", () => {
  const reference = documentWithBlocks([tableBlock("table-1", ["100"])]);
  const candidate = documentWithBlocks([tableBlock("table-1", ["999"])]);
  const result = evaluateDocumentIR(reference, candidate);

  assert.equal(result.metrics.tableStructureScore, 1);
  assert.equal(result.metrics.tableCellTextSimilarity, 0);
  assert.ok(result.issues.some((issue) => issue.code === "low-table-cell-text" && issue.severity === "error"));
});

test("missing and extra table cells are included in cell text similarity", () => {
  const reference = documentWithBlocks([tableBlock("table-1", ["A", "B"])]);
  const missingCell = documentWithBlocks([tableBlock("table-1", ["A"])]);
  const extraCell = documentWithBlocks([tableBlock("table-1", ["A", "B", "C"])]);

  assert.equal(evaluateDocumentIR(reference, missingCell).metrics.tableCellTextSimilarity, 0.5);
  assert.equal(evaluateDocumentIR(reference, extraCell).metrics.tableCellTextSimilarity, 0.666667);
});

test("reading-order inversions are reported", () => {
  const reference = documentWithBlocks([
    paragraph("first", "Alpha", 0),
    paragraph("second", "Beta", 1),
  ]);
  const candidate = documentWithBlocks([
    paragraph("first-candidate", "Alpha", 1),
    paragraph("second-candidate", "Beta", 0),
  ]);
  const result = evaluateDocumentIR(reference, candidate);

  assert.equal(result.metrics.readingOrderAccuracy, 0);
  assert.ok(result.issues.some((issue) => issue.code === "reading-order-inversion"));
});

test("empty documents compare as equal page counts", () => {
  const empty = documentWithBlocks([]);
  const result = evaluateDocumentIR(empty, structuredClone(empty));

  assert.equal(result.metrics.pageCountAccuracy, 1);
  assert.equal(result.metrics.blockF1, null);
});

test("comparison rejects workloads above the block-pair budget", () => {
  const reference = documentWithBlocks(Array.from({ length: 400 }, (_, index) => paragraph(`r-${index}`, "same", index)));
  const candidate = documentWithBlocks(Array.from({ length: 251 }, (_, index) => paragraph(`c-${index}`, "same", index)));

  assert.equal(estimateDocumentEvaluationBlockPairs(reference, candidate), 100_400);
  assert.ok(estimateDocumentEvaluationBlockPairs(reference, candidate) > DOCUMENT_EVALUATION_MAX_BLOCK_PAIRS);
  assert.throws(() => evaluateDocumentIR(reference, candidate), DocumentEvaluationLimitError);
});

test("document validation rejects oversized block content", () => {
  const document = documentWithBlocks([paragraph("large", "x".repeat(250_001))]);
  assert.throws(() => assertNormalizedDocument(document), /block with too much content/);
});

test("document hashes must be complete SHA-256 hex strings", () => {
  assert.equal(isDocumentHash("a".repeat(64)), true);
  assert.equal(isDocumentHash("A".repeat(64)), true);
  assert.equal(isDocumentHash("a".repeat(63)), false);
  assert.equal(isDocumentHash(null), false);
});
