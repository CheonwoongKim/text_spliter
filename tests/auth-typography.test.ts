import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * The login screen sets the pattern every standalone entry screen follows, so
 * its type is pinned here rather than checked by eye.
 *
 * It reads at 15px, not the 13px the workspace uses: a person doing one thing
 * at a time is not scanning a table, and the screen has room. The floor still
 * applies — nothing on it may go below 13px.
 */
const form = readFileSync("components/auth/AuthForm.tsx", "utf8");

/** Every font size and weight the screen declares, in source order. */
function declarations(pattern: RegExp): string[] {
  return [...form.matchAll(pattern)].map((match) => match[0]);
}

test("the login screen declares no size below the floor", () => {
  const sizes = new Set(declarations(/\btext-(?:nav|xs|base|lg|xl|2xl)\b/g));

  assert.ok(!sizes.has("text-nav"), "11px belongs to the GNB, which this screen has none of");
  assert.deepEqual(
    [...sizes].sort(),
    ["text-2xl", "text-base", "text-xs"],
    "an entry screen needs a title, a reading size, and the floor — nothing else",
  );
});

test("the authentication title is a heading, at a heading's weight", () => {
  const heading = form.match(/<h1 className="([^"]+)"/)?.[1] ?? "";

  assert.match(heading, /\btext-2xl\b/, "an entry screen title is the one place 24px is allowed");
  assert.match(heading, /\bfont-semibold\b/, "600 is the weight for a heading; 500 is for controls");
});

test("what a person reads and acts on sits at 15px, not at the floor", () => {
  const feedback = form.match(/className=\{`text-\w+ \$\{feedback\.type/)?.[0] ?? "";
  const submit = form.match(/type="submit"[\s\S]{0,400}?className="([^"]+)"/)?.[1] ?? "";

  assert.match(feedback, /text-base/, "a status message is read, so it takes the reading size");
  assert.match(submit, /text-base/, "the primary action of the screen is not label-sized");
  assert.match(submit, /font-medium/, "500 is the weight for a control");
});

test("every field label and the secondary link stay at the floor", () => {
  const labels = declarations(/<label[^>]*className="[^"]*"/g);

  assert.ok(labels.length >= 3, "email, password and the remember-me choice all carry a label");
  for (const label of labels) {
    assert.match(label, /\btext-xs\b/, `a label sits at the floor: ${label}`);
    assert.match(label, /\bfont-normal\b/, "a label is not emphasised over the value it names");
  }
});

test("the screen overrides neither line height nor tracking", () => {
  assert.equal(declarations(/\bleading-[a-z0-9]+/g).length, 0);
  assert.equal(declarations(/\btracking-[a-z]+/g).length, 0);
});
