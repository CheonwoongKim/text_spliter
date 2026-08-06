"use client";

import { memo } from "react";
import {
  APP_MENU_META,
  APP_MENU_SECTIONS,
  type AppMenu,
} from "@/lib/navigation";

interface SidebarProps {
  activeMenu: AppMenu;
  onMenuChange: (menu: AppMenu) => void;
}

const MENU_ICON_PATHS: Record<AppMenu, string> = {
  parser:
    "M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2",
  splitter: "M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01",
  storage:
    "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4",
  vectorstore:
    "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4",
  evaluation:
    "M9 11l2 2 4-4m5-2.25A11.95 11.95 0 0112 3a11.95 11.95 0 01-8 3.75C4 12.15 7.4 17.1 12 19c4.6-1.9 8-6.85 8-12.25z",
  files:
    "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z",
  settings:
    "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
};

interface MenuButtonProps {
  menu: AppMenu;
  activeMenu: AppMenu;
  onMenuChange: (menu: AppMenu) => void;
}

function MenuButton({ menu, activeMenu, onMenuChange }: MenuButtonProps) {
  const meta = APP_MENU_META[menu];
  const isActive = activeMenu === menu;

  return (
    <button
      type="button"
      onClick={() => onMenuChange(menu)}
      className={`flex h-14 w-14 flex-col items-center justify-center rounded-lg transition-smooth ${
        isActive
          ? "bg-muted text-card-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-card-foreground"
      }`}
      aria-label={meta.title}
      aria-current={isActive ? "page" : undefined}
      title={meta.title}
    >
      <svg
        className="mb-1 h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d={MENU_ICON_PATHS[menu]}
        />
      </svg>
      <span className="text-2xs font-medium">{meta.shortLabel}</span>
    </button>
  );
}

function Sidebar({ activeMenu, onMenuChange }: SidebarProps) {
  const workflowSection = APP_MENU_SECTIONS.find((section) => section.id === "workflow");
  const resourceSection = APP_MENU_SECTIONS.find((section) => section.id === "resources");
  const systemSection = APP_MENU_SECTIONS.find((section) => section.id === "system");

  return (
    <aside className="flex w-sidebar flex-col items-center border-r border-border bg-card py-6">
      {/* Logo */}
      <div className="mb-6">
        <h1 className="text-card-foreground font-bold text-lg tracking-tight">BGK</h1>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col items-center" aria-label="Application navigation">
        <div className="flex flex-col items-center gap-2" role="group" aria-label={workflowSection?.label}>
          {workflowSection?.menuIds.map((menu) => (
            <MenuButton key={menu} menu={menu} activeMenu={activeMenu} onMenuChange={onMenuChange} />
          ))}
        </div>

        <div className="my-3 w-8 border-t border-border" aria-hidden="true" />

        <div className="flex flex-col items-center gap-2" role="group" aria-label={resourceSection?.label}>
          {resourceSection?.menuIds.map((menu) => (
            <MenuButton key={menu} menu={menu} activeMenu={activeMenu} onMenuChange={onMenuChange} />
          ))}
        </div>

        <div className="mt-auto flex flex-col items-center" role="group" aria-label={systemSection?.label}>
          <div className="mb-3 w-8 border-t border-border" aria-hidden="true" />
          {systemSection?.menuIds.map((menu) => (
            <MenuButton key={menu} menu={menu} activeMenu={activeMenu} onMenuChange={onMenuChange} />
          ))}
        </div>
      </nav>
    </aside>
  );
}

export default memo(Sidebar);
