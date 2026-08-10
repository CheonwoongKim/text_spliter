"use client";

import {
  Archive,
  BrainCircuit,
  Boxes,
  ClipboardCheck,
  FileCheck2,
  FileSearch,
  Folder,
  ListTree,
  MessagesSquare,
  type LucideIcon,
} from "lucide-react";
import { Fragment, memo } from "react";
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
  files: Folder,
  parser: FileSearch,
  splitter: ListTree,
  vectorstore: Boxes,
  ask: MessagesSquare,
  evaluation: ClipboardCheck,
  "document-eval": FileCheck2,
  storage: Archive,
  memory: BrainCircuit,
} satisfies Record<SidebarMenu, LucideIcon>;

interface MenuButtonProps {
  menu: SidebarMenu;
  activeMenu: AppMenu;
  onMenuChange: (menu: AppMenu) => void;
}

/**
 * A navigation item rests in the muted foreground rather than the placeholder
 * grey: at the 10px navigation size the placeholder tone falls below the
 * contrast a label needs to be read at all.
 *
 * Selection is carried by weight as well as colour, so it survives for a reader
 * who cannot separate these two greys. Icon and label thicken together.
 *
 * Lucide strokes are expressed against a 24 unit viewBox. At the compact 16px
 * GNB size, a stroke of 1 lands under a device pixel and is antialiased toward
 * the background; 1.5 keeps the resting stroke at one full pixel.
 */
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
          : "text-muted-foreground hover:text-card-foreground"
      }`}
      aria-label={meta.title}
      aria-current={isActive ? "page" : undefined}
      title={meta.title}
    >
      <MenuIcon
        className="mb-1 h-icon-sm w-icon-sm"
        strokeWidth={isActive ? 2 : 1.5}
        aria-hidden="true"
      />
      <span className={`text-nav ${isActive ? "font-bold" : "font-medium"}`}>
        {meta.shortLabel}
      </span>
    </button>
  );
}

function Sidebar({ activeMenu, onMenuChange }: SidebarProps) {
  return (
    <aside className="flex w-sidebar flex-col items-center border-r border-border-subtle bg-card">
      {/* Logo */}
      <div className="flex h-topbar w-full shrink-0 items-center justify-center">
        <h1 className="text-card-foreground font-bold text-base tracking-tight">BGK</h1>
      </div>

      <nav
        className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto pb-6 pt-6"
        aria-label="주 메뉴"
      >
        {APP_MENU_SECTIONS.map((section, index) => (
          <Fragment key={section.id}>
            {index > 0 && (
              <div className="my-3 w-6 border-t border-border-subtle" aria-hidden="true" />
            )}
            <div className="flex flex-col items-center gap-2" role="group" aria-label={section.label}>
              {section.menuIds.map((menu) => (
                <MenuButton
                  key={menu}
                  menu={menu}
                  activeMenu={activeMenu}
                  onMenuChange={onMenuChange}
                />
              ))}
            </div>
          </Fragment>
        ))}
      </nav>
    </aside>
  );
}

export default memo(Sidebar);
