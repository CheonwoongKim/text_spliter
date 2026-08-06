import assert from "node:assert/strict";
import test from "node:test";

import { buildParserExperimentEngines } from "../lib/parser-experiment";

test("parser experiments always run the primary engine first", () => {
  assert.deepEqual(buildParserExperimentEngines("Azure", []), ["Azure"]);
  assert.deepEqual(
    buildParserExperimentEngines("Docling", ["Upstage", "Google"]),
    ["Docling", "Upstage", "Google"]
  );
});

test("parser experiments never execute an engine more than once", () => {
  assert.deepEqual(
    buildParserExperimentEngines("Upstage", [
      "Azure",
      "Upstage",
      "Azure",
      "Docling",
    ]),
    ["Upstage", "Azure", "Docling"]
  );
});

test("document experiments can compare parsers and vision models in order", () => {
  assert.deepEqual(
    buildParserExperimentEngines("Upstage", [
      "OpenAI Vision",
      "Qwen Vision",
      "OpenAI Vision",
    ]),
    ["Upstage", "OpenAI Vision", "Qwen Vision"]
  );
});
