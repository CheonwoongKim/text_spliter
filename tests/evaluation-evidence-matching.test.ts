import assert from "node:assert/strict";
import test from "node:test";
import { calculateDeterministicMetrics } from "@/lib/evaluation-metrics";
import type { ExpectedEvidence } from "@/lib/types";

const DOCUMENT_HASH = "c".repeat(64);

function context(metadata: Record<string, unknown>, rank: number) {
  return { rank, chunkId: `chunk-${rank}`, metadata };
}

test("expected page evidence matches a chunk that reports its page", () => {
  const expected: ExpectedEvidence[] = [{ documentHash: DOCUMENT_HASH, pageNumber: 2 }];
  const metrics = calculateDeterministicMetrics({
    expectedEvidence: expected,
    retrievedContexts: [
      context({ document_hash: DOCUMENT_HASH, page_number: 2, block_id: "p2-body" }, 1),
    ],
    citations: [],
    topK: 5,
  });

  assert.equal(metrics.recallAtK, 1);
});

test("expected block evidence matches a chunk spanning several blocks", () => {
  const expected: ExpectedEvidence[] = [{ blockId: "p1-table" }];
  const metrics = calculateDeterministicMetrics({
    expectedEvidence: expected,
    retrievedContexts: [
      context({
        document_hash: DOCUMENT_HASH,
        page_number: 1,
        block_id: "p1-intro",
        block_ids: ["p1-intro", "p1-table"],
      }, 1),
    ],
    citations: [],
    topK: 5,
  });

  assert.equal(metrics.recallAtK, 1, "a chunk covering the block must count as retrieved");
});

test("expected page evidence matches a chunk spanning a page boundary", () => {
  const metrics = calculateDeterministicMetrics({
    expectedEvidence: [{ pageNumber: 3 }],
    retrievedContexts: [
      context({ page_number: 2, page_numbers: [2, 3] }, 1),
    ],
    citations: [],
    topK: 5,
  });

  assert.equal(metrics.recallAtK, 1);
});

test("a chunk without page provenance does not satisfy page evidence", () => {
  const metrics = calculateDeterministicMetrics({
    expectedEvidence: [{ documentHash: DOCUMENT_HASH, pageNumber: 2 }],
    retrievedContexts: [context({ document_hash: DOCUMENT_HASH }, 1)],
    citations: [],
    topK: 5,
  });

  assert.equal(metrics.recallAtK, 0, "missing provenance must not be scored as a match");
});

test("a different page or block still fails to match", () => {
  const metrics = calculateDeterministicMetrics({
    expectedEvidence: [{ pageNumber: 9, blockId: "p9-body" }],
    retrievedContexts: [
      context({ page_number: 1, page_numbers: [1, 2], block_ids: ["p1-intro"] }, 1),
    ],
    citations: [],
    topK: 5,
  });

  assert.equal(metrics.recallAtK, 0);
});
