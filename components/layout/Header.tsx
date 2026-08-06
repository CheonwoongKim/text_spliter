"use client";

import { useCallback } from "react";
import { signOut } from "@/lib/auth";
import ThemeToggle from "@/components/theme/ThemeToggle";

interface HeaderProps {
  title: string;
  isLoggedIn?: boolean;
}

export default function Header({ title, isLoggedIn = true }: HeaderProps) {
  const handleLogout = useCallback(async () => {
    await signOut();
    window.location.replace("/login");
  }, []);

  return (
    <header className="h-topbar border-b border-border bg-card shadow-sm">
      <div className="h-full px-4 sm:px-6 lg:px-10 flex items-center justify-between">
        <h1 className="text-base font-semibold text-card-foreground">
          {title}
        </h1>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isLoggedIn && (
            <button
              onClick={handleLogout}
              className="rounded-lg p-3 text-muted-foreground transition-smooth hover:bg-muted hover:text-surface-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Logout"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
