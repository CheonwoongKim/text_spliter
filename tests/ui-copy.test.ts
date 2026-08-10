import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { PRESERVED_TERMS, UI_COPY } from "@/lib/ui-copy";

/**
 * The product speaks Korean, but not every English word on screen is product
 * copy. A provider option name, a metric name, and a model id all have to match
 * what the reader sees in a provider console or a paper, so translating them
 * would cost more than it gives.
 */

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sources(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

const FILES = [...sources("components"), ...sources("app")];

test("the shared wording is Korean", () => {
  const groups = Object.values(UI_COPY) as Array<Record<string, string>>;

  for (const group of groups) {
    for (const [key, value] of Object.entries(group)) {
      assert.match(value, /[가-힣]/, `UI_COPY entry "${key}" must be Korean`);
    }
  }
});

test("terms that must survive translation are declared, not guessed at", () => {
  for (const term of ["Recall@K", "Agentic Plus", "Prebuilt Layout", "Markdown", "Faithfulness"]) {
    assert.ok(
      PRESERVED_TERMS.includes(term),
      `${term} identifies something outside this product and must stay in English`,
    );
  }
});

test("provider option names were not translated away", () => {
  const settings = readFileSync("components/settings/ParserEngineSettingsPanel.tsx", "utf8");

  for (const term of ["Agentic Plus", "Prebuilt Layout", "Cost Effective"]) {
    assert.ok(
      settings.includes(term),
      `${term} is how the provider names this option; a reader has to be able to match it`,
    );
  }
});

test("measurement names were not translated away", () => {
  const runs = readFileSync("components/evaluation/EvaluationRunsView.tsx", "utf8");

  for (const term of ["Recall@K", "MRR", "nDCG@K"]) {
    assert.ok(runs.includes(term), `${term} is the published name of the metric`);
  }
});

/**
 * The authentication screens are the first thing a person sees, and they were
 * the last place English survived: the sign-in title read "Welcom, Back!" —
 * misspelt, and in a language the rest of the product does not use.
 *
 * Nothing on these screens names a provider option, a metric, or a model, so
 * unlike the workbench they have no reason to carry a Latin word at all.
 */
test("the authentication screens speak Korean, titles included", () => {
  const form = readFileSync("components/auth/AuthForm.tsx", "utf8");
  const content = form.slice(
    form.indexOf("const AUTH_CONTENT"),
    form.indexOf("const FIELD_CLASS"),
  );

  for (const key of ["title", "submit", "pending", "link"]) {
    const values = [...content.matchAll(new RegExp(`${key}: "([^"]+)"`, "g"))].map((m) => m[1]);

    assert.equal(values.length, 2, `${key} must be set for both sign-in and sign-up`);
    for (const value of values) {
      assert.match(value, /[가-힣]/, `${key} "${value}" is read by a Korean speaker`);
      assert.doesNotMatch(value, /[A-Za-z]/, `${key} "${value}" has no term that must stay English`);
    }
  }
});

test("the common actions read the same way on every screen", () => {
  const strays = new Map<string, string[]>();
  // Words the glossary already settles; finding them in English means a screen
  // is wording a shared action its own way again.
  const SETTLED = ["Cancel", "Delete", "Refresh", "Retry", "Save changes"];

  for (const path of FILES) {
    const source = readFileSync(path, "utf8");
    for (const word of SETTLED) {
      if (new RegExp(`>\\s*${word}\\s*<`).test(source)) {
        strays.set(word, [...(strays.get(word) || []), path]);
      }
    }
  }

  assert.deepEqual(
    [...strays.entries()],
    [],
    "these actions have Korean wording in lib/ui-copy.ts",
  );
});
