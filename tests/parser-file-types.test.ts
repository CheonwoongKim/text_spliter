import assert from "node:assert/strict";
import test from "node:test";

import {
  getParserFileTypeProfile,
  isParserFileSupported,
} from "../lib/parser-file-types";

test("parser file profile uses the formats supported by every selected engine", () => {
  const doclingOnly = getParserFileTypeProfile(["Docling"]);
  const mixedBatch = getParserFileTypeProfile(["Docling", "Upstage"]);

  assert.equal(doclingOnly.extensions.includes(".txt"), true);
  assert.equal(doclingOnly.extensions.includes(".xlsx"), true);
  assert.equal(mixedBatch.extensions.includes(".txt"), false);
  assert.equal(mixedBatch.accept, ".pdf,.png,.jpg,.jpeg,.docx,.pptx");
});

test("storage files cannot bypass the selected parser format restrictions", () => {
  assert.equal(isParserFileSupported("document.TXT", ["Upstage"]), false);
  assert.equal(isParserFileSupported("document.TXT", ["Docling"]), true);
  assert.equal(isParserFileSupported("report.pdf", ["Docling", "Azure"]), true);
  assert.equal(isParserFileSupported("report.pdf.exe", ["Docling"]), false);
});
