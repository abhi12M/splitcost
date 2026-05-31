"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useKeyboardLayout } from "@/hooks/useKeyboardOffset";
import { MD_BREAKPOINT_PX } from "@/hooks/useDeviceType";

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

  // Only lock document scroll on mobile viewports. These forms are still mounted
  // (but CSS-hidden) on desktop via `hidden md:block` / `block md:hidden` splits,
  // so we must not set overflow:hidden on the body at tablet/desktop widths.
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${MD_BREAKPOINT_PX}px)`);
    const html = document.documentElement;
    const body = document.body;
    const saved = { html: "", body: "", locked: false };

    const lock = () => {
      if (saved.locked) return;
      saved.html = html.style.overflow;
      saved.body = body.style.overflow;
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
      saved.locked = true;
    };

    const unlock = () => {
      if (!saved.locked) return;
      html.style.overflow = saved.html;
      body.style.overflow = saved.body;
      saved.locked = false;
    };

    const sync = () => {
      if (mq.matches) unlock();
      else lock();
    };

    sync();
    mq.addEventListener("change", sync);
    return () => {
      mq.removeEventListener("change", sync);
      unlock();
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
