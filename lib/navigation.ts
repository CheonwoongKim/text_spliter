export const APP_MENU_IDS = [
  "parser",
  "splitter",
  "storage",
  "vectorstore",
  "evaluation",
  "files",
  "memory",
  "settings",
  "mypage",
] as const;

export type AppMenu = (typeof APP_MENU_IDS)[number];

export const TOP_BAR_MENU_IDS = ["settings", "mypage"] as const satisfies readonly AppMenu[];
export type TopBarMenu = (typeof TOP_BAR_MENU_IDS)[number];
export type SidebarMenu = Exclude<AppMenu, TopBarMenu>;

export const DEFAULT_APP_MENU: AppMenu = "parser";
export const APP_MENU_STORAGE_KEY = "text-splitter-active-menu";

export const APP_MENU_SECTIONS: ReadonlyArray<{
  id: "workflow" | "resources";
  label: string;
  menuIds: readonly SidebarMenu[];
}> = [
  {
    id: "workflow",
    label: "Document workflow",
    menuIds: ["parser", "splitter", "storage", "vectorstore", "evaluation"],
  },
  {
    id: "resources",
    label: "Resources",
    menuIds: ["files", "memory"],
  },
];

export const APP_MENU_META: Record<
  AppMenu,
  { shortLabel: string; title: string; breadcrumbRoot: string }
> = {
  parser: { shortLabel: "Parser", title: "Parser", breadcrumbRoot: "Workflow" },
  splitter: { shortLabel: "Splitter", title: "Text Splitter", breadcrumbRoot: "Workflow" },
  storage: { shortLabel: "Runs", title: "Runs", breadcrumbRoot: "Workflow" },
  vectorstore: { shortLabel: "Vectors", title: "Vector Store", breadcrumbRoot: "Workflow" },
  evaluation: { shortLabel: "Evaluate", title: "Evaluation", breadcrumbRoot: "Workflow" },
  files: { shortLabel: "Files", title: "Files", breadcrumbRoot: "Resources" },
  memory: { shortLabel: "Memory", title: "Memory Guide", breadcrumbRoot: "Resources" },
  settings: { shortLabel: "Settings", title: "Settings", breadcrumbRoot: "Workspace" },
  mypage: { shortLabel: "My Page", title: "My Page", breadcrumbRoot: "Account" },
};

export function getAppMenuBreadcrumbs(menu: AppMenu): readonly [string, string] {
  const meta = APP_MENU_META[menu];
  return [meta.breadcrumbRoot, meta.title];
}

export function isAppMenu(value: unknown): value is AppMenu {
  return typeof value === "string" && APP_MENU_IDS.some((menu) => menu === value);
}

export function normalizeAppMenu(value: unknown): AppMenu {
  if (value === "licenses") return "settings";
  return isAppMenu(value) ? value : DEFAULT_APP_MENU;
}
