import assert from "node:assert/strict";
import test from "node:test";

import { resolveVisionInputMode } from "../lib/document-vision";

test("PDF stays native for providers with direct PDF support", () => {
  for (const engineType of ["OpenAI Vision", "Gemini Vision", "Claude Vision"] as const) {
    assert.equal(
      resolveVisionInputMode({
        engineType,
        filename: "report.pdf",
        mimeType: "application/pdf",
      }),
      "native-document"
    );
  }
});

test("PDF becomes page images only when required or explicitly requested", () => {
  assert.equal(
    resolveVisionInputMode({
      engineType: "Qwen Vision",
      filename: "report.pdf",
      mimeType: "application/pdf",
    }),
    "rasterized-fallback"
  );
  assert.equal(
    resolveVisionInputMode({
      engineType: "OpenAI Vision",
      filename: "report.pdf",
      mimeType: "application/pdf",
      inputPreference: "page-images",
    }),
    "rasterized-fallback"
  );
});

test("office and HWP documents use direct native page capture", () => {
  for (const filename of ["report.doc", "report.docx", "report.hwp", "report.hwpx"] as const) {
    assert.equal(
      resolveVisionInputMode({
        engineType: "Claude Vision",
        filename,
        mimeType: "application/octet-stream",
      }),
      "native-page-capture"
    );
  }
});

test("uploaded images are passed through without conversion", () => {
  assert.equal(
    resolveVisionInputMode({
      engineType: "Qwen Vision",
      filename: "scan.webp",
      mimeType: "image/webp",
    }),
    "original-image"
  );
});
