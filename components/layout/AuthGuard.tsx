"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { clearAuthTokens, syncAuthSession } from "@/lib/auth";
import { getBrowserSupabase } from "@/lib/supabase-browser";

interface AuthGuardProps {
  children: React.ReactNode;
}

const PUBLIC_PATHS = new Set(["/login", "/signup"]);

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isPublicPath = PUBLIC_PATHS.has(pathname);
  const [session, setSession] = useState<Session | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let active = true;
    const supabase = getBrowserSupabase();

    const applySession = (nextSession: Session | null) => {
      if (!active) return;

      syncAuthSession(nextSession);
      setSession(nextSession);
      setIsChecking(false);
    };

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("[AuthGuard] Failed to restore Supabase session:", error);
        clearAuthTokens();
        applySession(null);
        return;
      }

      applySession(data.session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const needsRedirect =
    !isChecking && ((!session && !isPublicPath) || (Boolean(session) && isPublicPath));

  useEffect(() => {
    if (isChecking) return;

    if (!session && !isPublicPath) {
      router.replace("/login");
    } else if (session && isPublicPath) {
      router.replace("/");
    }
  }, [isChecking, isPublicPath, router, session]);

  if (isChecking || needsRedirect) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <svg
            className="w-icon-md h-icon-md animate-spin text-card-foreground"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-xs text-muted-foreground">불러오는 중...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
