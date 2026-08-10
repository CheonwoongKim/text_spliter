import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * Every workbench page is framed by the same shell.
 *
 * Before this existed, three pages used `<header>`, five a bare `<div>`, two
 * nothing at all, and the same page title appeared at three different sizes.
 * None of that is visible on one screen; all of it is obvious when a user
 * moves between menus.
 */
const SHELL = "components/shared/PagePanel.tsx";

/** Pages that own a full menu and therefore carry the page frame. */
const MENU_PANELS = [
  "components/storage/FilesPanel.tsx",
  "components/evaluation/EvaluationPanel.tsx",
  "components/evaluation/DocumentEvaluationPanel.tsx",
  "components/settings/SettingsPanel.tsx",
] as const;

function source(path: string): string {
  return readFileSync(path, "utf8");
}

test("the shell decides the frame, so a page cannot redeclare it", () => {
  const shell = source(SHELL);

  assert.match(shell, /px-4 sm:px-6 lg:px-10/, "one gutter is declared for every page");
  assert.match(shell, /<h1 className="text-base font-semibold/, "one page title size");
  assert.match(shell, /<header/, "the page heading is a landmark");
});

test("menu pages are framed by the shell rather than their own markup", () => {
  for (const path of MENU_PANELS) {
    const panel = source(path);

    assert.match(panel, /<PagePanel/, `${path} must be framed by the shell`);
    assert.doesNotMatch(
      panel,
      /<h1 className/,
      `${path} declares its own page title; the shell owns it`,
    );
    assert.doesNotMatch(
      panel,
      /border-b border-border-subtle bg-card px-4/,
      `${path} declares its own page header; the shell owns it`,
    );
  }
});

test("the segmented switch is shared and announces selection", () => {
  const tabs = source("components/shared/TabBar.tsx");

  assert.match(tabs, /role="tablist"/);
  assert.match(tabs, /role="tab"/);
  assert.match(tabs, /aria-selected=\{selected\}/);
  assert.match(
    tabs,
    /selected[\s\S]{0,120}font-semibold/,
    "selection is carried by weight, not colour alone",
  );
});
