"use client";

import { ChevronRight, Settings, UserRound, type LucideIcon } from "lucide-react";
import { Button } from "@/components/shared/Button";
import {
  APP_MENU_META,
  TOP_BAR_MENU_IDS,
  type AppMenu,
  type TopBarMenu,
} from "@/lib/navigation";

interface HeaderProps {
  breadcrumbs: readonly string[];
  activeMenu: AppMenu;
  onMenuChange: (menu: AppMenu) => void;
}

const TOP_BAR_MENU_ICONS = {
  settings: Settings,
  mypage: UserRound,
} satisfies Record<TopBarMenu, LucideIcon>;

export default function Header({ breadcrumbs, activeMenu, onMenuChange }: HeaderProps) {
  return (
    <header className="h-topbar border-b border-border-subtle bg-card">
      <div className="h-full px-4 sm:px-6 lg:px-10 flex items-center justify-between">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-2xs font-normal">
            {breadcrumbs.map((breadcrumb, index) => {
              const isCurrent = index === breadcrumbs.length - 1;

              return (
                <li key={`${breadcrumb}-${index}`} className="flex items-center gap-2">
                  {index > 0 && (
                    <ChevronRight
                      className="h-3 w-3 text-subdued"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={isCurrent ? "text-card-foreground" : "text-subdued"}
                    aria-current={isCurrent ? "page" : undefined}
                  >
                    {breadcrumb}
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>

        <nav className="flex items-center gap-4" aria-label="Account navigation">
          {TOP_BAR_MENU_IDS.map((menu) => {
            const MenuIcon = TOP_BAR_MENU_ICONS[menu];
            const meta = APP_MENU_META[menu];
            const isActive = activeMenu === menu;

            return (
              <Button variant="ghost" size="md" key={menu} onClick={() => onMenuChange(menu)} aria-label={meta.title} aria-current={isActive ? "page" : undefined} title={meta.title}>
                <MenuIcon
                  className="h-icon-md w-icon-md"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </Button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
