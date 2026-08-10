import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const tokens = readFileSync("styles/design-tokens.css", "utf8");
const tailwind = readFileSync("tailwind.config.ts", "utf8");
const globalStyles = readFileSync("app/globals.css", "utf8");
const rootLayout = readFileSync("app/layout.tsx", "utf8");
const loginPage = readFileSync("app/login/page.tsx", "utf8");
const signupPage = readFileSync("app/signup/page.tsx", "utf8");
const authForm = readFileSync("components/auth/AuthForm.tsx", "utf8");
const authGuard = readFileSync("components/layout/AuthGuard.tsx", "utf8");
const supabaseConfig = readFileSync("supabase/config.toml", "utf8");

function tokenNames(prefix: string) {
  return [...tokens.matchAll(new RegExp(`--${prefix}-([a-z0-9-]+):`, "g"))]
    .map((match) => match[1]);
}

/**
 * 13px is the floor, and the scale enforces it by having nothing below it.
 *
 * The 11px step was described as an exception for compact labels and grew into
 * 69% of the type in the product. A floor that only exists in a comment is not
 * a floor, so the step itself is gone.
 */
test("the type scale starts at the 13px floor and has no step below it", () => {
  // `control-*` is the optically corrected tier for text inside a box; it is
  // held to its own rules in tests/control-typography.test.ts.
  const pageScale = tokenNames("ds-font-size").filter((name) => !name.startsWith("control-"));

  assert.deepEqual(pageScale, ["xs", "base", "lg", "xl", "2xl"]);
  assert.match(tokens, /--ds-font-size-xs: 0\.8125rem/);
  assert.match(tokens, /--ds-font-size-base: 0\.9375rem/);
  assert.match(tokens, /--ds-font-size-lg: 1\.0625rem/);
  assert.match(tokens, /--ds-font-size-2xl: 1\.5rem/);
  assert.doesNotMatch(tokens, /--ds-font-size-(?:2xs|micro|caption|3xl)/);
});

test("11px survives only for the GNB, which no other surface can reach", () => {
  assert.match(tokens, /--ds-navigation-font-size: 0\.6875rem/);

  const scale = tailwind.slice(tailwind.indexOf("fontSize:"), tailwind.indexOf("fontWeight:"));

  assert.match(scale, /nav: \["var\(--ds-navigation-font-size\)"/);
  assert.doesNotMatch(scale, /"2xs":/, "a 2xs step lets 11px back into the rest of the UI");
});

test("a field label sits at the floor rather than below it", () => {
  const rule = globalStyles.slice(
    globalStyles.indexOf("  label {"),
    globalStyles.indexOf("  input,"),
  );

  assert.match(rule, /font-size: var\(--ds-font-size-xs\)/);
  assert.doesNotMatch(rule, /--ds-font-size-2xs/);
});

test("Korean-first typography uses readable line height and neutral tracking", () => {
  assert.match(tokens, /--ds-line-height-xs: 1\.375rem/);
  assert.match(tokens, /--ds-line-height-base: 1\.5rem/);
  // IBM Plex Sans KR already sets Hangul tightly; see typography-metrics.test.ts.
  assert.match(tokens, /--ds-letter-spacing-normal: 0em/);
  assert.match(tokens, /--ds-letter-spacing-mono: 0/);
  assert.match(tokens, /--ds-icon-sm: 1rem/);
  assert.match(tokens, /--ds-icon-md: 1\.25rem/);
  assert.match(tokens, /--ds-layout-topbar-height: 3rem/);
  assert.match(tokens, /--ds-layout-sidebar-width: 4rem/);
  assert.match(tokens, /--ds-layout-auth-width: 22\.5rem/);
  assert.match(tokens, /--ds-parser-file-zone-height: 12\.5rem/);
  assert.match(tokens, /--ds-parser-engine-option-height: 3\.5rem/);
  assert.match(tokens, /--ds-splitter-source-height: 20rem/);
});

test("IBM Plex Sans KR is self-hosted with metric fallback and no blocking weight preloads", () => {
  assert.match(tokens, /var\(--font-ibm-plex-sans-kr\)/);
  assert.match(rootLayout, /IBM_Plex_Sans_KR\(/);
  assert.match(rootLayout, /preload: false/);
  assert.match(rootLayout, /fallback: \["Arial", "sans-serif"\]/);
  // The font is bundled at build time, so nothing may reach a font CDN at runtime.
  assert.doesNotMatch(globalStyles, /cdn\.jsdelivr\.net|@font-face/);
  assert.doesNotMatch(rootLayout, /preconnect/);
  assert.doesNotMatch(rootLayout, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
});

test("the UI face carries every weight the design system exposes", () => {
  const declared = [...rootLayout.matchAll(/weight: \[([^\]]+)\]/g)][0]?.[1] || "";
  const tailwindWeights = [...tailwind.matchAll(/^\s+(?:normal|medium|semibold|bold): "(\d{3})"/gm)]
    .map((match) => match[1]);

  assert.ok(tailwindWeights.length > 0, "the design system must declare weights");
  for (const weight of tailwindWeights) {
    assert.ok(
      declared.includes(`"${weight}"`),
      `weight ${weight} is offered by Tailwind but not loaded, so it would be synthesized`,
    );
  }
});

test("the previous face is fully removed rather than left half-swapped", () => {
  for (const source of [tokens, tailwind, globalStyles, rootLayout]) {
    assert.doesNotMatch(source, /spoqa/i);
  }
});

test("authentication fields are the shared control, focused without animation", () => {
  const fields = readFileSync("components/shared/FormFields.tsx", "utf8");
  const input = fields.slice(fields.indexOf("      <input"), fields.indexOf("/>", fields.indexOf("      <input")));

  // A border that animates on focus arrives after the caret does, so the field
  // looks unfocused for the moment a person starts typing.
  assert.match(input, /focus-ring/);
  assert.doesNotMatch(input, /transition-smooth/);

  assert.equal([...authForm.matchAll(/<Input\b/g)].length, 2, "email and password use the primitive");
  assert.equal(
    [...authForm.matchAll(/borderTone="default"/g)].length,
    3,
    "auth fields and checkbox use the subdued resting border before focus",
  );
  assert.doesNotMatch(authForm, /<input\b/, "no field on this screen is hand-rolled any more");
});

test("login and signup are distinct public routes with password confirmation", () => {
  assert.match(loginPage, /<AuthForm mode="signin" \/>/);
  assert.match(signupPage, /<AuthForm mode="signup" \/>/);
  assert.match(authGuard, /new Set\(\["\/login", "\/signup"\]\)/);
  assert.match(authForm, /passwordConfirmation/);
  assert.match(authForm, /Passwords do not match/);
  assert.match(authForm, /href: "\/signup"/);
  assert.match(authForm, /href: "\/login"/);
  assert.match(authForm, /Welcome back/);
  assert.match(authForm, /Create your account/);
  assert.equal([...authForm.matchAll(/<PasswordField/g)].length, 2);
  assert.match(authForm, /type=\{isVisible \? "text" : "password"\}/);
  assert.match(authForm, /aria-pressed=\{isVisible\}/);
});

test("client and local Supabase enforce the same signup password policy", () => {
  assert.match(authForm, /getPasswordPolicyError\(password\)/);
  assert.match(supabaseConfig, /minimum_password_length = 8/);
  assert.match(
    supabaseConfig,
    /password_requirements = "lower_upper_letters_digits_symbols"/
  );
});

test("spacing and radius expose only the approved scales", () => {
  assert.deepEqual(tokenNames("ds-space"), ["1", "2", "3", "4", "6", "8", "10", "12", "16"]);
  assert.deepEqual(tokenNames("ds-radius"), ["sm", "lg", "xl", "2xl", "full"]);
});

test("the single dark palette exposes only neutral, accent, and meaningful status colors", () => {
  assert.match(tokens, /color-scheme: dark/);
  assert.match(tokens, /--ds-color-bg-canvas: #0f1115/);
  assert.match(tokens, /--ds-color-bg-raised: #171a21/);
  assert.match(tokens, /--ds-color-bg-upload-zone: #242a33/);
  assert.match(tokens, /--ds-color-fg-default: #e5e7eb/);
  assert.match(tokens, /--ds-color-fg-placeholder: #7b8492/);
  assert.match(tokens, /--ds-color-border-control: #606b7b/);
  for (const token of [
    "--ds-color-bg-canvas",
    "--ds-color-bg-upload-zone",
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
  assert.match(tailwind, /subdued: "var\(--ds-color-fg-placeholder\)"/);
  assert.match(tailwind, /danger:\s*\{/);
  assert.doesNotMatch(tailwind, /--ds-font-size-(?:micro|caption|sm|3xl)/);
});
