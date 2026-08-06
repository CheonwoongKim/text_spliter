import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_THEME,
  normalizeTheme,
  THEME_BOOTSTRAP_SCRIPT,
  THEME_STORAGE_KEY,
} from "../lib/theme";

test("theme preference defaults to light unless dark was explicitly saved", () => {
  assert.equal(DEFAULT_THEME, "light");
  assert.equal(normalizeTheme(null), "light");
  assert.equal(normalizeTheme("light"), "light");
  assert.equal(normalizeTheme("system"), "light");
  assert.equal(normalizeTheme("dark"), "dark");
});

test("theme bootstrap restores the same persisted preference before hydration", () => {
  assert.match(THEME_BOOTSTRAP_SCRIPT, new RegExp(THEME_STORAGE_KEY));
  assert.match(THEME_BOOTSTRAP_SCRIPT, /storedTheme === "dark"/);
  assert.match(THEME_BOOTSTRAP_SCRIPT, /classList\.toggle\("dark", isDark\)/);
});
