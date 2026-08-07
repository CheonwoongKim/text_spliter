import { useCallback, useEffect, useRef, useState } from "react";
import { COPY_FEEDBACK_DURATION } from "@/lib/constants";

interface UseCopyToClipboardReturn {
  copied: boolean;
  copy: (text: string) => Promise<void>;
  reset: () => void;
}

/**
 * Custom hook for copying text to clipboard with feedback
 * @param duration - Duration to show "copied" feedback in milliseconds (default: 2000ms)
 */
export function useCopyToClipboard(duration: number = COPY_FEEDBACK_DURATION): UseCopyToClipboardReturn {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearResetTimer = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearResetTimer, [clearResetTimer]);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      clearResetTimer();
      setCopied(true);
      resetTimerRef.current = setTimeout(() => {
        setCopied(false);
        resetTimerRef.current = null;
      }, duration);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      throw error;
    }
  }, [clearResetTimer, duration]);

  const reset = useCallback(() => {
    clearResetTimer();
    setCopied(false);
  }, [clearResetTimer]);

  return { copied, copy, reset };
}
