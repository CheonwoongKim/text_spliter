import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const tokens = readFileSync("styles/design-tokens.css", "utf8");

/**
 * A type scale is tuned to a face's x-height, not to a nominal pixel value.
 * IBM Plex Sans KR draws 3.9% smaller than the face this scale was designed
 * for, so a size that was comfortable before can fall under the floor after a
 * font swap without a single token changing.
 *
 * These are the measured metrics of the UI face, in em. Replacing the face
 * means re-measuring and updating them here, which is the point: the swap
 * cannot pass silently.
 */
const UI_FACE = {
  name: "IBM Plex Sans KR",
  xHeight: 0.522,
  capHeight: 0.698,
  /** hhea ascent minus descent, which is what the browser lays out with. */
  contentBox: 1.5,
} as const;

/**
 * Below roughly 5.4px of x-height, Korean glyphs lose the internal counters
 * that separate one syllable from another at normal viewing distance.
 */
const MIN_X_HEIGHT_PX = 5.4;

function remToken(name: string): number {
  const match = tokens.match(new RegExp(`--${name}:\\s*([\\d.]+)rem`));
  assert.ok(match, `${name} must be defined in rem`);
  return Number(match[1]) * 16;
}

const TYPE_STEPS = [
  { token: "ds-navigation-font-size", lineHeight: "ds-line-height-2xs" },
  { token: "ds-font-size-2xs", lineHeight: "ds-line-height-2xs" },
  { token: "ds-font-size-xs", lineHeight: "ds-line-height-xs" },
  { token: "ds-font-size-base", lineHeight: "ds-line-height-base" },
  { token: "ds-font-size-lg", lineHeight: "ds-line-height-lg" },
  { token: "ds-font-size-xl", lineHeight: "ds-line-height-xl" },
  { token: "ds-font-size-2xl", lineHeight: "ds-line-height-2xl" },
] as const;

test("every type step stays above the legibility floor for the current face", () => {
  for (const step of TYPE_STEPS) {
    const px = remToken(step.token);
    const xHeightPx = px * UI_FACE.xHeight;

    assert.ok(
      xHeightPx >= MIN_X_HEIGHT_PX,
      `${step.token} is ${px}px, drawing an x-height of ${xHeightPx.toFixed(2)}px in `
      + `${UI_FACE.name}, under the ${MIN_X_HEIGHT_PX}px floor`,
    );
  }
});

test("the navigation label is no smaller than the compact-label tier", () => {
  assert.ok(
    remToken("ds-navigation-font-size") >= remToken("ds-font-size-2xs"),
    "the navigation label was the first casualty of the smaller face; it must not "
    + "drop below the smallest documented tier again",
  );
});

test("the type scale rises monotonically", () => {
  const sizes = [
    "ds-font-size-2xs",
    "ds-font-size-xs",
    "ds-font-size-base",
    "ds-font-size-lg",
    "ds-font-size-xl",
    "ds-font-size-2xl",
  ].map(remToken);

  for (let index = 1; index < sizes.length; index += 1) {
    assert.ok(sizes[index] > sizes[index - 1], "each step must be larger than the last");
  }
});

test("line heights leave room for the face's content box", () => {
  const shortfalls: string[] = [];

  for (const step of TYPE_STEPS) {
    const px = remToken(step.token);
    const lineHeight = remToken(step.lineHeight);
    const needed = px * UI_FACE.contentBox;
    if (lineHeight < needed) {
      shortfalls.push(
        `${step.token}: ${px}px needs ${needed.toFixed(1)}px but has ${lineHeight}px`,
      );
    }
  }

  assert.deepEqual(
    shortfalls,
    [],
    `a line box smaller than the font's content box shifts where text sits inside `
    + `fixed-height controls:\n${shortfalls.join("\n")}`,
  );
});
