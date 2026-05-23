"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useKeyboardLayout } from "@/hooks/useKeyboardOffset";

interface MobileGroupFormLayoutProps {
  header: ReactNode;
  children: ReactNode;
}

export function MobileGroupFormLayout({
  header,
  children,
}: MobileGroupFormLayoutProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [formInputFocused, setFormInputFocused] = useState(false);
  const { keyboardOffset } = useKeyboardLayout();
  const scrollPaddingBottom = formInputFocused ? keyboardOffset : 0;

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && scrollEl.contains(target)) {
        setFormInputFocused(true);
      }
    };

    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget;
      if (next instanceof HTMLElement && scrollEl.contains(next)) return;
      setFormInputFocused(false);
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex touch-none flex-col overscroll-none bg-background">
      <div className="shrink-0">{header}</div>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        style={{
          paddingBottom: scrollPaddingBottom,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {children}
      </div>
    </div>
  );
}
