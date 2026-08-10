import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOTS = ["app", "components"];
const EXTENSIONS = new Set([".ts", ".tsx", ".css"]);
const ALLOWED_SPACING = new Set(["0", "1", "2", "3", "4", "6", "8", "10", "12", "16"]);

const RULES = [
  {
    name: "unsupported font size",
    pattern: /\btext-(?:micro|caption|sm|3xl|4xl|5xl|6xl|7xl|8xl|9xl|\[[^\]]+\])/g,
    guidance: "Use text-xs, text-base, text-lg, text-xl, or text-2xl. text-nav is for GNB labels and text-2xs is for eyebrows, compact tabs/helper text, authentication labels, and Top bar breadcrumbs only.",
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
    pattern: /\brounded\b(?!-)|\brounded(?:-[trbl]{1,2})?-(?:none|xs|md|3xl|\[[^\]]+\])/g,
    guidance: "Use rounded-sm, rounded-lg, rounded-xl, rounded-2xl, or rounded-full.",
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
    guidance: "The MVP uses a single light theme; remove dark theme branches.",
  },
  {
    name: "arbitrary spacing",
    pattern: /\b(?:p[trblxy]?|m[trblxy]?|gap|space-[xy])-\[[^\]]+\]/g,
    guidance: "Use the documented spacing scale.",
  },
];

const SPACING_PATTERN = /\b(?:p[trblxy]?|m[trblxy]?|gap|space-[xy])-([0-9]+(?:\.[0-9]+)?)\b/g;

/**
 * Component rules work as a shrinking budget rather than a hard ban.
 *
 * The shared primitives already existed and were used almost nowhere, because
 * nothing stopped a panel from hand-rolling its own control. A hard ban would
 * fail the build on day one; a budget fails it the moment the count goes up,
 * and each migration phase lowers the number until the rule can simply be
 * "never".
 *
 * Lower a budget when a phase lands. Never raise one.
 */
const COMPONENT_BUDGETS = [
  {
    name: "hand-rolled button",
    pattern: /<button\b/g,
    budget: 139,
    guidance: "Use <Button> from components/shared. See docs/DESIGN_SYSTEM.md.",
    exempt: ["components/shared/Button.tsx"],
  },
  {
    name: "hand-rolled text input",
    pattern: /<input\b/g,
    budget: 51,
    guidance: "Use the field primitives in components/shared/FormFields.tsx.",
    exempt: ["components/shared/FormFields.tsx"],
  },
  {
    name: "hand-rolled select",
    pattern: /<select\b/g,
    budget: 40,
    guidance: "Use the field primitives in components/shared/FormFields.tsx.",
    exempt: ["components/shared/FormFields.tsx"],
  },
  {
    name: "hand-rolled overlay",
    pattern: /className="fixed inset-0/g,
    budget: 7,
    guidance: "Use <Modal> so focus handling and dismissal behave the same everywhere.",
    exempt: ["components/shared/Modal.tsx", "components/shared/ModalDialog.tsx"],
  },
  {
    name: "parallel style constant",
    pattern: /evaluationControlStyles/g,
    budget: 3,
    guidance: "A second style system defeats the first. Migrate to shared primitives.",
    exempt: ["components/evaluation/controlStyles.ts"],
  },
];

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

const componentCounts = new Map(COMPONENT_BUDGETS.map((rule) => [rule.name, 0]));

for (const file of files) {
  const source = await readFile(file, "utf8");
  const normalizedPath = file.split(path.sep).join("/");

  for (const rule of COMPONENT_BUDGETS) {
    if (rule.exempt.includes(normalizedPath)) continue;
    const count = [...source.matchAll(rule.pattern)].length;
    componentCounts.set(rule.name, componentCounts.get(rule.name) + count);
  }

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

const budgetFailures = COMPONENT_BUDGETS
  .map((rule) => ({ rule, count: componentCounts.get(rule.name) }))
  .filter(({ rule, count }) => count > rule.budget);

const budgetWins = COMPONENT_BUDGETS
  .map((rule) => ({ rule, count: componentCounts.get(rule.name) }))
  .filter(({ rule, count }) => count < rule.budget);

if (budgetFailures.length) {
  console.error("Component budgets exceeded:\n");
  for (const { rule, count } of budgetFailures) {
    console.error(
      `${rule.name}: ${count} found, budget ${rule.budget}\n  ${rule.guidance}`,
    );
  }
  console.error("");
  process.exitCode = 1;
}

if (budgetWins.length) {
  console.log("Component budgets can be lowered:");
  for (const { rule, count } of budgetWins) {
    console.log(`  ${rule.name}: ${rule.budget} -> ${count}`);
  }
  console.log("");
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
} else if (!budgetFailures.length) {
  console.log(`Design system check passed (${files.length} files).`);
}
