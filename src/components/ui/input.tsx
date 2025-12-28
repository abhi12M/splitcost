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
  postfix?: string; // new prop
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
      onChange,
      onKeyDown,
      ...props
    },
    ref,
  ) => {
    const isNumeric = type === "number" && minValue !== undefined;

    const regex = React.useMemo(
      () => new RegExp(`^\\d*\\.?\\d{0,${precision}}$`),
      [precision],
    );

    const helperText =
      isNumeric && showHelper
        ? `Enter a value between ${formatAmount(minValue, currency)}${
            maxValue !== undefined ? ` and ${formatAmount(maxValue, currency)}` : ""
          }`
        : null;

    return (
      <div className="space-y-1">
        <div className="relative w-full">
          <input
            ref={ref}
            type={type}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base",
              postfix ? "pr-7" : "pr-3", // add padding if postfix exists
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
              "aria-[invalid=true]:border-destructive",
              "focus-visible:aria-[invalid=true]:border-input",
              className,
            )}
            {...props}
            onKeyDown={(e) => {
              if (isNumeric && ["-", "+", "e", "E"].includes(e.key)) {
                e.preventDefault();
              }
              onKeyDown?.(e);
            }}
            onChange={(e) => {
              if (!isNumeric) {
                onChange?.(e);
                return;
              }

              const value = e.target.value;

              if (value === "") {
                onChange?.(e);
                return;
              }

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
