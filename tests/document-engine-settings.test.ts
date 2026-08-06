import assert from "node:assert/strict";
import test from "node:test";

import { DOCUMENT_ENGINE_TYPES } from "../lib/constants";
import {
  createDefaultDocumentEngineConfigMap,
  normalizeDocumentEngineConfig,
  summarizeDocumentEngineConfig,
} from "../lib/document-engine-settings";

test("document engine settings include parser and vision profiles", () => {
  const configs = createDefaultDocumentEngineConfigMap();
  assert.deepEqual(Object.keys(configs), [...DOCUMENT_ENGINE_TYPES]);
  assert.equal(configs["OpenAI Vision"].modelId, "gpt-5.6-sol");
  assert.equal(configs["Qwen Vision"].modelId, "qwen3-vl-plus");
  assert.equal(configs["Gemini Vision"].inputPreference, "auto");
});

test("vision settings are bounded and discard unrelated parser fields", () => {
  assert.deepEqual(
    normalizeDocumentEngineConfig("Claude Vision", {
      modelId: "  claude-custom  ",
      inputPreference: "unsupported",
      pdfDetail: "low",
      maxOutputTokens: 999999,
      azureModelId: "prebuilt-read",
      prompt: "  faithful markdown  ",
    }),
    {
      modelId: "claude-custom",
      inputPreference: "auto",
      pdfDetail: "low",
      maxOutputTokens: 64000,
      prompt: "faithful markdown",
    }
  );
});

test("vision summaries expose model and input policy", () => {
  assert.equal(
    summarizeDocumentEngineConfig("Qwen Vision", {
      modelId: "qwen3-vl-plus",
      inputPreference: "page-images",
    }),
    "qwen3-vl-plus · Page images"
  );
});

test("Qwen cannot persist an unsupported native PDF mode", () => {
  assert.equal(
    normalizeDocumentEngineConfig("Qwen Vision", {
      inputPreference: "native-document",
    }).inputPreference,
    "auto"
  );
});
