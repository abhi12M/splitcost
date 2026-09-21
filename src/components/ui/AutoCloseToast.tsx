"use client";

import * as React from "react";

export type AutoCloseToastProps = {
  /** Text shown in the toast. */
  message: React.ReactNode;
  /** Controls whether the toast is visible. */
  open: boolean;
  /** Called exactly once when the fixed three-second display period ends. */
  onTimeout?: () => void;
  className?: string;
};

/**
 * A compact calculator-style status toast. It is deliberately non-dismissible:
 * it has no close control, outside-click handler, keyboard handler, or swipe gesture.
 */
export function AutoCloseToast({ message, open, onTimeout, className }: AutoCloseToastProps) {
  const [isVisible, setIsVisible] = React.useState(open);
  const onTimeoutRef = React.useRef(onTimeout);

  React.useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  React.useEffect(() => {
    if (!open) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);

    const timeoutId = window.setTimeout(() => {
      setIsVisible(false);
      onTimeoutRef.current?.();
    }, 3_000);
    return () => window.clearTimeout(timeoutId);
  }, [open]);

  if (!isVisible) return null;

  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className={`pointer-events-none fixed bottom-20 left-1/2 z-[100] w-max max-w-[calc(100vw-3rem)] -translate-x-1/2 rounded-full bg-[#303030] px-5 py-3 text-center text-xs font-medium leading-none text-[#f4f4f4] shadow-[0_8px_20px_rgba(0,0,0,0.35)] ${className ?? ""}`}
      role="status"
    >
      {message}
    </div>
  );
}
