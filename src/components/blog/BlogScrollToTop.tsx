"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

export function BlogScrollToTop() {
  const [visible, setVisible] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let animationFrame = 0;

    const updateVisibility = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const revealAfter = Math.max(480, window.innerHeight * 0.6);
        setVisible(window.scrollY > revealAfter);
      });
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          type="button"
          aria-label="Scroll to top"
          title="Scroll to top"
          onClick={scrollToTop}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.72, y: 18, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 12 }}
          transition={{ type: "spring", stiffness: 360, damping: 24 }}
          whileHover={reduceMotion ? undefined : { y: -3, scale: 1.05 }}
          whileTap={reduceMotion ? undefined : { scale: 0.92 }}
          className="group fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] right-4 z-50 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-primary/20 bg-primary text-primary-foreground shadow-[0_10px_30px_hsl(var(--primary)/0.3)] outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:bottom-6 sm:right-6"
        >
          <span className="absolute inset-1 rounded-full border border-white/20" aria-hidden="true" />
          <ArrowUp
            className="relative h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5"
            strokeWidth={2.4}
            aria-hidden="true"
          />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
