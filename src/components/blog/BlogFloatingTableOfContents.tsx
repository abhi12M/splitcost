"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ListTree } from "lucide-react";
import { useState } from "react";

import { BlogTableOfContents } from "@/components/blog/BlogTableOfContents";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { BlogTocItem } from "@/lib/blog/toc";

export function BlogFloatingTableOfContents({ headings }: { headings: BlogTocItem[] }) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  if (!headings.length) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <motion.button
          type="button"
          aria-label="Open table of contents"
          title="Table of contents"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.78, x: -14 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 24, delay: 0.15 }}
          whileHover={reduceMotion ? undefined : { scale: 1.05, y: -2 }}
          whileTap={reduceMotion ? undefined : { scale: 0.93 }}
          className="group fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] left-4 z-40 flex h-12 items-center gap-2 rounded-full border border-primary/25 bg-card/95 px-3 text-primary shadow-[0_10px_30px_hsl(var(--foreground)/0.14)] backdrop-blur-md outline-none transition-colors hover:border-primary/45 hover:bg-card focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:bottom-6 sm:left-6 lg:hidden"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/15">
            <ListTree className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
          </span>
          <span className="text-xs font-semibold">Contents</span>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
            {headings.length}
          </span>
        </motion.button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="flex h-full w-[min(22rem,calc(100vw-2rem))] max-w-none flex-col gap-0 p-0 lg:hidden"
      >
        <SheetHeader className="shrink-0 border-b border-border px-5 py-4 pr-12 text-left">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ListTree className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <SheetTitle>On this page</SheetTitle>
              <SheetDescription>{headings.length} sections in this article</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <BlogTableOfContents headings={headings} onClose={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
