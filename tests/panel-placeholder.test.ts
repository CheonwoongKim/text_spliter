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
