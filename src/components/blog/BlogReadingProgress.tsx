"use client";

import { useEffect, useState } from "react";

export function BlogReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const article = document.querySelector<HTMLElement>("[data-blog-article]");
      if (!article) return;

      const articleTop = article.offsetTop;
      const readableHeight = Math.max(article.offsetHeight - window.innerHeight, 1);
      const nextProgress = ((window.scrollY - articleTop) / readableHeight) * 100;
      setProgress(Math.min(100, Math.max(0, nextProgress)));
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-1 bg-transparent" aria-hidden="true">
      <div
        className="h-full bg-primary shadow-[0_1px_8px_hsl(var(--primary)/0.65)] transition-[width] duration-150"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
