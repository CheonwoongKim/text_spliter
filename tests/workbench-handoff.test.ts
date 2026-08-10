import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSplitterHandoff,
  parseRunEngineLabel,
  resolveHandoffText,
} from "@/lib/workbench-handoff";
import type { ParseResponse } from "@/lib/types";

function run(overrides: Partial<ParseResponse> = {}): ParseResponse {
  return {
    text: "plain text result",
    run: {
      id: "run-1",
      engineId: "upstage-document-parse",
      provider: "Upstage",
      status: "succeeded",
      config: {},
      startedAt: "2026-08-10T00:00:00.000Z",
    },
    metadata: {
      fileName: "report.pdf",
      fileSize: 2048,
      mimeType: "application/pdf",
      processingTime: 1200,
      parserType: "Upstage",
      documentHash: "a".repeat(64),
    },
    ...overrides,
  };
}

test("handoff text prefers Document IR markdown over provider-level fallbacks", () => {
  const handoff = buildSplitterHandoff(run({
    markdown: "# run level",
    document: {
      schemaVersion: "1.0",
      markdown: "# normalized",
      pages: [],
      statistics: {
        pageCount: 0,
        blockCount: 0,
        tableCount: 0,
        figureCount: 0,
        formulaCount: 0,
      },
    },
  }));

  assert.equal(handoff?.text, "# normalized");
});

test("handoff falls back through markdown, text, and page content", () => {
  assert.equal(resolveHandoffText(run({ markdown: "# md", text: "txt" })), "# md");
  assert.equal(resolveHandoffText(run({ markdown: undefined, text: "txt" })), "txt");
  assert.equal(
    resolveHandoffText(run({
      markdown: undefined,
      text: undefined,
      pages: [
        { pageNumber: 1, markdown: "page one" },
        { pageNumber: 2, text: "page two" },
      ],
    })),
    "page one\n\npage two",
  );
});

test("handoff preserves the provenance later stages score against", () => {
  const handoff = buildSplitterHandoff(run());

  assert.deepEqual(handoff?.sourceMetadata, {
    fileName: "report.pdf",
    parserType: "Upstage",
    parseRunId: "run-1",
    documentHash: "a".repeat(64),
    engineId: "upstage-document-parse",
    originalJson: undefined,
  });
});

test("a run without usable text is rejected instead of handing over an empty source", () => {
  assert.equal(buildSplitterHandoff(run({ text: undefined })), null);
  assert.equal(buildSplitterHandoff(run({ text: "   \n  " })), null);
});

test("engine labels fall back when a legacy run has no stored identity", () => {
  assert.equal(parseRunEngineLabel(run(), 0), "upstage-document-parse");
  assert.equal(
    parseRunEngineLabel({ ...run(), run: undefined }, 0),
    "Upstage",
  );
  assert.equal(
    parseRunEngineLabel({ text: "only text" }, 3),
    "Run 4",
  );
});
