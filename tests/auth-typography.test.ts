import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const form = readFileSync("components/auth/AuthForm.tsx", "utf8");
const authPage = readFileSync("components/auth/AuthPage.tsx", "utf8");
const authField = readFileSync("components/auth/AuthField.tsx", "utf8");
const authFeedback = readFileSync("components/auth/AuthFeedback.tsx", "utf8");
const authPasswordField = readFileSync("components/auth/AuthPasswordField.tsx", "utf8");
const resetForm = readFileSync("components/auth/ResetPasswordForm.tsx", "utf8");
const authSurface = [authPage, authField, authFeedback, authPasswordField, form, resetForm].join("\n");

function declarations(pattern: RegExp): string[] {
  return [...authSurface.matchAll(pattern)].map((match) => match[0]);
}

test("the login screen declares no size below the floor", () => {
  const sizes = new Set(declarations(/\btext-(?:nav|xs|base|lg|xl|2xl)\b/g));

  assert.ok(!sizes.has("text-nav"), "11px belongs to the GNB, which this screen has none of");
  assert.deepEqual(
    [...sizes].sort(),
    ["text-2xl", "text-base", "text-xs"],
    "an entry screen needs a title, a reading size, and the floor — nothing else",
  );
  assert.equal(declarations(/\btext-control-(?:sm|md)\b/g).length, 0);
});

test("the authentication title is a heading, at a heading's weight", () => {
  const heading = authPage.match(/<h1 className="([^"]+)"/)?.[1] ?? "";

  assert.match(heading, /\btext-2xl\b/, "an entry screen title is the one place 24px is allowed");
  assert.match(heading, /\bfont-semibold\b/, "600 is the weight for a heading; 500 is for controls");
});

test("what a person reads sits at 15px, and what they act on is corrected to 14px", () => {
  const feedback = authFeedback.match(/className=\{`[^`]*text-base/)?.[0] ?? "";

  assert.match(feedback, /text-base/, "a status message is read, so it takes the reading size");

  assert.match(form, /<Button[\s\S]*?type="submit"[\s\S]*?size="xl"/);
  assert.match(form, /variant="neutral"/);
  assert.match(authField, /fieldSize="xl"/);

  const button = readFileSync("components/shared/Button.tsx", "utf8");
  const fields = readFileSync("components/shared/FormFields.tsx", "utf8");
  assert.match(button, /xl: "h-control-xl[^"]*text-control-md/);
  assert.match(fields, /xl: "text-control-md"/);
});

test("every field label and the secondary link stay at the floor", () => {
  const labels = [...authSurface.matchAll(/<label[^>]*className="[^"]*"/g)]
    .map((match) => match[0]);

  assert.equal(labels.length, 1, "authentication fields share one label implementation");
  for (const label of labels) {
    assert.match(label, /\btext-xs\b/, `a label sits at the floor: ${label}`);
    assert.match(label, /\bfont-normal\b/, "a label is not emphasised over the value it names");
  }

  const link = authPage.match(/className=\{`\$\{className\}[^`]*`\}/)?.[0] ?? "";
  assert.match(link, /\btext-xs\b/, "a link is read on the page, not inside a box");
});

test("the screen builds its controls from the shared primitives", () => {
  assert.doesNotMatch(authSurface, /<input\b/, "a hand-rolled field drifts from every other field");
  assert.doesNotMatch(authSurface, /<button\b/, "a hand-rolled button drifts from every other button");
  assert.match(form, /<Checkbox\b/);
  assert.match(form, /<Button\b/);
  assert.match(authField, /<Input\b/);
  assert.match(form, /<AuthPasswordField\b/);
});

test("the screen overrides neither line height nor tracking", () => {
  assert.equal(declarations(/\bleading-[a-z0-9]+/g).length, 0);
  assert.equal(declarations(/\btracking-[a-z]+/g).length, 0);
});
