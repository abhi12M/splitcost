// components/ui/info-tooltip.tsx
"use client";

import * as React from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  children: React.ReactNode;
  className?: string;
}

export function InfoTooltip({ children, className }: InfoTooltipProps) {
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span
            role="button"
            tabIndex={0}
            className={cn(
              "ml-1 inline-flex items-center text-muted-foreground hover:text-foreground focus:outline-none",
              className
            )}
            aria-label="More info"
          >
            <Info className="h-3.5 w-3.5" />
          </span>
        </Tooltip.Trigger>

        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            align="center"
            className="z-50 max-w-xs rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md whitespace-pre-line"
          >
            {children}
            <Tooltip.Arrow className="fill-border" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

