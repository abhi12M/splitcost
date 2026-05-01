// components/ui/input.tsx
import * as React from "react";
import { cn } from "@/lib/utils";
import { formatAmount, formatInputDisplayValue } from "./formatters";

interface NumericProps {
  minValue?: number;
  maxValue?: number;
  precision?: number;
  showHelper?: boolean;
  currency?: string;
  postfix?: string;
  unstyled?: boolean;
  formatOnBlur?: "currency" | "number";
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
      formatOnBlur,
      onChange,
      onBlur,
      onFocus,
      onKeyDown,
      inputMode = "text",
      value,
      ...props
    },
    ref,
  ) => {
    const isNumeric = inputMode === "decimal" && minValue !== undefined;
    const [isFocused, setIsFocused] = React.useState(false);
    const [draftValue, setDraftValue] = React.useState<string | null>(null);

    const regex = React.useMemo(
      () => new RegExp(`^\\d*\\.?\\d{0,${precision}}$`),
      [precision],
    );

    const rawValue =
      typeof value === "number"
        ? value.toString()
        : typeof value === "string"
          ? value
          : "";

    const displayValue =
      isFocused && draftValue !== null
        ? draftValue
        : formatOnBlur && !isFocused
        ? formatInputDisplayValue(rawValue, formatOnBlur, currency)
        : rawValue;

    const helperText =
      isNumeric && showHelper
        ? `Enter a value between ${formatAmount(minValue, currency)}${
            maxValue !== undefined ? ` and ${formatAmount(maxValue, currency)}` : ""
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
            value={displayValue}
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
            onFocus={(e) => {
              setIsFocused(true);
              setDraftValue(rawValue);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              setDraftValue(null);
              onBlur?.(e);
            }}
            onChange={(e) => {
              if (!isNumeric) return onChange?.(e);

              const nextValue = e.target.value;
              if (nextValue === "") {
                setDraftValue(nextValue);
                return onChange?.(e);
              }
              if (!regex.test(nextValue)) return;

              const num = Number(nextValue);
              if (Number.isNaN(num)) return;

              if (
                (minValue !== undefined && num < minValue) ||
                (maxValue !== undefined && num > maxValue)
              ) {
                return;
              }

              setDraftValue(nextValue);
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
