import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import ParserResultsOverview, {
  parserRunFormats,
} from "../components/parser/ParserResultsOverview";
import ParserFocusWorkbench from "../components/parser/ParserFocusWorkbench";
import ParserRightPanel from "../components/parser/ParserRightPanel";
import type { ParseResponse } from "../lib/types";

const RUNS: ParseResponse[] = [
  {
    text: "Primary output",
    markdown: "# Primary output",
    metadata: {
      fileName: "report.pdf",
      fileSize: 1024,
      mimeType: "application/pdf",
      pageCount: 4,
      processingTime: 900,
      parserType: "LlamaIndex",
    },
    run: {
      id: "run-primary",
      engineId: "LlamaParse v2",
      provider: "LlamaIndex",
      status: "succeeded",
      config: {},
      role: "primary",
      startedAt: "2026-08-07T00:00:00.000Z",
    },
  },
  {
    html: "<p>Additional output</p>",
    json: { pages: 4 },
    metadata: {
      fileName: "report.pdf",
      fileSize: 1024,
      mimeType: "application/pdf",
      pageCount: 4,
      processingTime: 1200,
      parserType: "Azure",
    },
    run: {
      id: "run-additional",
      engineId: "Azure Document Intelligence",
      provider: "Microsoft Azure",
      status: "succeeded",
      config: {},
      role: "additional",
      startedAt: "2026-08-07T00:00:00.000Z",
    },
  },
];

test("parser results overview exposes every engine and multi-engine actions", () => {
  const markup = renderToStaticMarkup(
    <ParserResultsOverview
      runs={RUNS}
      loading={false}
      selectedRunId="run-primary"
      onOpenRun={() => undefined}
      onCompare={() => undefined}
      onOpenFocus={() => undefined}
    />,
  );

  assert.match(markup, /LlamaParse v2/);
  assert.match(markup, /Azure Document Intelligence/);
  assert.match(markup, /Primary/);
  assert.match(markup, /Additional/);
  assert.match(markup, /Full comparison/);
  assert.equal((markup.match(/상세/g) || []).length, 2);
});

test("parser result formats list every supported output without duplicates", () => {
  assert.deepEqual(parserRunFormats(RUNS[0]), ["Text", "Markdown"]);
  assert.deepEqual(parserRunFormats(RUNS[1]), ["HTML", "JSON"]);
});

test("focus review renders grouped evidence and explicit quality outcomes", () => {
  const markup = renderToStaticMarkup(
    <ParserFocusWorkbench
      runs={RUNS}
      selectedFile={null}
      reviews={{}}
      onReviewChange={() => undefined}
    />,
  );

  assert.match(markup, /Evidence queue/);
  assert.match(markup, /Spot check/);
  assert.match(markup, /Distinct result groups/);
  assert.match(markup, /alignment confidence/);
  assert.match(markup, /Your assessment/);
  assert.match(markup, /Pass/);
  assert.match(markup, /Partial/);
  assert.match(markup, /Fail/);
  assert.match(markup, /Unclear/);
});

test("empty parser state previews the complete multi-engine analysis workflow", () => {
  const markup = renderToStaticMarkup(
    <ParserRightPanel
      result={null}
      runs={[]}
      loading={false}
      selectedFile={null}
      config={{ parserType: "LlamaIndex" }}
    />,
  );

  assert.match(markup, /Sample experiment/);
  assert.match(markup, /LlamaParse v2/);
  assert.match(markup, /Azure Document Intelligence/);
  assert.match(markup, /Qwen Vision/);
  assert.match(markup, /Areas that need review/);
  assert.match(markup, /Focus review/);
  assert.match(markup, /Overview/);
  assert.match(markup, /Full compare/);
});
