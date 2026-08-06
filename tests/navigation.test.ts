import assert from "node:assert/strict";
import test from "node:test";

import {
  APP_MENU_META,
  APP_MENU_SECTIONS,
  DEFAULT_APP_MENU,
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
      { id: "resources", menuIds: ["files"] },
      { id: "system", menuIds: ["settings"] },
    ],
  );
});

test("navigation defaults safely to Parser", () => {
  assert.equal(DEFAULT_APP_MENU, "parser");
  assert.equal(normalizeAppMenu("vectorstore"), "vectorstore");
  assert.equal(normalizeAppMenu("licenses"), "settings");
  assert.equal(normalizeAppMenu("parse-detail"), "parser");
  assert.equal(normalizeAppMenu(null), "parser");
});

test("technical abbreviations are not exposed as menu titles", () => {
  assert.equal(APP_MENU_META.storage.title, "Runs");
  assert.equal(APP_MENU_META.vectorstore.title, "Vector Store");
  assert.equal(APP_MENU_META.evaluation.title, "Evaluation");
  assert.equal(APP_MENU_META.settings.title, "Settings");
});
