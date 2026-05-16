"use client";
import Link from "next/link";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { BrandIcon } from "@/components/icons/CategoryIcons";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/90 backdrop-blur-lg supports-[backdrop-filter]:bg-background/75">
      <div className="container flex h-14 sm:h-16 items-center justify-between gap-3">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 sm:gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl"
        >
          <span className="rounded-lg sm:rounded-xl shadow-md shadow-primary/15 ring-1 ring-border/80 overflow-hidden transition-transform duration-200 hover:-rotate-3 shrink-0">
            <BrandIcon className="w-9 h-9" size={36} />
          </span>
          <BrandWordmark className="text-lg sm:text-xl truncate" />
        </Link>

        <nav className="flex shrink-0 items-center gap-0.5 sm:gap-1" aria-label="Primary">
          <Link
            href="/faq"
            className="px-2.5 py-2 sm:px-3 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            FAQ
          </Link>
          <Link
            href="/contact"
            className="px-2.5 py-2 sm:px-3 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Contact
          </Link>
        </nav>
      </div>
    </header>
  );
}
