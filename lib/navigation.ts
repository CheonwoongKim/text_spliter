export const APP_MENU_IDS = [
  "files",
  "parser",
  "splitter",
  "vectorstore",
  "ask",
  "evaluation",
  "document-eval",
  "storage",
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

/**
 * The sidebar reads top to bottom as the pipeline itself: a document is
 * uploaded, parsed, chunked, indexed, and finally asked a question. Measurement
 * and saved artifacts sit outside that flow so an archive never reads as the
 * next step.
 */
export const APP_MENU_SECTIONS: ReadonlyArray<{
  id: "pipeline" | "evaluate" | "resources";
  label: string;
  menuIds: readonly SidebarMenu[];
}> = [
  {
    id: "pipeline",
    label: "파이프라인",
    menuIds: ["files", "parser", "splitter", "vectorstore", "ask"],
  },
  {
    id: "evaluate",
    label: "평가",
    menuIds: ["evaluation", "document-eval"],
  },
  {
    id: "resources",
    label: "자료",
    menuIds: ["storage", "memory"],
  },
];

export const APP_MENU_META: Record<
  AppMenu,
  { shortLabel: string; title: string; breadcrumbRoot: string }
> = {
  files: { shortLabel: "문서", title: "문서", breadcrumbRoot: "파이프라인" },
  parser: { shortLabel: "파싱", title: "문서 파싱", breadcrumbRoot: "파이프라인" },
  splitter: { shortLabel: "청킹", title: "텍스트 청킹", breadcrumbRoot: "파이프라인" },
  vectorstore: { shortLabel: "인덱스", title: "벡터 인덱스", breadcrumbRoot: "파이프라인" },
  ask: { shortLabel: "질의", title: "RAG 질의", breadcrumbRoot: "파이프라인" },
  evaluation: { shortLabel: "답변평가", title: "답변 평가", breadcrumbRoot: "평가" },
  "document-eval": { shortLabel: "파서평가", title: "파서 평가", breadcrumbRoot: "평가" },
  storage: { shortLabel: "보관함", title: "보관함", breadcrumbRoot: "자료" },
  memory: { shortLabel: "가이드", title: "메모리 가이드", breadcrumbRoot: "자료" },
  settings: { shortLabel: "설정", title: "설정", breadcrumbRoot: "워크스페이스" },
  mypage: { shortLabel: "마이페이지", title: "마이 페이지", breadcrumbRoot: "계정" },
};

/** Menu ids that were renamed, so a persisted value still lands somewhere sane. */
const RENAMED_MENUS: Record<string, AppMenu> = {
  licenses: "settings",
  // "Runs" split into a saved-artifact library and a separate query workspace.
  runs: "storage",
  rag: "ask",
};

export function getAppMenuBreadcrumbs(menu: AppMenu): readonly [string, string] {
  const meta = APP_MENU_META[menu];
  return [meta.breadcrumbRoot, meta.title];
}

export function isAppMenu(value: unknown): value is AppMenu {
  return typeof value === "string" && APP_MENU_IDS.some((menu) => menu === value);
}

export function normalizeAppMenu(value: unknown): AppMenu {
  if (typeof value === "string" && RENAMED_MENUS[value]) return RENAMED_MENUS[value];
  return isAppMenu(value) ? value : DEFAULT_APP_MENU;
}
