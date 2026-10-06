"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { isBlankName } from "@/lib/validations/names";

interface AddMemberInputBoxProps {
  inputRef?: React.Ref<HTMLInputElement>;
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  invalid?: boolean;
}

export function AddMemberInputBox({
  inputRef,
  value,
  onChange,
  onAdd,
  disabled = false,
  placeholder,
  className,
  invalid = false,
}: AddMemberInputBoxProps) {
  const t = useTranslations("group");
  const tCommon = useTranslations("common");
  const resolvedPlaceholder = placeholder ?? t("addPeople");
  const canAdd = !disabled && !isBlankName(value);

  return (
    <div
      className={cn(
        "flex h-12 w-full scroll-mt-3 scroll-mb-3 items-center border bg-card",
        invalid ? "border-destructive" : "border-border",
        className
      )}
    >
        <Input
          ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={resolvedPlaceholder}
        disabled={disabled}
        aria-invalid={invalid}
        className="h-full flex-1 border-0 bg-transparent px-3 text-base shadow-none focus-visible:ring-0"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !isBlankName(value)) {
            e.preventDefault();
            onAdd();
          }
        }}
      />
      <div className="h-6 w-px shrink-0 bg-border" aria-hidden />
      <button
        type="button"
        onClick={onAdd}
        disabled={!canAdd}
        className={cn(
          "flex h-full shrink-0 items-center gap-1.5 px-4 text-primary",
          "disabled:pointer-events-none disabled:opacity-40"
        )}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15">
          <Plus className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden />
        </span>
        <span className="text-sm font-medium">{tCommon("add")}</span>
      </button>
    </div>
  );
}
