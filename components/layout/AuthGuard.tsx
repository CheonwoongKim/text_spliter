"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { clearAuthTokens, syncAuthSession } from "@/lib/auth";
import { getBrowserSupabase } from "@/lib/supabase-browser";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let active = true;
    const publicPaths = ["/login"];
    const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
    const supabase = getBrowserSupabase();

    const applySession = (session: Parameters<typeof syncAuthSession>[0]) => {
      if (!active) return;

      syncAuthSession(session);

      if (!session && !isPublicPath) {
        router.replace("/login");
      } else if (session && isPublicPath) {
        router.replace("/");
      } else {
        setIsChecking(false);
      }
    };

    setIsChecking(true);
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
  }, [pathname, router]);

  // Show loading spinner while checking auth
  if (isChecking) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <svg
            className="w-8 h-8 animate-spin text-accent"
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
          <span className="text-base text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
