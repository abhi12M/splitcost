"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, type ReactNode } from "react";

import { Link } from "@/i18n/navigation";
import { COMPARE_LIST, getComparePath } from "@/lib/compare";
import { APP_NAME } from "@/lib/constants";
import {
  USE_CASE_SLUGS,
  getUseCasePath,
} from "@/lib/use-cases";
import { cn } from "@/lib/utils";

const HEADER_COMPARE_ORDER = ["splitwise", "tricount", "splid"] as const;
const HOVER_CLOSE_MS = 120;

const navTriggerClass =
  "inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors rounded-lg hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:px-3 sm:text-sm";

const navPanelWrapClass =
  "absolute top-full left-0 z-50 pt-1 transition-opacity duration-150 motion-reduce:transition-none";

const navPanelClass =
  "min-w-[12rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg";

const navLinkClass =
  "block rounded-sm px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset";

function HeaderNavDropdown({
  label,
  hubHref,
  hubLabel,
  children,
}: {
  label: string;
  hubHref?: string;
  hubLabel?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setOpen(true);
  };

  const hide = () => {
    closeTimerRef.current = setTimeout(() => setOpen(false), HOVER_CLOSE_MS);
  };

  return (
    <div className="relative" onMouseEnter={show} onMouseLeave={hide}>
      <button
        type="button"
        className={navTriggerClass}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {label}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 opacity-60 transition-transform duration-150 motion-reduce:transition-none",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>

      <div
        className={cn(
          navPanelWrapClass,
          open ? "visible opacity-100" : "invisible pointer-events-none opacity-0"
        )}
      >
        <div className={navPanelClass}>
          {hubHref ? (
            <>
              <Link href={hubHref} className={cn(navLinkClass, "font-semibold")}>
                {hubLabel ?? label}
              </Link>
              <div className="my-1 h-px bg-border" role="presentation" />
            </>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}

function HeaderNavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={navLinkClass}>
      {children}
    </Link>
  );
}

export function HeaderDesktopNav() {
  const t = useTranslations("layout");
  const tUseCases = useTranslations("landing.useCases.items");

  const orderedCompareLinks = HEADER_COMPARE_ORDER.map(
    (slug) => COMPARE_LIST.find((item) => item.slug === slug)!
  );

  return (
    <>
      <HeaderNavDropdown label={t("product")}>
        <HeaderNavLink href="/#how-it-works">{t("howItWorks")}</HeaderNavLink>
        <HeaderNavLink href="/#features">{t("features")}</HeaderNavLink>
      </HeaderNavDropdown>

      <HeaderNavDropdown
        label={t("footerCompareApps")}
        hubHref="/compare"
        hubLabel={t("footerCompareApps")}
      >
        {orderedCompareLinks.map((item) => (
          <HeaderNavLink key={item.slug} href={getComparePath(item.slug)}>
            {t("footerCompareLink", {
              competitor: item.competitorName,
              appName: APP_NAME,
            })}
          </HeaderNavLink>
        ))}
      </HeaderNavDropdown>

      <HeaderNavDropdown
        label={t("footerUseCasesHub")}
        hubHref="/use-cases"
        hubLabel={t("footerUseCasesHub")}
      >
        {USE_CASE_SLUGS.map((slug) => (
          <HeaderNavLink key={slug} href={getUseCasePath(slug)}>
            {tUseCases(`${slug}.title`)}
          </HeaderNavLink>
        ))}
      </HeaderNavDropdown>

      <HeaderNavDropdown label={t("support")}>
        <HeaderNavLink href="/#faq">{t("faq")}</HeaderNavLink>
        <HeaderNavLink href="/contact">{t("contact")}</HeaderNavLink>
        <HeaderNavLink href="/resources">{t("resources")}</HeaderNavLink>
      </HeaderNavDropdown>

      <HeaderNavDropdown label={t("legal")}>
        <HeaderNavLink href="/privacy">{t("privacy")}</HeaderNavLink>
        <HeaderNavLink href="/terms">{t("terms")}</HeaderNavLink>
      </HeaderNavDropdown>
    </>
  );
}
