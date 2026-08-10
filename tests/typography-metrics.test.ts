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
  /** Side bearing either side of a Hangul syllable, before any tracking. */
  hangulSideBearing: 0.05,
} as const;

/**
 * `font-size-adjust` scales the face until its x-height matches this ratio, so
 * a step renders larger than its nominal size by exactly this factor.
 */
function xHeightTarget(): number {
  const match = tokens.match(/--ds-typography-x-height:\s*([\d.]+)/);
  assert.ok(match, "the scale must declare the x-height it was drawn against");
  return Number(match[1]);
}

function renderedScale(): number {
  return xHeightTarget() / UI_FACE.xHeight;
}

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
  { token: "ds-navigation-font-size", lineHeight: "ds-line-height-nav" },
  { token: "ds-font-size-xs", lineHeight: "ds-line-height-xs" },
  { token: "ds-font-size-base", lineHeight: "ds-line-height-base" },
  { token: "ds-font-size-lg", lineHeight: "ds-line-height-lg" },
  { token: "ds-font-size-xl", lineHeight: "ds-line-height-xl" },
  { token: "ds-font-size-2xl", lineHeight: "ds-line-height-2xl" },
] as const;

test("every type step stays above the legibility floor as rendered", () => {
  for (const step of TYPE_STEPS) {
    const px = remToken(step.token);
    const xHeightPx = px * xHeightTarget();

    assert.ok(
      xHeightPx >= MIN_X_HEIGHT_PX,
      `${step.token} is ${px}px, drawing an x-height of ${xHeightPx.toFixed(2)}px, `
      + `under the ${MIN_X_HEIGHT_PX}px floor`,
    );
  }
});

test("the scale renders at the x-height it was drawn against, not the face's own", () => {
  assert.notEqual(
    xHeightTarget(),
    UI_FACE.xHeight,
    "a face whose x-height already matches needs no adjustment; record that instead",
  );
  assert.ok(renderedScale() > 1, "this face draws smaller, so it must scale up");

  const globals = readFileSync("app/globals.css", "utf8");
  assert.match(globals, /font-size-adjust: var\(--ds-typography-x-height\)/);
  // Monospace columns depend on their own metrics staying put.
  assert.match(globals, /\.font-mono \{[^}]*font-size-adjust: none/s);
});

/**
 * 11px survives in exactly one place.
 *
 * A GNB label sits under its own icon in a small, fixed set, so it is
 * recognised rather than read. Everywhere else it was running text at a size
 * Hangul cannot hold, which is how the old compact tier reached 69% of the
 * product. The floor is kept by the scale itself, not by a comment: nothing
 * below 13px may be reachable through a type step.
 */
test("11px belongs to the GNB alone and nothing else can reach it", () => {
  const floor = remToken("ds-font-size-xs");
  assert.ok(
    remToken("ds-navigation-font-size") < floor,
    "the navigation label is the one documented exception to the floor",
  );

  const belowFloor = [...tokens.matchAll(/--(ds-font-size-[a-z0-9]+):\s*([\d.]+)rem/g)]
    .filter((match) => Number(match[2]) * 16 < floor)
    .map((match) => match[1]);

  assert.deepEqual(belowFloor, [], "a step under the floor puts 11px back within reach");

  const tailwind = readFileSync("tailwind.config.ts", "utf8");
  assert.doesNotMatch(tailwind, /"2xs":/);
});

test("tracking never closes the gap this face already sets tightly", () => {
  const tracking = (name: string) => {
    const match = tokens.match(new RegExp(`--ds-letter-spacing-${name}:\\s*(-?[\\d.]+)em`));
    assert.ok(match, `${name} tracking must be defined in em`);
    return Number(match[1]);
  };

  for (const name of ["tight", "normal"]) {
    const gap = UI_FACE.hangulSideBearing + tracking(name);
    assert.ok(
      gap > 0.03,
      `${name} tracking leaves ${gap.toFixed(3)}em between Hangul syllables, which `
      + `runs them together in a face that already sets them at `
      + `${UI_FACE.hangulSideBearing}em`,
    );
  }
  assert.ok(tracking("normal") >= 0, "an already tight face must not be tightened further");
});

test("the type scale rises monotonically", () => {
  const sizes = [
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
    const needed = px * renderedScale() * UI_FACE.contentBox;
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
