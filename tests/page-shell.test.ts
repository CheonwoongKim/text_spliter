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

test("the page heading is declared once, in the top bar", () => {
  const shell = source(SHELL);
  const header = source("components/layout/Header.tsx");

  assert.match(shell, /px-4 sm:px-6 lg:px-10/, "one gutter is declared for every page");
  assert.doesNotMatch(
    shell,
    /<h1/,
    "the last breadcrumb already names the page; repeating it costs a line everywhere",
  );
  assert.match(header, /<h1[\s\S]{0,120}text-base font-semibold/, "the top bar carries it");
  assert.match(header, /aria-current="page"/);
});

test("a page with nothing of its own renders no second header", () => {
  const shell = source(SHELL);

  assert.match(
    shell,
    /\(description \|\| actions \|\| toolbar\) && \(/,
    "an empty header bar is just a divider taking up room",
  );
});

test("menu pages are framed by the shell rather than their own markup", () => {
  for (const path of MENU_PANELS) {
    const panel = source(path);

    assert.match(panel, /<PagePanel/, `${path} must be framed by the shell`);
    assert.doesNotMatch(
      panel,
      /<h1/,
      `${path} declares its own page title; the top bar owns it`,
    );
    assert.doesNotMatch(
      panel,
      /<PagePanel[^>]*\n\s*title="/,
      `${path} passes a title to the shell, which no longer renders one`,
    );
    assert.doesNotMatch(
      panel,
      /border-b border-border-subtle bg-card px-4/,
      `${path} declares its own page header; the shell owns it`,
    );
  }
});

/**
 * A body that hides its own overflow is saying "my child scrolls". The child
 * does that with flex-1, which is inert unless this element is the flex
 * container — and then the child sizes to its content, overflows a fixed-height
 * parent, and is clipped with no way to reach the rest.
 */
test("a body that delegates scrolling is a flex container", () => {
  const shell = source(SHELL);

  assert.match(
    shell,
    /bodyScroll === "auto" \? "overflow-y-auto" : "flex flex-col overflow-hidden"/,
    "a flex-1 child needs a flex parent or its height collapses to content",
  );

  // Every page that delegates scrolling relies on this.
  for (const path of MENU_PANELS) {
    const panel = source(path);
    if (!/bodyScroll="hidden"/.test(panel)) continue;
    assert.match(panel, /<PagePanel/, `${path} must be framed by the shell`);
  }
});

test("the pipeline stages share one two-column frame", () => {
  const split = source("components/shared/SplitWorkspace.tsx");
  const page = source("app/page.tsx");

  assert.match(split, /aria-label=\{settingsLabel\}/, "the settings column is a landmark");
  assert.match(split, /aria-label=\{resultLabel\}/, "so the result can be reached directly");
  assert.match(split, /<aside/);
  assert.match(split, /<section/);

  assert.equal(
    [...page.matchAll(/<SplitWorkspace/g)].length,
    3,
    "parsing, chunking, and indexing all use it",
  );
  assert.doesNotMatch(
    page,
    /grid-cols-1 lg:grid-cols-10/,
    "the page must not declare the split grid itself any more",
  );
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
