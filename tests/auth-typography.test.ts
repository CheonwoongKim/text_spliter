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
  // What goes inside a box is corrected a step down, and that decision lives in
  // the primitives rather than here.
  assert.equal(declarations(/\btext-control-(?:sm|md)\b/g).length, 0);
});

test("the authentication title is a heading, at a heading's weight", () => {
  const heading = form.match(/<h1 className="([^"]+)"/)?.[1] ?? "";

  assert.match(heading, /\btext-2xl\b/, "an entry screen title is the one place 24px is allowed");
  assert.match(heading, /\bfont-semibold\b/, "600 is the weight for a heading; 500 is for controls");
});

test("what a person reads sits at 15px, and what they act on is corrected to 14px", () => {
  const feedback = form.match(/className=\{`text-\w+ \$\{feedback\.type/)?.[0] ?? "";

  assert.match(feedback, /text-base/, "a status message is read, so it takes the reading size");

  // The submit button and the fields are the shared primitives at their
  // entry-screen size, which maps to 14px: one step under this screen's 15px,
  // because a border makes the same text look larger inside it.
  assert.match(form, /<Button type="submit" size="xl"/);
  assert.match(form, /const FIELD_SIZE = "xl" as const;/);

  const button = readFileSync("components/shared/Button.tsx", "utf8");
  const fields = readFileSync("components/shared/FormFields.tsx", "utf8");
  assert.match(button, /xl: "h-control-xl[^"]*text-control-md/);
  assert.match(fields, /xl: "text-control-md"/);
});

test("every field label and the secondary link stay at the floor", () => {
  const labels = declarations(/<label[^>]*className="[^"]*"/g);

  assert.equal(labels.length, 2, "email and password carry a label; the checkbox owns its own");
  for (const label of labels) {
    assert.match(label, /\btext-xs\b/, `a label sits at the floor: ${label}`);
    assert.match(label, /\bfont-normal\b/, "a label is not emphasised over the value it names");
  }

  const link = form.match(/className="mt-12[^"]*"/)?.[0] ?? "";
  assert.match(link, /\btext-xs\b/, "a link is read on the page, not inside a box");
});

test("the screen builds its controls from the shared primitives", () => {
  assert.doesNotMatch(form, /<input\b/, "a hand-rolled field drifts from every other field");
  assert.doesNotMatch(form, /<button\b/, "a hand-rolled button drifts from every other button");
  assert.match(form, /<Checkbox\b/);
  assert.match(form, /<Button\b/);
  assert.match(form, /<Input\b/);
});

test("the screen overrides neither line height nor tracking", () => {
  assert.equal(declarations(/\bleading-[a-z0-9]+/g).length, 0);
  assert.equal(declarations(/\btracking-[a-z]+/g).length, 0);
});
