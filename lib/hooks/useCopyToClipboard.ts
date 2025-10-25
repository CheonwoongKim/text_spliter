import { useState, useCallback } from 'react';
import { COPY_FEEDBACK_DURATION } from '@/lib/constants';

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

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), duration);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      throw error;
    }
  }, [duration]);

  const reset = useCallback(() => {
    setCopied(false);
  }, []);

  return { copied, copy, reset };
}
