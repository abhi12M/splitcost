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
        "fixed inset-0 z-50 flex flex-col items-center justify-center gap-1 backdrop-blur-[1px]",
        className
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />

      {message && (
        <p className="text-sm text-muted-foreground text-center">
          {message}
        </p>
      )}
    </div>
  );
};
