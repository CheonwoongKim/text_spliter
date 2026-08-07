import assert from "node:assert/strict";
import test from "node:test";
import { extractParseResultSource } from "../lib/parse-result-content";

const baseDetail = {
  parser_type: "Upstage",
  file_name: "sample.pdf",
  run_id: "run-1",
  document_hash: "hash-1",
  engine_id: "upstage-document-parse",
};

test("normalized document content takes precedence over legacy fields", () => {
  const result = extractParseResultSource({
    ...baseDetail,
    normalized_document: JSON.stringify({ markdown: "# Normalized" }),
    text_content: "Legacy text",
  });

  assert.equal(result?.text, "# Normalized");
  assert.equal(result?.metadata.fileName, "sample.pdf");
  assert.equal(result?.metadata.parseRunId, "run-1");
});

test("LlamaIndex pages prefer markdown and join pages", () => {
  const result = extractParseResultSource({
    ...baseDetail,
    parser_type: "LlamaIndex",
    json_content: {
      pages: [
        { md: "Page one", text: "Text one" },
        { md: "Page two", text: "Text two" },
      ],
    },
  });

  assert.equal(result?.text, "Page one\n\nPage two");
});

test("Google provider JSON extracts document text", () => {
  const result = extractParseResultSource({
    ...baseDetail,
    parser_type: "Google",
    json_content: { document: { text: "Google document" } },
  });

  assert.equal(result?.text, "Google document");
});

test("invalid legacy JSON remains usable as text", () => {
  const result = extractParseResultSource({
    ...baseDetail,
    text_content: "{not valid json",
  });

  assert.equal(result?.text, "{not valid json");
});

test("empty stored results do not create a source", () => {
  assert.equal(extractParseResultSource(baseDetail), null);
});
