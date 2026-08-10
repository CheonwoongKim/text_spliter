import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const filesPanel = readFileSync("components/storage/FilesPanel.tsx", "utf8");

test("the document library uses a table instead of a card grid", () => {
  assert.match(filesPanel, /<table className="w-full table-fixed">/);
  assert.match(filesPanel, />\s*이름\s*</);
  assert.match(filesPanel, />\s*유형\s*</);
  assert.match(filesPanel, />\s*크기\s*</);
  assert.match(filesPanel, />\s*업로드 일시\s*</);
  assert.doesNotMatch(filesPanel, /Folder Cards|File Cards/);
});

test("file rows keep preview, download, and delete actions accessible", () => {
  assert.match(filesPanel, /onClick=\{\(\) => handlePreview\(file\)\}/);
  assert.match(filesPanel, /aria-label=\{`\$\{file\.displayName\} 다운로드`\}/);
  assert.match(filesPanel, /aria-label=\{`\$\{file\.displayName\} 삭제`\}/);
});
