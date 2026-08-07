import assert from "node:assert/strict";
import test from "node:test";

import { SPLITTER_TYPES } from "../lib/types";
import { splitText } from "../lib/splitters";
import { validateSplitterType } from "../lib/validation";

test("splitter validation uses the same options exposed by the UI", () => {
  for (const splitterType of SPLITTER_TYPES) {
    assert.equal(validateSplitterType(splitterType), splitterType);
  }

  assert.throws(() => validateSplitterType("PythonCodeTextSplitter"));
  assert.throws(() => validateSplitterType("RecursiveJsonSplitter"));
});

test("application language aliases are accepted by the code splitter", async () => {
  for (const language of ["ts", "kotlin", "csharp"] as const) {
    const result = await splitText("class Example { run() { return true; } }", {
      splitterType: "CodeSplitter",
      chunkSize: 30,
      chunkOverlap: 0,
      language,
    });

    assert.ok(result.totalChunks > 0, `${language} should produce at least one chunk`);
  }
});
