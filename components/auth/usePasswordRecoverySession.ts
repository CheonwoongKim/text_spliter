"use client";

import { useEffect, useState } from "react";
import { getSafeAuthErrorMessage } from "@/lib/auth-feedback";
import { restoreAuthSession } from "@/lib/auth-session";
import { getBrowserSupabase } from "@/lib/supabase-browser";

type RecoveryStatus = "checking" | "ready" | "invalid";

type RecoverySessionState = {
  status: RecoveryStatus;
  error: string | null;
};

export function usePasswordRecoverySession(
  getSupabase: typeof getBrowserSupabase,
): RecoverySessionState {
  const [state, setState] = useState<RecoverySessionState>({
    status: "checking",
    error: null,
  });

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    const update = (nextState: RecoverySessionState) => {
      if (active) setState(nextState);
    };
    const fail = (error: unknown) => {
      update({
        status: "invalid",
        error: getSafeAuthErrorMessage("update-password", error),
      });
    };

    try {
      const auth = getSupabase().auth;

      void restoreAuthSession(auth)
        .then((session) => {
          update({ status: session ? "ready" : "invalid", error: null });
        })
        .catch(fail);

      const { data } = auth.onAuthStateChange((_event, session) => {
        if (session) update({ status: "ready", error: null });
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch (error) {
      fail(error);
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [getSupabase]);

  return state;
}
