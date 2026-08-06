import assert from "node:assert/strict";
import test from "node:test";

import {
  createDefaultParserEngineConfigMap,
  normalizeParserEngineConfig,
  summarizeParserEngineConfig,
} from "../lib/parser-engine-settings";

test("parser engine defaults are explicit and isolated per engine", () => {
  const configs = createDefaultParserEngineConfigMap();

  assert.deepEqual(configs.Azure, {
    azureModelId: "prebuilt-layout",
    azureOutputFormat: "markdown",
  });
  assert.equal(configs.LlamaIndex.llamaTier, "agentic");
  assert.equal(configs.Docling.doclingTableMode, "accurate");
  assert.notEqual(configs.Upstage, configs.Google);
});

test("parser engine settings discard unrelated fields and resolve defaults", () => {
  assert.deepEqual(
    normalizeParserEngineConfig("Azure", {
      azureModelId: "unknown",
      azureOutputFormat: "text",
      llamaTier: "fast",
    }),
    {
      azureModelId: "prebuilt-layout",
      azureOutputFormat: "text",
    }
  );

  assert.deepEqual(normalizeParserEngineConfig("Google", { llamaTier: "fast" }), {});
});

test("parser engine summaries expose the settings applied to a batch", () => {
  assert.equal(
    summarizeParserEngineConfig("Docling", {
      doclingPipeline: "vlm",
      doclingOcrMode: "force",
      doclingTableMode: "fast",
    }),
    "vlm · force OCR · fast"
  );
});
