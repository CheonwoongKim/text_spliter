"use client";

import { ChevronRight, House, Settings, UserRound, type LucideIcon } from "lucide-react";
import { Button } from "@/components/shared/Button";
import {
  APP_MENU_META,
  DEFAULT_APP_MENU,
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
        {/* The last crumb is the page, so it is the page heading. Repeating it
            below the bar cost a line of vertical space on every screen. */}
        <nav aria-label="현재 위치" className="min-w-0">
          <ol className="flex min-w-0 items-center gap-2">
            <li className="flex shrink-0 items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onMenuChange(DEFAULT_APP_MENU)}
                aria-label="홈으로 이동"
                title="홈"
              >
                <House className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              </Button>
            </li>
            {breadcrumbs.map((breadcrumb, index) => {
              const isCurrent = index === breadcrumbs.length - 1;

              return (
                <li key={`${breadcrumb}-${index}`} className="flex min-w-0 items-center gap-2">
                  <ChevronRight
                    className="h-3 w-3 shrink-0 text-muted-foreground"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  {isCurrent ? (
                    <h1
                      className="truncate text-2xs font-semibold text-card-foreground"
                      aria-current="page"
                    >
                      {breadcrumb}
                    </h1>
                  ) : (
                    <span className="shrink-0 text-2xs font-normal text-muted-foreground">
                      {breadcrumb}
                    </span>
                  )}
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
