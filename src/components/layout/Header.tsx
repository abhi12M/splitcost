"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { BrandIcon } from "@/components/brand/BrandIcon";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useMyGroupsCount } from "@/hooks/useMyGroupsCount";
import { cn } from "@/lib/utils";

const SCROLL_IDLE_MS = 250;

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
  const deviceType = useDeviceType();
  const isMobile = deviceType === "mobile";
  const [headerVisible, setHeaderVisible] = useState(true);
  const scrollIdleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => {
      setHeaderVisible(false);

      if (scrollIdleRef.current) {
        clearTimeout(scrollIdleRef.current);
      }

      scrollIdleRef.current = setTimeout(() => {
        setHeaderVisible(true);
      }, SCROLL_IDLE_MS);
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollIdleRef.current) {
        clearTimeout(scrollIdleRef.current);
      }
    };
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-x-0 top-0 z-50 px-3 pt-2 sm:pt-3",
        "transition-all duration-300 ease-out motion-reduce:transition-none",
        headerVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3 pointer-events-none"
      )}
      aria-hidden={!headerVisible}
    >
      <header className="w-full rounded-xl border border-border/60 bg-card shadow-card">
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-3",
            isMobile ? "justify-center" : "justify-between sm:h-16 sm:py-0"
          )}
        >
          <Link
            href="/"
            className={cn(
              "flex min-w-0 items-center gap-2 sm:gap-3",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg",
              isMobile && "justify-center"
            )}
          >
            <BrandIcon className="h-8 w-auto sm:h-9" height={36} />
          </Link>

          <nav
            className="hidden shrink-0 items-center gap-0.5 sm:flex sm:gap-1"
            aria-label="Primary"
          >
            <Button
              asChild
              size="sm"
              variant="default"
              className="relative h-8 gap-1.5 px-3 text-xs sm:h-9 sm:text-sm"
            >
              <Link href="/groups">
                <Users className="h-4 w-4" />
                My groups
                <MyGroupsCountBadge count={groupsCount} />
              </Link>
            </Button>
            <ThemeToggle />
            <Link
              href="/#faq"
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
    </div>
  );
}
