import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * Comparison tables are the workbench's main reading surface, and three screens
 * had copied the same CSS-grid markup with the column widths drifting apart.
 * These check the shared table keeps the properties those copies each had to
 * remember on their own.
 */
const table = readFileSync("components/shared/DataTable.tsx", "utf8");

test("the table announces itself to assistive technology", () => {
  for (const role of ['role="table"', 'role="row"', 'role="columnheader"', 'role="cell"']) {
    assert.ok(table.includes(role), `a grid table must supply ${role}`);
  }
  assert.match(table, /aria-label=\{caption\}/);
});

test("a wide table scrolls instead of squashing its columns", () => {
  assert.match(table, /overflow-x-auto/);
  assert.match(table, /minWidth/, "the caller sets the width below which it scrolls");
});

test("column widths stay with the caller, since they are a judgement about data", () => {
  assert.match(table, /gridTemplateColumns: columns\.map/);
  assert.doesNotMatch(
    table,
    /grid-cols-\[/,
    "hardcoding a track list here would just move the copies inside the primitive",
  );
});

test("an empty table renders a message rather than a blank box", () => {
  assert.match(table, /rows\.length === 0 && empty/);
});

test("screens use the shared table rather than rebuilding the grid", () => {
  const migrated = [
    "components/evaluation/ParserImpactView.tsx",
    "components/splitter/SplitterResultsOverview.tsx",
  ];

  for (const path of migrated) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /<DataTable/, `${path} must use the shared table`);
    assert.doesNotMatch(
      source,
      /border-l border-border-subtle px-3 py-2 text-xs font-medium/,
      `${path} still hand-builds header cells`,
    );
  }
});
