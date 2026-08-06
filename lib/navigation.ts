export const APP_MENU_IDS = [
  "parser",
  "splitter",
  "storage",
  "vectorstore",
  "evaluation",
  "files",
  "settings",
] as const;

export type AppMenu = (typeof APP_MENU_IDS)[number];

export const DEFAULT_APP_MENU: AppMenu = "parser";
export const APP_MENU_STORAGE_KEY = "text-splitter-active-menu";

export const APP_MENU_SECTIONS: ReadonlyArray<{
  id: "workflow" | "resources" | "system";
  label: string;
  menuIds: readonly AppMenu[];
}> = [
  {
    id: "workflow",
    label: "Document workflow",
    menuIds: ["parser", "splitter", "storage", "vectorstore", "evaluation"],
  },
  {
    id: "resources",
    label: "Resources",
    menuIds: ["files"],
  },
  {
    id: "system",
    label: "System",
    menuIds: ["settings"],
  },
];

export const APP_MENU_META: Record<
  AppMenu,
  { shortLabel: string; title: string }
> = {
  parser: { shortLabel: "Parser", title: "Parser" },
  splitter: { shortLabel: "Splitter", title: "Text Splitter" },
  storage: { shortLabel: "Runs", title: "Runs" },
  vectorstore: { shortLabel: "Vectors", title: "Vector Store" },
  evaluation: { shortLabel: "Evaluate", title: "Evaluation" },
  files: { shortLabel: "Files", title: "Files" },
  settings: { shortLabel: "Settings", title: "Settings" },
};

export function isAppMenu(value: unknown): value is AppMenu {
  return typeof value === "string" && APP_MENU_IDS.some((menu) => menu === value);
}

export function normalizeAppMenu(value: unknown): AppMenu {
  if (value === "licenses") return "settings";
  return isAppMenu(value) ? value : DEFAULT_APP_MENU;
}
