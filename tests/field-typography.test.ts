import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

/**
 * A placeholder has no size of its own.
 *
 * `.placeholder-light` sets colour and nothing else, so a placeholder renders
 * at whatever its field renders at. That is the right arrangement — a hint and
 * the value that replaces it should not change size as you type — but it means
 * the field's size is the only thing holding the rule, and a field that
 * declares no size falls through to the base rule in globals.css.
 *
 * That default used to be 15px while the rules asked for 13px, so nine fields
 * read a step larger than the same control elsewhere. These tests pin both
 * halves: the default is the floor, and nothing gives a placeholder a size.
 */
const globalStyles = readFileSync("app/globals.css", "utf8");

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sources(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

const FILES = [...sources("components"), ...sources("app")];

test("a field that declares no size lands on the floor, not above it", () => {
  const rule = globalStyles.slice(
    globalStyles.indexOf("  input,"),
    globalStyles.indexOf("  code,"),
  );

  assert.match(rule, /font-size: var\(--ds-font-size-xs\)/);
  assert.match(rule, /line-height: var\(--ds-line-height-xs\)/);
  assert.doesNotMatch(
    rule,
    /--ds-font-size-base/,
    "a forgotten size class must not render a field larger than the rules allow",
  );
});

test("nothing gives a placeholder a size of its own", () => {
  const placeholderRule = globalStyles.slice(
    globalStyles.indexOf(".placeholder-light::placeholder"),
    globalStyles.indexOf("}", globalStyles.indexOf(".placeholder-light::placeholder")),
  );

  assert.match(placeholderRule, /color:/);
  assert.doesNotMatch(
    placeholderRule,
    /font-size|line-height/,
    "a placeholder that sizes itself would resize the moment a person types",
  );

  for (const path of FILES) {
    const source = readFileSync(path, "utf8");
    assert.doesNotMatch(
      source,
      /placeholder:text-(?:xs|base|lg|xl|2xl)/,
      `${path} sizes a placeholder apart from the value it stands in for`,
    );
  }
});

test("no field is set below the floor", () => {
  const offenders: string[] = [];

  for (const path of FILES) {
    const source = readFileSync(path, "utf8");
    for (const match of source.matchAll(/<(?:input|textarea|select)\b[\s\S]{0,900}?\/>/g)) {
      if (/\btext-nav\b/.test(match[0])) {
        offenders.push(`${path}:${source.slice(0, match.index).split("\n").length}`);
      }
    }
  }

  assert.deepEqual(offenders, [], "11px belongs to the GNB, which has no fields");
});
