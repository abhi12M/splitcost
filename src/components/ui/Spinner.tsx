import { cn } from "@/lib/utils";
import React from "react";
import { Loader2 } from "lucide-react";

interface SpinnerProps {
  show: boolean;
  className?: string;
  message?: string; // 👈 new
}

export const Spinner: React.FC<SpinnerProps> = ({
  show,
  className,
  message,
}) => {
  if (!show) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/25 backdrop-blur-[3px]",
        className
      )}
    >
      <div className="flex items-center gap-3 rounded-full bg-background/90 px-4 py-2.5 text-foreground shadow-md ring-1 ring-border/70">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />

        {message && (
          <p className="text-center text-sm font-medium">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};
