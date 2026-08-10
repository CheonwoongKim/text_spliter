"use client";

import { LoaderCircle, LogOut } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { useEffect, useState } from "react";
import { signOut } from "@/lib/auth";
import { getBrowserSupabase } from "@/lib/supabase-browser";

export default function MyPagePanel() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        const { data, error } = await getBrowserSupabase().auth.getUser();
        if (!active) return;

        if (error) {
          console.error("[MyPage] Failed to load the signed-in user:", error);
        } else {
          setEmail(data.user.email ?? null);
        }
      } catch (error) {
        if (active) console.error("[MyPage] Failed to load the signed-in user:", error);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadUser();

    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    try {
      await signOut();
    } finally {
      window.location.replace("/login");
    }
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <header>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Account
          </p>
          <h1 className="mt-1 text-lg font-semibold text-card-foreground">My Page</h1>
        </header>

        <section className="mt-6 border-t border-border-subtle py-6">
          <p className="text-xs text-muted-foreground">이메일</p>
          <div className="mt-1 flex min-h-control-sm items-center">
            {loading && (
              <LoaderCircle
                className="mr-2 h-4 w-4 animate-spin text-muted-foreground"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            )}
            <p className="text-xs font-medium text-card-foreground">
              {loading ? "Loading account..." : email ?? "Email unavailable"}
            </p>
          </div>

          <div className="mt-6 border-t border-border-subtle pt-6">
            <Button variant="outline" size="md" onClick={handleLogout}>
              <LogOut className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              Log out
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
