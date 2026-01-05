// components/ui/input.tsx
import * as React from "react";
import { cn } from "@/lib/utils";
import { formatAmount } from "./formatters";

interface NumericProps {
  minValue?: number;
  maxValue?: number;
  precision?: number;
  showHelper?: boolean;
  currency?: string;
  postfix?: string;
  unstyled?: boolean; // 👈 NEW
}

type InputProps = React.ComponentProps<"input"> & NumericProps;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      minValue,
      maxValue,
      precision = 2,
      showHelper = true,
      currency = "INR",
      postfix,
      unstyled = false,
      onChange,
      onKeyDown,
      inputMode = "text",
      ...props
    },
    ref,
  ) => {
    const isNumeric = inputMode === "decimal" && minValue !== undefined;

    const regex = React.useMemo(
      () => new RegExp(`^\\d*\\.?\\d{0,${precision}}$`),
      [precision],
    );

    const helperText =
      isNumeric && showHelper
        ? `Enter a value between ${formatAmount(minValue, currency)}${maxValue !== undefined
          ? ` and ${formatAmount(maxValue, currency)}`
          : ""
        }`
        : null;

    return (
      <div className="space-y-1 w-full">
        <div className="relative w-full h-full">
          <input
            inputMode={inputMode}
            ref={ref}
            type={type}
            {...props}
            className={cn(
              "w-full h-full text-base bg-background",
              "placeholder:text-muted-foreground",
              postfix ? "pr-8" : "pr-4",
              unstyled
                ? "border-none rounded-none focus:outline-none focus:ring-0 px-4"
                : "h-10 rounded-md border border-input px-3 py-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
              "aria-[invalid=true]:border-destructive",
              "aria-[invalid=true]:focus:border-transparent",
              className,
            )}
            onKeyDown={(e) => {
              if (isNumeric && ["-", "+", "e", "E"].includes(e.key)) {
                e.preventDefault();
              }
              onKeyDown?.(e);
            }}
            onChange={(e) => {
              if (!isNumeric) return onChange?.(e);

              const value = e.target.value;
              if (value === "") return onChange?.(e);
              if (!regex.test(value)) return;

              const num = Number(value);
              if (Number.isNaN(num)) return;

              if (
                (minValue !== undefined && num < minValue) ||
                (maxValue !== undefined && num > maxValue)
              ) {
                return;
              }

              onChange?.(e);
            }}
          />

          {postfix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {postfix}
            </span>
          )}
        </div>

        {helperText && (
          <p className="text-xs text-muted-foreground">{helperText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
export { Input };
