import assert from "node:assert/strict";
import test from "node:test";

import {
  assertManagedVectorSchema,
  MANAGED_VECTOR_SCHEMA,
  normalizeVectorChunk,
  normalizeVectorCollectionName,
  vectorPageRange,
} from "../lib/vectorstore";

test("vector collection names are normalized and constrained", () => {
  assert.equal(normalizeVectorCollectionName("  Annual_Report_2026  "), "annual_report_2026");
  assert.throws(() => normalizeVectorCollectionName("2026-report"), /must start with a letter/);
  assert.throws(() => normalizeVectorCollectionName("report;drop table"), /lowercase letters/);
  assert.throws(() => normalizeVectorCollectionName("a".repeat(64)), /lowercase letters/);
});

test("vector chunks are normalized without trusting malformed metadata", () => {
  assert.deepEqual(normalizeVectorChunk("plain text"), { content: "plain text", metadata: {} });
  assert.deepEqual(
    normalizeVectorChunk({ pageContent: "document text", metadata: { page: 2 } }),
    { content: "document text", metadata: { page: 2 } }
  );
  assert.deepEqual(
    normalizeVectorChunk({ text: "fallback text", metadata: ["not", "an", "object"] }),
    { content: "fallback text", metadata: {} }
  );
  assert.throws(() => normalizeVectorChunk(null), /Every chunk/);
  assert.throws(() => normalizeVectorChunk("   "), /Every chunk/);
});

test("only the managed vector schema is accepted", () => {
  assert.doesNotThrow(() => assertManagedVectorSchema(MANAGED_VECTOR_SCHEMA));
  assert.throws(() => assertManagedVectorSchema("public"), /only supports/);
  assert.throws(() => assertManagedVectorSchema(undefined), /only supports/);
});

test("vector pagination is bounded and produces an inclusive Supabase range", () => {
  assert.deepEqual(vectorPageRange("20", "40"), { limit: 20, offset: 40, from: 40, to: 59 });
  assert.deepEqual(vectorPageRange("1000", "-4"), { limit: 100, offset: 0, from: 0, to: 99 });
  assert.deepEqual(vectorPageRange("invalid", "invalid"), { limit: 50, offset: 0, from: 0, to: 49 });
});
