import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

/**
 * A heading may not be set larger than one above it.
 *
 * The level says what the structure is and the size says what it looks like,
 * and when they disagree the size wins for a sighted reader while the level
 * wins for a screen reader. The parse result panel had an `<h2>` at 13px and an
 * `<h4>` at 15px, both naming the same file, so the deeper one looked like the
 * more important one.
 *
 * The rule is per file, because a size only reads as a rank against the other
 * headings a person can see at once. That also leaves the markdown viewer free
 * to give a rendered document its own scale: it is content inside the page, not
 * the page's own chrome.
 */
const ORDER = [
  "text-nav",
  "text-control-sm",
  "text-xs",
  "text-control-md",
  "text-base",
  "text-lg",
  "text-xl",
  "text-2xl",
] as const;

const PX: Record<string, number> = {
  "text-nav": 11,
  "text-control-sm": 12,
  "text-xs": 13,
  "text-control-md": 14,
  "text-base": 15,
  "text-lg": 17,
  "text-xl": 20,
  "text-2xl": 24,
};

/** A heading with no size class inherits the body rule, which is the floor. */
const INHERITED = PX["text-xs"];

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sources(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

interface Heading {
  level: number;
  px: number;
  line: number;
}

function headings(source: string): Heading[] {
  return [...source.matchAll(/<(h[1-6])\s+className="([^"]*)"/g)].map((match) => {
    // Later entries win, so the largest declared step is the one that applies.
    const step = [...ORDER].reverse().find((name) => new RegExp(`\\b${name}\\b`).test(match[2]));
    return {
      level: Number(match[1][1]),
      px: step ? PX[step] : INHERITED,
      line: source.slice(0, match.index).split("\n").length,
    };
  });
}

test("no heading is set larger than one above it in the same view", () => {
  const inversions: string[] = [];

  for (const path of [...sources("components"), ...sources("app")]) {
    const source = readFileSync(path, "utf8");
    const found = headings(source);

    for (const heading of found) {
      const shallower = found.filter((other) => other.level < heading.level);
      const smallest = Math.min(...shallower.map((other) => other.px));

      if (shallower.length && heading.px > smallest) {
        inversions.push(
          `${path}:${heading.line} h${heading.level} is ${heading.px}px, above a shallower heading at ${smallest}px`,
        );
      }
    }
  }

  assert.deepEqual(inversions, [], "give the deeper heading the smaller size, or raise its level");
});

test("a heading level is never skipped on the way down", () => {
  const skips: string[] = [];

  for (const path of [...sources("components"), ...sources("app")]) {
    const source = readFileSync(path, "utf8");
    const levels = [...new Set(headings(source).map((heading) => heading.level))].sort();

    for (let index = 1; index < levels.length; index += 1) {
      if (levels[index] - levels[index - 1] > 1) {
        skips.push(`${path}: h${levels[index - 1]} jumps to h${levels[index]}`);
      }
    }
  }

  assert.deepEqual(skips, [], "a screen reader announces the gap as a missing section");
});
