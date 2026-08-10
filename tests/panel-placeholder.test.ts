import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * A panel with nothing in it is the first thing a new user sees, and it was the
 * least consistent surface in the app: some screens named a fact ("No result
 * yet"), others named a next step. The second costs nothing more to write.
 */
const placeholder = readFileSync("components/shared/PanelPlaceholder.tsx", "utf8");

const MIGRATED = [
  "components/splitter/RightPanel.tsx",
  "components/vectorstore/RagRunHistory.tsx",
  "components/vectorstore/VectorStoreRightPanel.tsx",
  "components/vectorstore/RagTestPanel.tsx",
  "components/parser/ParserRightPanel.tsx",
  "components/storage/StorageResultsTables.tsx",
  "components/evaluation/EvaluationRunsView.tsx",
  "components/evaluation/GoldenCaseEditor.tsx",
] as const;

test("loading and empty share one slot, because screens always wrote them as one", () => {
  assert.match(placeholder, /loading\?: boolean/);
  assert.match(placeholder, /LoaderCircle/);
  assert.match(placeholder, /aria-busy=\{loading \|\| undefined\}/);
  assert.match(placeholder, /aria-live=\{loading \? "polite" : undefined\}/);
});

test("an action is offered but never while still loading", () => {
  assert.match(
    placeholder,
    /action && !loading/,
    "offering a button mid-load invites a click that cannot mean anything yet",
  );
});

test("migrated panels no longer hand-build the placeholder", () => {
  for (const path of MIGRATED) {
    const source = readFileSync(path, "utf8");

    assert.match(source, /<PanelPlaceholder/, `${path} must use the shared placeholder`);
    assert.doesNotMatch(
      source,
      /flex h-full flex-col items-center justify-center text-center/,
      `${path} still hand-builds a centred placeholder`,
    );
  }
});

test("placeholders tell the reader what to do next", () => {
  const splitter = readFileSync("components/splitter/RightPanel.tsx", "utf8");
  const vectors = readFileSync("components/vectorstore/VectorStoreRightPanel.tsx", "utf8");

  assert.match(splitter, /description=\{loading[\s\S]{0,200}분할기를 골라 실행/);
  assert.match(vectors, /Send to VDB/, "an empty collection names the step that fills it");
});

/**
 * An empty list should still look like the list. Replacing the whole view with
 * a centred message hides the shape of what will appear and makes the layout
 * jump the moment the first row lands.
 */
test("an empty list keeps its own structure instead of being replaced", () => {
  const files = readFileSync("components/storage/FilesPanel.tsx", "utf8");
  const tables = readFileSync("components/storage/StorageResultsTables.tsx", "utf8");

  assert.match(
    files,
    /grid grid-cols-1[\s\S]{0,400}col-span-full/,
    "the file grid stays and the notice sits inside it",
  );
  assert.doesNotMatch(
    files,
    /files\.length === 0 \? \(\s*<div className="flex flex-col items-center/,
    "an empty file list must not swap the grid out for a centred block",
  );

  assert.match(tables, /<td colSpan=\{colSpan\}/, "the table keeps its columns when empty");
});

test("empty lists name the step that fills them", () => {
  const tables = readFileSync("components/storage/StorageResultsTables.tsx", "utf8");
  const files = readFileSync("components/storage/FilesPanel.tsx", "utf8");

  assert.match(tables, /파싱 화면에서 결과를 저장하면/);
  assert.match(tables, /청킹 화면에서 Save를 누르면/);
  assert.match(files, /문서를 올리면 파싱·청킹 실험의 원본으로/);
});
