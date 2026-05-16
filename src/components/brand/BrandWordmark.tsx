import { cn } from "@/lib/utils";

type BrandWordmarkProps = {
  className?: string;
  /** Larger hero-style wordmark */
  size?: "default" | "lg";
};

/**
 * Brand wordmark: "Split" (navy) + "Cost" (electric blue) per SplitCost identity.
 */
export function BrandWordmark({ className, size = "default" }: BrandWordmarkProps) {
  return (
    <span
      className={cn(
        "font-bold tracking-tight",
        size === "lg" ? "text-2xl md:text-3xl" : "text-xl",
        className
      )}
    >
      <span className="text-foreground">Split</span>
      <span className="text-primary">Cost</span>
    </span>
  );
}
