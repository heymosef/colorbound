import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Manages a boolean "copied" flag that auto-resets after a timeout.
 * Cleans up pending timeouts on unmount.
 */
export function useCopyFeedback(duration = 2000) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const trigger = useCallback(() => {
    setCopied(true);
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setCopied(false);
      timeoutRef.current = null;
    }, duration);
  }, [duration]);

  return [copied, trigger] as const;
}
