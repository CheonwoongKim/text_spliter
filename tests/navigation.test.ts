import assert from "node:assert/strict";
import test from "node:test";

import {
  APP_MENU_IDS,
  APP_MENU_META,
  APP_MENU_SECTIONS,
  DEFAULT_APP_MENU,
  TOP_BAR_MENU_IDS,
  getAppMenuBreadcrumbs,
  normalizeAppMenu,
} from "../lib/navigation";

test("the sidebar reads top to bottom as the pipeline itself", () => {
  assert.deepEqual(
    APP_MENU_SECTIONS.map((section) => ({
      id: section.id,
      menuIds: [...section.menuIds],
    })),
    [
      {
        id: "pipeline",
        menuIds: ["files", "parser", "splitter", "vectorstore", "ask"],
      },
      { id: "evaluate", menuIds: ["evaluation", "document-eval"] },
      { id: "resources", menuIds: ["storage", "memory"] },
    ],
  );
  assert.deepEqual([...TOP_BAR_MENU_IDS], ["settings", "mypage"]);
});

test("a document comes first and a question comes last in the pipeline", () => {
  const pipeline = APP_MENU_SECTIONS.find((section) => section.id === "pipeline");

  assert.equal(pipeline?.menuIds[0], "files", "an experiment starts from a document");
  assert.equal(pipeline?.menuIds.at(-1), "ask", "the pipeline exists to answer a question");
});

test("saved artifacts sit outside the pipeline so an archive is not read as a step", () => {
  const pipeline = APP_MENU_SECTIONS.find((section) => section.id === "pipeline");
  const resources = APP_MENU_SECTIONS.find((section) => section.id === "resources");

  assert.ok(!pipeline?.menuIds.includes("storage"));
  assert.ok(resources?.menuIds.includes("storage"));
});

test("every menu appears exactly once across the sidebar and top bar", () => {
  const placed = [
    ...APP_MENU_SECTIONS.flatMap((section) => section.menuIds),
    ...TOP_BAR_MENU_IDS,
  ];

  assert.equal(new Set(placed).size, placed.length, "a menu must not be listed twice");
  assert.deepEqual([...placed].sort(), [...APP_MENU_IDS].sort(), "no menu may be unreachable");
});

test("navigation defaults safely and carries renamed menus forward", () => {
  assert.equal(DEFAULT_APP_MENU, "parser");
  assert.equal(normalizeAppMenu("vectorstore"), "vectorstore");
  assert.equal(normalizeAppMenu("ask"), "ask");
  assert.equal(normalizeAppMenu("document-eval"), "document-eval");
  assert.equal(normalizeAppMenu("memory"), "memory");
  // Values a returning user may still have stored.
  assert.equal(normalizeAppMenu("licenses"), "settings");
  assert.equal(normalizeAppMenu("runs"), "storage");
  assert.equal(normalizeAppMenu("rag"), "ask");
  assert.equal(normalizeAppMenu("parse-detail"), "parser");
  assert.equal(normalizeAppMenu(null), "parser");
});

test("menu labels are Korean and short enough for the narrow sidebar", () => {
  for (const menu of APP_MENU_IDS) {
    const meta = APP_MENU_META[menu];
    assert.match(meta.shortLabel, /[가-힣]/, `${menu} needs a Korean sidebar label`);
    assert.match(meta.title, /[가-힣]/, `${menu} needs a Korean title`);
    assert.match(meta.breadcrumbRoot, /[가-힣]/, `${menu} needs a Korean breadcrumb root`);
  }

  for (const section of APP_MENU_SECTIONS) {
    for (const menu of section.menuIds) {
      assert.ok(
        APP_MENU_META[menu].shortLabel.length <= 5,
        `${menu} label "${APP_MENU_META[menu].shortLabel}" is too long for the sidebar`,
      );
    }
  }
});

test("the two evaluation axes are named apart so neither is mistaken for the other", () => {
  assert.equal(APP_MENU_META.evaluation.title, "답변 평가");
  assert.equal(APP_MENU_META["document-eval"].title, "파서 평가");
  assert.notEqual(
    APP_MENU_META.files.shortLabel,
    APP_MENU_META["document-eval"].shortLabel,
    "source documents and parser evaluation must not share a label",
  );
});

test("breadcrumbs place each menu under the section it belongs to", () => {
  assert.deepEqual(getAppMenuBreadcrumbs("files"), ["파이프라인", "문서"]);
  assert.deepEqual(getAppMenuBreadcrumbs("ask"), ["파이프라인", "RAG 질의"]);
  assert.deepEqual(getAppMenuBreadcrumbs("document-eval"), ["평가", "파서 평가"]);
  assert.deepEqual(getAppMenuBreadcrumbs("storage"), ["자료", "보관함"]);
  assert.deepEqual(getAppMenuBreadcrumbs("settings"), ["워크스페이스", "설정"]);
});
