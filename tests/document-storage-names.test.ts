import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  fileNameFromDocumentKey,
  originalNameFromStoredName,
  storedNameFromFileName,
} from "@/lib/document-name";

/**
 * A document is stored under `{sha256}-{name}`, and that string travels in the
 * URL path of the upload request. `# AIM 사전 질의서.docx` was therefore stored
 * under a name with nothing after the hash — the `#` ended the URL — and the
 * upload still reported success. The file list then dropped the entry, because
 * it hides anything it cannot name, so the document was gone with no error
 * anywhere.
 */
const HASH = "a".repeat(64);
const key = (name: string) => `owner-id/${HASH}-${name}`;

test("a name that cannot survive a URL is not put in one", () => {
  for (const name of ["# AIM 사전 질의서.docx", "질문?목록.pdf", "a#b.txt"]) {
    const stored = storedNameFromFileName(name);

    assert.doesNotMatch(stored, /[#?]/, `${name} would be cut short in the request URL`);
  }
});

test("a name Supabase Storage would reject as a key is not used as one", () => {
  // Supabase accepts only this ASCII set in an object key.
  const SUPABASE_KEY_SAFE = /^[A-Za-z0-9_!\-.*'() &$@=;:+,?]+$/;

  for (const name of ["보고서.pdf", "# AIM 사전 질의서.docx", "테스트 문서.txt", "café.pdf"]) {
    assert.match(
      storedNameFromFileName(name),
      SUPABASE_KEY_SAFE,
      `${name} is rejected outright with "Invalid key"`,
    );
  }
});

test("the uploaded name comes back exactly, whatever it was", () => {
  for (const name of [
    "# AIM 사전 질의서.docx",
    "보고서 (최종) 2026.pdf",
    "report.pdf",
    "a b(1).pdf",
    "!important.txt",
    "질문?목록.pdf",
  ]) {
    assert.equal(originalNameFromStoredName(`${HASH}-${storedNameFromFileName(name)}`), name);
  }
});

test("a name that is already a safe key stays readable in storage", () => {
  assert.equal(storedNameFromFileName("report.pdf"), "report.pdf");
  assert.equal(storedNameFromFileName("a b(1).pdf"), "a b(1).pdf");
});

test("a name is never empty, so a key never ends at the hash", () => {
  for (const name of ["", "   ", "/", "\\"]) {
    assert.notEqual(storedNameFromFileName(name), "");
  }
});

test("a key whose name part is empty never yields an empty name", () => {
  const name = fileNameFromDocumentKey(key(""));

  assert.notEqual(name, "", "an empty name removes the file from the list entirely");
});

test("a key without the hash prefix is returned as it is", () => {
  assert.equal(fileNameFromDocumentKey("owner-id/legacy-name.pdf"), "legacy-name.pdf");
});

test("the file list keeps an entry it cannot name", () => {
  const panel = readFileSync("components/storage/FilesPanel.tsx", "utf8");

  assert.doesNotMatch(
    panel,
    /return relativePath && !relativePath\.includes\('\/'\);/,
    "filtering on a truthy name hides a stored file that has no recoverable name",
  );
  assert.match(
    panel,
    /displayName: relativePath \|\| file\.storage_key/,
    "an unnamed file falls back to its storage key so the row stays reachable",
  );
});
