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

test("typography has five core sizes and dedicated auth and navigation sizes", () => {
  assert.deepEqual(tokenNames("ds-font-size"), ["2xs", "xs", "base", "lg", "xl", "2xl"]);
  assert.match(tokens, /--ds-font-size-2xs: 0\.6875rem/);
  assert.match(tokens, /--ds-font-size-xs: 0\.8125rem/);
  assert.match(tokens, /--ds-font-size-base: 0\.9375rem/);
  assert.match(tokens, /--ds-font-size-lg: 1\.0625rem/);
  assert.match(tokens, /--ds-font-size-2xl: 1\.5rem/);
  assert.match(tokens, /--ds-navigation-font-size: 0\.625rem/);
  assert.doesNotMatch(tokens, /--ds-font-size-(?:micro|caption|sm|3xl)/);
});

test("Korean-first typography uses compact tracking and readable line height", () => {
  assert.match(tokens, /--ds-line-height-xs: 1\.25rem/);
  assert.match(tokens, /--ds-line-height-base: 1\.5rem/);
  assert.match(tokens, /--ds-letter-spacing-normal: -0\.01em/);
  assert.match(tokens, /--ds-letter-spacing-mono: 0/);
  assert.match(tokens, /--ds-icon-md: 1\.25rem/);
  assert.match(tokens, /--ds-layout-topbar-height: 3\.5rem/);
  assert.match(tokens, /--ds-layout-sidebar-width: 4\.5rem/);
  assert.match(tokens, /--ds-layout-auth-width: 22\.5rem/);
  assert.match(tokens, /--ds-parser-file-zone-height: 12\.5rem/);
  assert.match(tokens, /--ds-parser-engine-option-height: 3\.5rem/);
  assert.match(tokens, /--ds-splitter-source-height: 20rem/);
});

test("Spoqa Han Sans is self-hosted with metric fallback and no blocking weight preloads", () => {
  assert.match(tokens, /var\(--font-spoqa-han-sans\)/);
  assert.match(rootLayout, /localFont\(/);
  assert.match(rootLayout, /preload: false/);
  assert.match(rootLayout, /adjustFontFallback: "Arial"/);
  assert.doesNotMatch(globalStyles, /cdn\.jsdelivr\.net|@font-face/);
  assert.doesNotMatch(rootLayout, /preconnect/);
});

test("authentication inputs change focus border without transition animation", () => {
  const inputs = [...authForm.matchAll(/<input[\s\S]*?\/>/g)]
    .map((match) => match[0])
    .filter((input) => !/type="checkbox"/.test(input));

  assert.equal(inputs.length, 2);
  assert.match(authForm, /const FIELD_CLASS =[\s\S]*focus-ring/);
  assert.doesNotMatch(authForm.match(/const FIELD_CLASS =[\s\S]*?;/)?.[0] ?? "", /transition-smooth/);
  for (const input of inputs) {
    assert.match(input, /FIELD_CLASS/);
    assert.doesNotMatch(input, /transition-smooth/);
  }
});

test("login and signup are distinct public routes with password confirmation", () => {
  assert.match(loginPage, /<AuthForm mode="signin" \/>/);
  assert.match(signupPage, /<AuthForm mode="signup" \/>/);
  assert.match(authGuard, /new Set\(\["\/login", "\/signup"\]\)/);
  assert.match(authForm, /passwordConfirmation/);
  assert.match(authForm, /비밀번호가 일치하지 않습니다/);
  assert.match(authForm, /href: "\/signup"/);
  assert.match(authForm, /href: "\/login"/);
  assert.match(authForm, /Welcom, Back!/);
  assert.match(authForm, /Sign Up/);
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

test("the single light palette exposes only neutral, accent, and meaningful status colors", () => {
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
