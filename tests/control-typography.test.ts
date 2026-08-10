import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * Text inside a control is set one step below the surface around it.
 *
 * A border draws a boundary the eye measures glyphs against, so a 15px value in
 * a field looks larger than 15px of body copy beside it. Dropping a step
 * cancels the illusion. These two sizes are the only ones under the 13px floor
 * and a control is the only way to reach them — a label, a hint, or an error
 * sits outside the box and stays on the floor.
 */
const tokens = readFileSync("styles/design-tokens.css", "utf8");
const tailwind = readFileSync("tailwind.config.ts", "utf8");
const fields = readFileSync("components/shared/FormFields.tsx", "utf8");
const button = readFileSync("components/shared/Button.tsx", "utf8");
const checkbox = readFileSync("components/shared/Checkbox.tsx", "utf8");

const X_TARGET = 0.543;
const FACE_X_HEIGHT = 0.522;
const CONTENT_BOX = 1.5;

function rem(name: string): number {
  const match = tokens.match(new RegExp(`--${name}:\\s*([\\d.]+)rem`));
  assert.ok(match, `${name} must be defined in rem`);
  return Number(match[1]) * 16;
}

test("a control sits exactly one step below the surface it is on", () => {
  assert.equal(rem("ds-font-size-control-md"), rem("ds-font-size-base") - 1);
  assert.equal(rem("ds-font-size-control-sm"), rem("ds-font-size-xs") - 1);
});

test("the corrected steps are named for the only place they belong", () => {
  const scale = tailwind.slice(tailwind.indexOf("fontSize:"), tailwind.indexOf("fontWeight:"));

  assert.match(scale, /"control-sm":/);
  assert.match(scale, /"control-md":/);
  // `text-control-*` says where it goes, so a page-level use reads as wrong on
  // sight. Only the smaller of the two actually falls under the floor, and it
  // is the one a workspace control uses.
  assert.ok(rem("ds-font-size-control-sm") < rem("ds-font-size-xs"));
  assert.ok(rem("ds-font-size-control-md") > rem("ds-font-size-xs"));
});

test("a corrected line box still holds the face's content box", () => {
  for (const step of ["control-sm", "control-md"]) {
    const size = rem(`ds-font-size-${step}`);
    const needed = size * (X_TARGET / FACE_X_HEIGHT) * CONTENT_BOX;

    assert.ok(
      rem(`ds-line-height-${step}`) >= needed,
      `${step} is ${size}px and needs ${needed.toFixed(1)}px of line box`,
    );
  }
});

test("every control primitive takes its text size from the shared map", () => {
  // Only the boxes are corrected. A label, hint or error rendered by FormField
  // sits outside the box and stays on the floor, so the check is scoped to the
  // elements that draw a border around their text.
  for (const element of ["input", "select", "textarea"]) {
    const start = fields.indexOf(`      <${element}`);
    assert.notEqual(start, -1, `${element} must exist`);
    const markup = fields.slice(start, fields.indexOf("/>", start));

    assert.match(markup, /controlTextSizes/, `${element} must take a corrected size`);
    assert.doesNotMatch(
      markup,
      /\btext-(?:xs|base|lg|xl|2xl|nav)\b/,
      `${element} sizes its value with a page size instead of a corrected one`,
    );
  }

  const sizes = button.slice(button.indexOf("const sizeStyles"), button.indexOf("export const Button"));
  assert.doesNotMatch(sizes, /\btext-(?:xs|base|lg|xl|2xl|nav)\b/);
  assert.match(sizes, /text-control-md/);
  assert.match(sizes, /text-control-sm/);
});

/**
 * The checkbox was 16px with an 8px radius — half its own width, which reads as
 * a circle, and a circle reads as a radio button: "pick one of these" rather
 * than "this is on".
 */
test("the checkbox is big enough to hit and square enough to read", () => {
  assert.match(checkbox, /h-5 w-5/, "20px, not the 16px it was");
  assert.match(checkbox, /rounded-sm/, "a 4px corner on a 20px box still reads as a square");
  assert.doesNotMatch(checkbox, /rounded-(?:lg|xl|2xl|full)/);
  assert.match(checkbox, /<label/, "the words beside the box are part of the target");
});

test("a taller control keeps a rounder corner", () => {
  const radii = fields.slice(fields.indexOf("controlRadii"), fields.indexOf("controlTextSizes"));

  assert.match(radii, /xl: "rounded-2xl"/);
  assert.match(radii, /md: "rounded-lg"/);
  assert.match(button, /xl: "h-control-xl[^"]*rounded-2xl"/);
});
