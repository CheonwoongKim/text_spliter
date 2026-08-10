import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sidebar = readFileSync("components/layout/Sidebar.tsx", "utf8");
const tokens = readFileSync("styles/design-tokens.css", "utf8");

function tokenValue(name: string): string {
  const match = tokens.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(match, `${name} must be defined as a hex colour`);
  return match[1];
}

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5]
    .map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground: string, background: string): number {
  const [high, low] = [relativeLuminance(foreground), relativeLuminance(background)]
    .sort((left, right) => right - left);
  return (high + 0.05) / (low + 0.05);
}

/** WCAG AA for text below 18px, which the 10px navigation label certainly is. */
const AA_NORMAL_TEXT = 4.5;

test("the navigation rest state is readable, not placeholder grey", () => {
  const background = tokenValue("ds-color-bg-raised");
  const muted = tokenValue("ds-color-fg-muted");
  const placeholder = tokenValue("ds-color-fg-placeholder");

  assert.ok(
    contrastRatio(muted, background) >= AA_NORMAL_TEXT,
    `the resting colour must clear ${AA_NORMAL_TEXT}:1`,
  );
  assert.ok(
    contrastRatio(placeholder, background) < AA_NORMAL_TEXT,
    "placeholder grey is documented here as the tone that fails, so the guard stays meaningful",
  );

  assert.match(sidebar, /text-muted-foreground/);
  assert.doesNotMatch(
    sidebar,
    /text-subdued/,
    "placeholder grey is for input placeholders, not navigation",
  );
});

test("the selected state clears contrast comfortably", () => {
  const background = tokenValue("ds-color-bg-raised");
  const strong = tokenValue("ds-color-fg-strong");

  assert.ok(contrastRatio(strong, background) >= AA_NORMAL_TEXT);
  assert.match(sidebar, /isActive[\s\S]{0,80}text-card-foreground/);
});

test("selection is signalled by weight as well as colour", () => {
  assert.match(
    sidebar,
    /isActive \? "font-bold" : "font-medium"/,
    "colour alone must not be the only cue for the active menu",
  );
});

/**
 * Lucide draws against a 24 unit viewBox, so a stroke renders at
 * `strokeWidth * size / 24` device-independent pixels. Below one pixel the
 * stroke is antialiased toward the background and the icon reads lighter than
 * the label next to it, which is exactly the complaint this rail had.
 */
const LUCIDE_VIEWBOX = 24;

function renderedStrokePx(strokeWidth: number, iconPx: number): number {
  return (strokeWidth * iconPx) / LUCIDE_VIEWBOX;
}

test("navigation icons draw at a full pixel or more", () => {
  const iconRem = tokens.match(/--ds-icon-sm:\s*([\d.]+)rem/);
  assert.ok(iconRem, "the navigation icon size must be a rem token");
  const iconPx = Number(iconRem[1]) * 16;

  const strokes = sidebar.match(/strokeWidth=\{isActive \? ([\d.]+) : ([\d.]+)\}/);
  assert.ok(strokes, "navigation icons must set both a rest and a selected stroke");

  const [selected, rest] = [Number(strokes[1]), Number(strokes[2])];
  assert.ok(
    renderedStrokePx(rest, iconPx) >= 1,
    `a rest stroke of ${rest} renders at ${renderedStrokePx(rest, iconPx).toFixed(2)}px, under one pixel`,
  );
  assert.ok(
    selected > rest,
    "the selected icon must thicken with its label rather than staying put",
  );
});
