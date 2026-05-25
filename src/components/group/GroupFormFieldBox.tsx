"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface GroupFormFieldBoxProps {
  label?: string;
  icon: LucideIcon;
  children: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
  invalid?: boolean;
  htmlFor?: string;
}

export function GroupFormFieldBox({
  label,
  icon: Icon,
  children,
  trailing,
  className,
  invalid,
  htmlFor,
}: GroupFormFieldBoxProps) {
  return (
    <div className={className}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="mb-2 block text-sm font-semibold leading-none text-foreground"
        >
          {label}
        </label>
      ) : null}
      <div
        className={cn(
          "flex h-12 w-full items-center border bg-card",
          invalid ? "border-destructive" : "border-border"
        )}
      >
        <div className="flex h-full shrink-0 items-center px-3">
          <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="h-6 w-px shrink-0 bg-border" aria-hidden />
        <div className="flex min-w-0 flex-1 items-center overflow-visible py-2 pl-3 pr-3">
          {children}
        </div>
        {trailing ? (
          <div className="flex shrink-0 items-center pr-3">{trailing}</div>
        ) : null}
      </div>
    </div>
  );
}
