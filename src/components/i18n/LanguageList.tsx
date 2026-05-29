"use client";

import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition, type MouseEvent } from "react";

import { localeList } from "@/i18n/config";
import type { AppLocale } from "@/i18n/routing";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type LanguageListProps = {
  variant?: "footer" | "menu";
  className?: string;
  onSelect?: () => void;
};

export function LanguageList({
  variant = "footer",
  className,
  onSelect,
}: LanguageListProps) {
  const t = useTranslations("languageSwitcher");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleMenuSelect = (event: MouseEvent<HTMLAnchorElement>, nextLocale: AppLocale) => {
    event.preventDefault();

    if (nextLocale === locale) {
      onSelect?.();
      return;
    }

    onSelect?.();

    window.setTimeout(() => {
      startTransition(() => {
        router.replace(pathname, {
          locale: nextLocale,
          scroll: false,
        });
      });
    }, 0);
  };

  if (variant === "menu") {
    return (
      <nav
        aria-label={t("label")}
        className={cn(isPending && "opacity-70", className)}
      >
        <p className="px-4 pb-0.5 pt-3 text-[13px] font-medium text-muted-foreground">
          {t("label")}
        </p>
        <ul>
          {localeList.map((entry) => {
            const isActive = entry.code === locale;

            return (
              <li key={entry.code}>
                <Link
                  href={pathname}
                  locale={entry.code}
                  scroll={false}
                  onClick={(event) => handleMenuSelect(event, entry.code)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-[15px] font-medium transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted/40"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="flex-1">{entry.nativeLabel}</span>
                  {entry.nativeLabel !== entry.label ? (
                    <span className="text-xs text-muted-foreground">{entry.label}</span>
                  ) : null}
                  {isActive ? (
                    <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label={t("label")} className={className}>
      <p className="font-semibold text-foreground mb-4">{t("label")}</p>
      <ul className="space-y-2.5">
        {localeList.map((entry) => {
          const isActive = entry.code === locale;

          return (
            <li key={entry.code}>
              <Link
                href={pathname}
                locale={entry.code}
                scroll={false}
                className={cn(
                  "text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg",
                  isActive
                    ? "font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {entry.nativeLabel}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
