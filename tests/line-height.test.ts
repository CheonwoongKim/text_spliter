import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

/**
 * A hand-written `leading-*` has to clear the same bar the tokens do.
 *
 * Each step in the scale is paired with a line height that holds the face's
 * 1.5em content box, and tests/typography-metrics.test.ts checks that pairing.
 * A `leading-*` utility on an element overrides the pair and answers to
 * nothing, so 25 places across the parser, the evaluation screens and the
 * memory guide set wrapping Korean prose in a box too short for it — two of
 * them at 16px for 13px text, which puts consecutive lines almost touching.
 *
 * The UI face renders larger than nominal because `font-size-adjust` scales it
 * to the x-height the system was drawn against. Monospace opts out of that, so
 * it needs less room and its tighter leading is fine.
 */
const tokens = readFileSync("styles/design-tokens.css", "utf8");

const CONTENT_BOX = 1.5;
const X_TARGET = Number(tokens.match(/--ds-typography-x-height:\s*([\d.]+)/)?.[1]);
/** IBM Plex Sans KR, measured; see tests/typography-metrics.test.ts. */
const FACE_X_HEIGHT = 0.522;
const RENDERED_SCALE = X_TARGET / FACE_X_HEIGHT;

function remPx(name: string): number {
  const match = tokens.match(new RegExp(`--${name}:\\s*([\\d.]+)rem`));
  assert.ok(match, `${name} must be defined in rem`);
  return Number(match[1]) * 16;
}

const SIZES: Record<string, number> = {
  "text-nav": remPx("ds-navigation-font-size"),
  "text-control-sm": remPx("ds-font-size-control-sm"),
  "text-xs": remPx("ds-font-size-xs"),
  "text-control-md": remPx("ds-font-size-control-md"),
  "text-base": remPx("ds-font-size-base"),
  "text-lg": remPx("ds-font-size-lg"),
  "text-xl": remPx("ds-font-size-xl"),
  "text-2xl": remPx("ds-font-size-2xl"),
};

const LEADINGS: Record<string, number> = {
  "leading-4": remPx("ds-leading-4"),
  "leading-5": remPx("ds-leading-5"),
  "leading-6": remPx("ds-leading-6"),
  "leading-7": remPx("ds-leading-7"),
};

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sources(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

/** The quoted class list a match sits inside. */
function classList(source: string, at: number): string {
  const start = Math.max(source.lastIndexOf('"', at), source.lastIndexOf("`", at));
  const ends = [source.indexOf('"', at), source.indexOf("`", at)].filter((i) => i !== -1);
  return ends.length ? source.slice(start, Math.min(...ends)) : "";
}

test("every hand-written line height holds the face it sets", () => {
  const shortfalls: string[] = [];

  for (const path of [...sources("components"), ...sources("app")]) {
    const source = readFileSync(path, "utf8");

    for (const match of source.matchAll(/\bleading-[4-7]\b/g)) {
      const classes = classList(source, match.index);
      const step = Object.keys(SIZES).find((name) => new RegExp(`\\b${name}\\b`).test(classes));
      const size = step ? SIZES[step] : SIZES["text-xs"];
      // Monospace keeps its own metrics, so it is not scaled up and needs less.
      const needed = size * (classes.includes("font-mono") ? 1 : RENDERED_SCALE) * CONTENT_BOX;
      const given = LEADINGS[match[0]];

      if (given < needed) {
        const line = source.slice(0, match.index).split("\n").length;
        shortfalls.push(
          `${path}:${line} ${match[0]} gives ${given}px to ${size}px text, which needs ${needed.toFixed(1)}px`,
        );
      }
    }
  }

  assert.deepEqual(shortfalls, [], "drop the override and the step's own line height applies");
});
