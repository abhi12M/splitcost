"use client";

import { ChevronDown, Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { localeList } from "@/i18n/config";
import type { AppLocale } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type LanguageSwitcherProps = {
  className?: string;
  /** Compact icon-only trigger for mobile header areas */
  variant?: "default" | "icon" | "footer";
};

export function LanguageSwitcher({
  className,
  variant = "default",
}: LanguageSwitcherProps) {
  const t = useTranslations("languageSwitcher");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const current = localeList.find((entry) => entry.code === locale);

  const onSelect = (nextLocale: string) => {
    if (nextLocale === locale) return;

    startTransition(() => {
      router.replace(pathname, {
        locale: nextLocale as AppLocale,
        scroll: false,
      });
    });
  };

  const isFooter = variant === "footer";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={variant === "icon" ? "icon" : "sm"}
          className={cn(
            "gap-1.5 text-muted-foreground hover:text-foreground",
            isFooter && "h-auto px-0 py-0 text-xs font-normal hover:bg-transparent",
            isPending && "opacity-70",
            className
          )}
          aria-label={t("select")}
          title={current ? t("current", { language: current.nativeLabel }) : t("label")}
        >
          {isFooter ? (
            <>
              <span>{current?.nativeLabel ?? t("label")}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
            </>
          ) : (
            <>
              <Languages className="h-4 w-4 shrink-0" aria-hidden />
              {variant === "default" ? (
                <span className="hidden text-xs font-medium sm:inline">
                  {current?.nativeLabel ?? t("label")}
                </span>
              ) : null}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10.5rem]">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t("label")}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={locale} onValueChange={onSelect}>
          {localeList.map((entry) => (
            <DropdownMenuRadioItem
              key={entry.code}
              value={entry.code}
              className="cursor-pointer gap-2"
            >
              <span className="font-medium">{entry.nativeLabel}</span>
              {entry.nativeLabel !== entry.label ? (
                <span className="text-xs text-muted-foreground">{entry.label}</span>
              ) : null}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
