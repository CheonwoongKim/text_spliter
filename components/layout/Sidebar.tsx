"use client";

import {
  BrainCircuit,
  Boxes,
  ClipboardCheck,
  Database,
  FileSearch,
  Folder,
  ListTree,
  type LucideIcon,
} from "lucide-react";
import { memo } from "react";
import {
  APP_MENU_META,
  APP_MENU_SECTIONS,
  type AppMenu,
  type SidebarMenu,
} from "@/lib/navigation";

interface SidebarProps {
  activeMenu: AppMenu;
  onMenuChange: (menu: AppMenu) => void;
}

const MENU_ICONS = {
  parser: FileSearch,
  splitter: ListTree,
  storage: Database,
  vectorstore: Boxes,
  evaluation: ClipboardCheck,
  files: Folder,
  memory: BrainCircuit,
} satisfies Record<SidebarMenu, LucideIcon>;

interface MenuButtonProps {
  menu: SidebarMenu;
  activeMenu: AppMenu;
  onMenuChange: (menu: AppMenu) => void;
}

function MenuButton({ menu, activeMenu, onMenuChange }: MenuButtonProps) {
  const meta = APP_MENU_META[menu];
  const isActive = activeMenu === menu;
  const MenuIcon = MENU_ICONS[menu];

  return (
    <button
      type="button"
      onClick={() => onMenuChange(menu)}
      className={`flex h-14 w-14 flex-col items-center justify-center rounded-lg transition-smooth ${
        isActive
          ? "text-card-foreground"
          : "text-subdued hover:text-card-foreground"
      }`}
      aria-label={meta.title}
      aria-current={isActive ? "page" : undefined}
      title={meta.title}
    >
      <MenuIcon
        className="mb-1 h-icon-md w-icon-md"
        strokeWidth={1}
        aria-hidden="true"
      />
      <span className="text-nav font-medium">{meta.shortLabel}</span>
    </button>
  );
}

function Sidebar({ activeMenu, onMenuChange }: SidebarProps) {
  const workflowSection = APP_MENU_SECTIONS.find((section) => section.id === "workflow");
  const resourceSection = APP_MENU_SECTIONS.find((section) => section.id === "resources");

  return (
    <aside className="flex w-sidebar flex-col items-center border-r border-border-subtle bg-card py-6">
      {/* Logo */}
      <div className="mb-8">
        <h1 className="text-card-foreground font-bold text-lg tracking-tight">BGK</h1>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col items-center" aria-label="Application navigation">
        <div className="flex flex-col items-center gap-2" role="group" aria-label={workflowSection?.label}>
          {workflowSection?.menuIds.map((menu) => (
            <MenuButton key={menu} menu={menu} activeMenu={activeMenu} onMenuChange={onMenuChange} />
          ))}
        </div>

        <div className="my-3 w-6 border-t border-border-subtle" aria-hidden="true" />

        <div className="flex flex-col items-center gap-2" role="group" aria-label={resourceSection?.label}>
          {resourceSection?.menuIds.map((menu) => (
            <MenuButton key={menu} menu={menu} activeMenu={activeMenu} onMenuChange={onMenuChange} />
          ))}
        </div>
      </nav>
    </aside>
  );
}

export default memo(Sidebar);
