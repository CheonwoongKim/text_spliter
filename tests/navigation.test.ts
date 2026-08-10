import assert from "node:assert/strict";
import test from "node:test";

import {
  APP_MENU_META,
  APP_MENU_SECTIONS,
  DEFAULT_APP_MENU,
  TOP_BAR_MENU_IDS,
  getAppMenuBreadcrumbs,
  normalizeAppMenu,
} from "../lib/navigation";

test("application navigation follows the document workflow", () => {
  assert.deepEqual(
    APP_MENU_SECTIONS.map((section) => ({
      id: section.id,
      menuIds: [...section.menuIds],
    })),
    [
      {
        id: "workflow",
        menuIds: ["parser", "splitter", "storage", "vectorstore", "evaluation"],
      },
      { id: "resources", menuIds: ["files", "memory"] },
    ],
  );
  assert.deepEqual([...TOP_BAR_MENU_IDS], ["settings", "mypage"]);
});

test("navigation defaults safely to Parser", () => {
  assert.equal(DEFAULT_APP_MENU, "parser");
  assert.equal(normalizeAppMenu("vectorstore"), "vectorstore");
  assert.equal(normalizeAppMenu("mypage"), "mypage");
  assert.equal(normalizeAppMenu("memory"), "memory");
  assert.equal(normalizeAppMenu("licenses"), "settings");
  assert.equal(normalizeAppMenu("parse-detail"), "parser");
  assert.equal(normalizeAppMenu(null), "parser");
});

test("technical abbreviations are not exposed as menu titles", () => {
  assert.equal(APP_MENU_META.storage.title, "Runs");
  assert.equal(APP_MENU_META.vectorstore.title, "Vector Store");
  assert.equal(APP_MENU_META.evaluation.title, "Evaluation");
  assert.equal(APP_MENU_META.memory.title, "Memory Guide");
  assert.equal(APP_MENU_META.settings.title, "Settings");
  assert.equal(APP_MENU_META.mypage.title, "My Page");
});

test("top bar breadcrumbs follow each menu hierarchy", () => {
  assert.deepEqual(getAppMenuBreadcrumbs("parser"), ["Workflow", "Parser"]);
  assert.deepEqual(getAppMenuBreadcrumbs("files"), ["Resources", "Files"]);
  assert.deepEqual(getAppMenuBreadcrumbs("memory"), ["Resources", "Memory Guide"]);
  assert.deepEqual(getAppMenuBreadcrumbs("settings"), ["Workspace", "Settings"]);
  assert.deepEqual(getAppMenuBreadcrumbs("mypage"), ["Account", "My Page"]);
});
