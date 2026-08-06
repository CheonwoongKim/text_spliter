import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const tokens = readFileSync("styles/design-tokens.css", "utf8");
const tailwind = readFileSync("tailwind.config.ts", "utf8");

function tokenNames(prefix: string) {
  return [...tokens.matchAll(new RegExp(`--${prefix}-([a-z0-9-]+):`, "g"))]
    .map((match) => match[1]);
}

test("typography is limited to five sizes between 12px and 24px", () => {
  assert.deepEqual(tokenNames("ds-font-size"), ["xs", "base", "lg", "xl", "2xl"]);
  assert.match(tokens, /--ds-font-size-xs: 0\.75rem/);
  assert.match(tokens, /--ds-font-size-2xl: 1\.5rem/);
  assert.doesNotMatch(tokens, /--ds-font-size-(?:micro|2xs|caption|sm|3xl)/);
});

test("spacing and radius expose only the approved scales", () => {
  assert.deepEqual(tokenNames("ds-space"), ["1", "2", "3", "4", "6", "8", "10", "12", "16"]);
  assert.deepEqual(tokenNames("ds-radius"), ["sm", "lg", "xl", "full"]);
});

test("themes expose only neutral, accent, and meaningful status colors", () => {
  for (const token of [
    "--ds-color-bg-canvas",
    "--ds-color-fg-default",
    "--ds-color-accent",
    "--ds-color-success",
    "--ds-color-warning",
    "--ds-color-danger",
  ]) {
    assert.match(tokens, new RegExp(`${token}:`), `missing ${token}`);
  }
  assert.match(tokens, /\.dark\s*\{/);
  assert.doesNotMatch(tokens, /--ds-color-info|--ds-(?:neutral|blue)-/);
});

test("Tailwind replaces permissive default color and typography palettes", () => {
  assert.match(tailwind, /theme:\s*\{\s*colors:/);
  assert.match(tailwind, /fontSize:\s*\{/);
  assert.match(tailwind, /danger:\s*\{/);
  assert.doesNotMatch(tailwind, /--ds-font-size-(?:micro|caption|sm|3xl)/);
});
