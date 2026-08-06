import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const tokens = readFileSync("styles/design-tokens.css", "utf8");
const tailwind = readFileSync("tailwind.config.ts", "utf8");

function tokenNames(prefix: string) {
  return [...tokens.matchAll(new RegExp(`--${prefix}-([a-z0-9-]+):`, "g"))]
    .map((match) => match[1]);
}

test("typography has five core sizes and one navigation-only 11px size", () => {
  assert.deepEqual(tokenNames("ds-font-size"), ["2xs", "xs", "base", "lg", "xl", "2xl"]);
  assert.match(tokens, /--ds-font-size-2xs: 0\.6875rem/);
  assert.match(tokens, /--ds-font-size-xs: 0\.8125rem/);
  assert.match(tokens, /--ds-font-size-base: 0\.9375rem/);
  assert.match(tokens, /--ds-font-size-lg: 1\.0625rem/);
  assert.match(tokens, /--ds-font-size-2xl: 1\.5rem/);
  assert.doesNotMatch(tokens, /--ds-font-size-(?:micro|caption|sm|3xl)/);
});

test("Korean-first typography uses compact tracking and readable line height", () => {
  assert.match(tokens, /--ds-line-height-xs: 1\.25rem/);
  assert.match(tokens, /--ds-line-height-base: 1\.5rem/);
  assert.match(tokens, /--ds-letter-spacing-normal: -0\.01em/);
  assert.match(tokens, /--ds-letter-spacing-mono: 0/);
  assert.match(tokens, /--ds-layout-auth-width: 25rem/);
});

test("spacing and radius expose only the approved scales", () => {
  assert.deepEqual(tokenNames("ds-space"), ["1", "2", "3", "4", "6", "8", "10", "12", "16"]);
  assert.deepEqual(tokenNames("ds-radius"), ["sm", "lg", "xl", "full"]);
});

test("the single light palette exposes only neutral, accent, and meaningful status colors", () => {
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
  assert.doesNotMatch(tokens, /\.dark\s*\{/);
  assert.doesNotMatch(tokens, /--ds-color-info|--ds-(?:neutral|blue)-/);
});

test("Tailwind replaces permissive default color and typography palettes", () => {
  assert.match(tailwind, /theme:\s*\{\s*colors:/);
  assert.match(tailwind, /fontSize:\s*\{/);
  assert.match(tailwind, /danger:\s*\{/);
  assert.doesNotMatch(tailwind, /--ds-font-size-(?:micro|caption|sm|3xl)/);
});
