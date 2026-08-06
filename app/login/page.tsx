"use client";

import { useCallback, useState } from "react";
import { syncAuthSession } from "@/lib/auth";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import ThemeToggle from "@/components/theme/ThemeToggle";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setLoading(true);
      setError(null);
      setMessage(null);

      try {
        const supabase = getBrowserSupabase();
        const credentials = { email: email.trim(), password };
        const { data, error: authError } = mode === "signin"
          ? await supabase.auth.signInWithPassword(credentials)
          : await supabase.auth.signUp(credentials);

        if (authError) throw authError;

        if (data.session) {
          syncAuthSession(data.session);
          window.location.replace("/");
          return;
        }

        setMessage("계정 확인 메일을 보냈습니다. 이메일 인증 후 로그인해 주세요.");
      } catch (authError) {
        setError(authError instanceof Error ? authError.message : "인증에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [email, mode, password]
  );

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle showLabel />
      </div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight leading-7 text-card-foreground mb-1">
            BGK
          </h1>
          <p className="text-xs font-normal leading-4 tracking-normal text-muted-foreground">
            Supabase Authentication
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-xs font-semibold leading-4 tracking-wide uppercase text-muted-foreground mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full h-control-lg px-0 border-0 border-b border-border
                       focus:outline-none focus:ring-0 focus:ring-offset-0
                       focus:border-0 focus:border-b-2 focus:border-accent
                       bg-transparent text-base font-normal leading-5 tracking-normal text-card-foreground
                       placeholder-light focus:placeholder-transparent transition-smooth"
              autoComplete="email"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs font-semibold leading-4 tracking-wide uppercase text-muted-foreground mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              className="w-full h-control-lg px-0 border-0 border-b border-border
                       focus:outline-none focus:ring-0 focus:ring-offset-0
                       focus:border-0 focus:border-b-2 focus:border-accent
                       bg-transparent text-base font-normal leading-5 tracking-normal text-card-foreground
                       placeholder-light focus:placeholder-transparent transition-smooth"
              autoComplete="current-password"
              minLength={6}
              required
            />
          </div>

          {error && (
            <p className="mb-3 text-xs font-medium leading-4 text-danger" role="alert">
              {error}
            </p>
          )}

          {message && (
            <p className="mb-3 text-xs font-medium leading-4 text-success" role="status">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-control-lg bg-card hover:bg-muted
                     text-card-foreground text-base font-medium leading-5 tracking-tight rounded-lg
                     border border-border transition-smooth
                     flex items-center justify-center gap-2
                     disabled:cursor-not-allowed disabled:opacity-disabled"
          >
            {loading ? "처리 중..." : mode === "signin" ? "로그인" : "계정 생성"}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode((current) => current === "signin" ? "signup" : "signin");
              setError(null);
              setMessage(null);
            }}
            className="mt-6 w-full text-center text-xs font-medium leading-4 tracking-normal text-muted-foreground hover:text-card-foreground transition-smooth"
          >
            {mode === "signin" ? "계정이 없나요? 회원가입" : "이미 계정이 있나요? 로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
