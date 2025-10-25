"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { clearAuthTokens } from "@/lib/auth";

interface HeaderProps {
  title: string;
  isLoggedIn?: boolean;
}

export default function Header({ title, isLoggedIn = true }: HeaderProps) {
  const router = useRouter();

  const handleLogout = useCallback(() => {
    // JWT 토큰 제거
    clearAuthTokens();

    // 로그인 페이지로 이동
    router.push("/login");
  }, [router]);

  return (
    <header className="border-b border-border bg-card shadow-sm">
      <div className="px-10 py-4 flex items-center justify-between">
        <h1 className="text-[14px] font-semibold text-card-foreground">
          {title}
        </h1>

        {isLoggedIn && (
          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:text-surface-foreground
                     transition-smooth p-1"
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
    </header>
  );
}
