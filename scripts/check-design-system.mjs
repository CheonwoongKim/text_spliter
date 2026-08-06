import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOTS = ["app", "components"];
const EXTENSIONS = new Set([".ts", ".tsx", ".css"]);
const ALLOWED_SPACING = new Set(["0", "1", "2", "3", "4", "6", "8", "10", "12", "16"]);

const RULES = [
  {
    name: "unsupported font size",
    pattern: /\btext-(?:micro|2xs|caption|sm|3xl|4xl|5xl|6xl|7xl|8xl|9xl|\[[^\]]+\])/g,
    guidance: "Use text-xs, text-base, text-lg, text-xl, or text-2xl.",
  },
  {
    name: "unsupported font weight",
    pattern: /\bfont-(?:thin|extralight|light|extrabold|black)\b/g,
    guidance: "Use normal, medium, semibold, or bold.",
  },
  {
    name: "unsupported line height",
    pattern: /\bleading-(?:none|tight|snug|normal|relaxed|loose|3|8|9|10|\[[^\]]+\])/g,
    guidance: "Use the font default or leading-4 through leading-7.",
  },
  {
    name: "unsupported letter spacing",
    pattern: /\btracking-(?:tighter|wider|widest|\[[^\]]+\])/g,
    guidance: "Use tracking-tight, tracking-normal, or tracking-wide.",
  },
  {
    name: "unsupported radius",
    pattern: /\brounded\b(?!-)|\brounded(?:-[trbl]{1,2})?-(?:none|xs|md|2xl|3xl|\[[^\]]+\])/g,
    guidance: "Use rounded-sm, rounded-lg, rounded-xl, or rounded-full.",
  },
  {
    name: "raw Tailwind color",
    pattern: /\b(?:bg|text|border|ring|fill|stroke|from|via|to)-(?:white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-[0-9]+)?(?:\/[0-9]+)?\b/g,
    guidance: "Use a semantic neutral, accent, success, warning, or danger color.",
  },
  {
    name: "arbitrary color",
    pattern: /\b(?:bg|text|border|ring|fill|stroke)-\[(?:#|rgb|hsl|oklch|color:)[^\]]+\]/g,
    guidance: "Add a semantic theme token instead of a raw color.",
  },
  {
    name: "legacy color token",
    pattern: /var\(--color-[^)]+\)/g,
    guidance: "Use a --ds-color-* design token or a semantic Tailwind color.",
  },
  {
    name: "numeric motion duration",
    pattern: /\bduration-[0-9]+\b/g,
    guidance: "Use duration-fast, duration-normal, or duration-slow.",
  },
  {
    name: "unsupported shadow",
    pattern: /\bshadow-(?:none|inner|xl|2xl)\b/g,
    guidance: "Use shadow-sm, shadow, shadow-md, or shadow-lg only for overlap.",
  },
  {
    name: "numeric z-index",
    pattern: /\bz-[0-9]+\b/g,
    guidance: "Use z-navigation, z-dropdown, z-modal, or z-toast.",
  },
  {
    name: "component theme color branch",
    pattern: /\bdark:(?:bg|text|border|ring)-[^\s"'`}]+/g,
    guidance: "Theme differences belong in styles/design-tokens.css.",
  },
  {
    name: "arbitrary spacing",
    pattern: /\b(?:p[trblxy]?|m[trblxy]?|gap|space-[xy])-\[[^\]]+\]/g,
    guidance: "Use the documented spacing scale.",
  },
];

const SPACING_PATTERN = /\b(?:p[trblxy]?|m[trblxy]?|gap|space-[xy])-([0-9]+(?:\.[0-9]+)?)\b/g;

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(entryPath));
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}

function lineAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

const files = (await Promise.all(ROOTS.map(collectFiles))).flat();
const violations = [];

for (const file of files) {
  const source = await readFile(file, "utf8");

  for (const rule of RULES) {
    for (const match of source.matchAll(rule.pattern)) {
      violations.push({ file, line: lineAt(source, match.index), value: match[0], ...rule });
    }
  }

  for (const match of source.matchAll(SPACING_PATTERN)) {
    if (!ALLOWED_SPACING.has(match[1])) {
      violations.push({
        file,
        line: lineAt(source, match.index),
        value: match[0],
        name: "unsupported spacing",
        guidance: "Use 0, 4, 8, 12, 16, 24, 32, 40, 48, or 64px spacing.",
      });
    }
  }
}

if (violations.length) {
  console.error("Design system violations found:\n");
  for (const violation of violations) {
    console.error(
      `${violation.file}:${violation.line} ${violation.value} (${violation.name})\n` +
      `  ${violation.guidance}`,
    );
  }
  process.exitCode = 1;
} else {
  console.log(`Design system check passed (${files.length} files).`);
}
