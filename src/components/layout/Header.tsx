"use client";

import Link from "next/link";
import { Users } from "lucide-react";

import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { BrandIcon } from "@/components/brand/BrandIcon";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useMyGroupsCount } from "@/hooks/useMyGroupsCount";
import { cn } from "@/lib/utils";

function MyGroupsCountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-foreground/20 px-1.5 text-[11px] font-bold leading-none tabular-nums",
        className
      )}
      aria-label={`${count} groups`}
    >
      {count}
    </span>
  );
}

export function Header() {
  const groupsCount = useMyGroupsCount();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/90 backdrop-blur-lg supports-[backdrop-filter]:bg-background/75">
      <div className="container flex h-14 sm:h-16 items-center justify-between gap-3">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 sm:gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl"
        >
          <BrandIcon className="w-9 h-9" size={36} />
          <BrandWordmark className="text-lg sm:text-xl truncate" />
        </Link>

        <nav className="flex shrink-0 items-center gap-0.5 sm:gap-1" aria-label="Primary">
          <Button
            asChild
            size="sm"
            variant="default"
            className="relative hidden h-8 gap-1.5 px-3 text-xs sm:inline-flex sm:h-9 sm:text-sm"
          >
            <Link href="/groups">
              <Users className="h-4 w-4" />
              My groups
              <MyGroupsCountBadge count={groupsCount} />
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="default"
            className="relative h-8 px-2.5 text-xs sm:hidden"
          >
            <Link
              href="/groups"
              aria-label={
                groupsCount > 0 ? `My groups, ${groupsCount} saved` : "My groups"
              }
            >
              <Users className="h-4 w-4" />
              <MyGroupsCountBadge
                count={groupsCount}
                className="absolute -right-1 -top-1 h-4 min-w-4 bg-background px-1 text-[10px] text-primary"
              />
            </Link>
          </Button>
          <ThemeToggle />
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
