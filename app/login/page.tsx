"use client";

import { useCallback, useState } from "react";
import { syncAuthSession } from "@/lib/auth";
import { getBrowserSupabase } from "@/lib/supabase-browser";

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
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-card-foreground mb-2">
            BGK
          </h1>
          <p className="text-base text-muted-foreground">
            Supabase Authentication
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <label htmlFor="login-email" className="mb-2 block text-xs font-normal text-surface-foreground">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="예: name@company.com"
                className="h-control-xl w-full rounded-lg border border-border
                         bg-card px-4 text-card-foreground placeholder-light
                         transition-smooth focus:outline-none focus:border-surface-foreground"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label htmlFor="login-password" className="mb-2 block text-xs font-normal text-surface-foreground">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="영문, 숫자, 특수문자 포함 8자리 이상 입력"
                className="h-control-xl w-full rounded-lg border border-border
                         bg-card px-4 text-card-foreground placeholder-light
                         transition-smooth focus:outline-none focus:border-surface-foreground"
                autoComplete="current-password"
                minLength={6}
                required
              />
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {error && (
              <p className="text-base text-danger" role="alert">
                {error}
              </p>
            )}

            {message && (
              <p className="text-base text-success" role="status">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-control-xl bg-card hover:bg-muted
                       text-base text-card-foreground font-medium rounded-lg
                       border border-border transition-smooth
                       flex items-center justify-center gap-2
                       disabled:cursor-not-allowed disabled:opacity-disabled"
            >
              {loading ? "처리 중..." : mode === "signin" ? "로그인" : "계정 생성"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setMode((current) => current === "signin" ? "signup" : "signin");
              setError(null);
              setMessage(null);
            }}
            className="mt-8 w-full text-center text-base text-muted-foreground hover:text-card-foreground transition-smooth"
          >
            {mode === "signin" ? "계정이 없나요? 회원가입" : "이미 계정이 있나요? 로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
