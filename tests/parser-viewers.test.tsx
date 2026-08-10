import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import MarkdownViewer from "../components/parser/MarkdownViewer";
import { normalizeJsonViewerValue } from "../lib/json-view";

test("Markdown viewer renders GFM headings, lists, and tables", () => {
  const markup = renderToStaticMarkup(
    React.createElement(MarkdownViewer, {
      content: "# Report\n\n- Item\n\n| Key | Value |\n| --- | --- |\n| Pages | 12 |",
    }),
  );

  assert.match(markup, /<h1/);
  assert.match(markup, /<ul/);
  assert.match(markup, /<table/);
  assert.match(markup, /Pages/);
});

test("JSON viewer normalizes serialized and malformed payloads without throwing", () => {
  assert.deepEqual(normalizeJsonViewerValue('{"pages":12}'), { pages: 12 });
  assert.deepEqual(normalizeJsonViewerValue("{invalid"), { value: "{invalid" });
  assert.deepEqual(normalizeJsonViewerValue(null), { value: null });
});
