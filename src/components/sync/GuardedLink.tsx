"use client";

import type { ComponentProps } from "react";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type GuardedLinkProps = ComponentProps<typeof Link> & {
  /** False dims the link and, instead of navigating, calls `onBlocked`. */
  allowed: boolean;
  onBlocked: () => void;
};

/**
 * A link to a screen that changes data (add / edit). When the change isn't
 * possible right now it stays tappable, so it can say why, rather than
 * silently doing nothing.
 */
export function GuardedLink({ allowed, onBlocked, className, onClick, ...props }: GuardedLinkProps) {
  return (
    <Link
      {...props}
      aria-disabled={allowed ? undefined : true}
      className={cn(className, !allowed && "opacity-50")}
      onClick={(event) => {
        if (!allowed) {
          event.preventDefault();
          onBlocked();
          return;
        }
        onClick?.(event);
      }}
    />
  );
}
