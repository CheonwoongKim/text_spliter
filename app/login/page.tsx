"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { setAuthToken, setRefreshToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEmail(e.target.value);
      setError(null);
    },
    []
  );

  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(e.target.value);
      setError(null);
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!email || !password) {
        setError("Please enter email and password.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          "http://ywstorage.synology.me:4000/v1/auth/login",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              accept: "*/*",
            },
            body: JSON.stringify({
              email,
              password,
            }),
          }
        );

        console.log("Response status:", response.status);
        console.log("Response ok:", response.ok);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Error response:", errorData);
          throw new Error(
            errorData.message || "Login failed. Please check your credentials."
          );
        }

        const data = await response.json();
        console.log("Login response data:", data);

        // JWT 토큰 저장
        if (data.token || data.access_token || data.accessToken) {
          const token = data.token || data.access_token || data.accessToken;
          setAuthToken(token);

          // Refresh token도 있다면 저장
          if (data.refresh_token || data.refreshToken) {
            const refreshToken = data.refresh_token || data.refreshToken;
            setRefreshToken(refreshToken);
          }
        }

        // 로그인 성공 - 메인 페이지로 이동
        router.push("/");
      } catch (err) {
        console.error("Login error:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setLoading(false);
      }
    },
    [email, password, router]
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-card-foreground mb-2">
            BGK
          </h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, please sign in to continue
          </p>
        </div>

        {/* Login Form */}
        <div>
          <form onSubmit={handleSubmit}>
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center">
                  <svg
                    className="h-5 w-5 text-red-400 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-sm text-red-800 dark:text-red-200">
                    {error}
                  </span>
                </div>
              </div>
            )}

            {/* Email Input */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-surface-foreground mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                disabled={loading}
                placeholder="Enter your email"
                className="w-full h-12 px-0 border-0 border-b border-border
                         focus:outline-none focus:ring-0 focus:ring-offset-0
                         focus:border-0 focus:border-b-2 focus:border-accent
                         bg-transparent text-card-foreground
                         placeholder-light focus:placeholder-transparent
                         disabled:opacity-disabled disabled:cursor-not-allowed"
                autoComplete="email"
              />
            </div>

            {/* Password Input */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-surface-foreground mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={handlePasswordChange}
                disabled={loading}
                placeholder="Enter your password"
                className="w-full h-12 px-0 border-0 border-b border-border
                         focus:outline-none focus:ring-0 focus:ring-offset-0
                         focus:border-0 focus:border-b-2 focus:border-accent
                         bg-transparent text-card-foreground
                         placeholder-light focus:placeholder-transparent
                         disabled:opacity-disabled disabled:cursor-not-allowed"
                autoComplete="current-password"
              />
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-card hover:bg-muted
                       disabled:bg-muted disabled:text-muted-foreground
                       text-card-foreground font-medium rounded-lg
                       border border-border
                       transition-smooth disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
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
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>

            {/* Admin Contact Message */}
            <p className="text-center text-xs text-muted-foreground mt-14">
              For login assistance, please contact your administrator
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
