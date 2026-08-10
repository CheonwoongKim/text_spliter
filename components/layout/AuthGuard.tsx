"use client";

import type { Session } from "@supabase/supabase-js";
import { LoaderCircle, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/shared/Button";
import { clearAuthTokens, syncAuthSession } from "@/lib/auth";
import { restoreAuthSession } from "@/lib/auth-session";
import { getBrowserSupabase } from "@/lib/supabase-browser";

interface AuthGuardProps {
  children: React.ReactNode;
}

export const PUBLIC_PATHS = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
]);

const REDIRECT_AUTHENTICATED_PATHS = new Set([
  "/login",
  "/signup",
  "/forgot-password",
]);

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isPublicPath = PUBLIC_PATHS.has(pathname);
  const [session, setSession] = useState<Session | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [checkAttempt, setCheckAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    const applySession = (nextSession: Session | null) => {
      if (!active) return;

      syncAuthSession(nextSession);
      setSession(nextSession);
      setCheckError(null);
      setIsChecking(false);
    };

    const failSessionCheck = (error: unknown) => {
      if (!active) return;

      console.error("[AuthGuard] Failed to restore Supabase session:", error);
      clearAuthTokens();
      setSession(null);
      setCheckError("인증 상태를 확인하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.");
      setIsChecking(false);
    };

    setIsChecking(true);
    setCheckError(null);

    try {
      const supabase = getBrowserSupabase();

      void restoreAuthSession(supabase.auth)
        .then(applySession)
        .catch(failSessionCheck);

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        applySession(nextSession);
      });

      return () => {
        active = false;
        authListener.subscription.unsubscribe();
      };
    } catch (error) {
      failSessionCheck(error);
      return () => {
        active = false;
      };
    }
  }, [checkAttempt]);

  useEffect(() => {
    if (isChecking || checkError) return;

    if (!session && !isPublicPath) {
      router.replace("/login");
    } else if (session && REDIRECT_AUTHENTICATED_PATHS.has(pathname)) {
      router.replace("/");
    }
  }, [checkError, isChecking, isPublicPath, pathname, router, session]);

  // Public entry screens belong in the first HTML response. Session restore
  // still runs in the background so an existing user can be redirected.
  if (isPublicPath) {
    return <>{children}</>;
  }

  if (checkError) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface px-4">
        <div className="flex max-w-auth flex-col items-center gap-4 text-center">
          <p className="text-base text-card-foreground" role="alert">
            {checkError}
          </p>
          <Button
            variant="secondary"
            leftIcon={<RotateCcw className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />}
            onClick={() => setCheckAttempt((attempt) => attempt + 1)}
          >
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  if (isChecking || !session) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle
            className="h-icon-md w-icon-md animate-spin text-card-foreground"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <span className="text-xs text-muted-foreground">불러오는 중...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
