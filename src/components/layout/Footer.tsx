"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { BrandIcon } from "@/components/brand/BrandIcon";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { Link } from "@/i18n/navigation";
import { COMPARE_LIST, getComparePath } from "@/lib/compare";
import { APP_NAME } from "@/lib/constants";
import {
  USE_CASE_SLUGS,
  getUseCasePath,
} from "@/lib/use-cases";

const FOOTER_COMPARE_ORDER = ["splitwise", "tricount", "splid"] as const;

const footerLinkClass =
  "text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg";

const footerHubLinkClass =
  "font-semibold text-foreground hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg";

function FooterNavColumn({
  title,
  hubHref,
  hubLabel,
  children,
}: {
  title: string;
  hubHref: string;
  hubLabel: string;
  children: ReactNode;
}) {
  return (
    <nav aria-label={title}>
      <p className="mb-4">
        <Link href={hubHref} className={footerHubLinkClass}>
          {hubLabel}
        </Link>
      </p>
      <ul className="space-y-2.5">{children}</ul>
    </nav>
  );
}

export function Footer() {
  const t = useTranslations("layout");
  const tUseCases = useTranslations("landing.useCases.items");
  const year = new Date().getFullYear();

  const orderedCompareLinks = FOOTER_COMPARE_ORDER.map(
    (slug) => COMPARE_LIST.find((item) => item.slug === slug)!
  );

  return (
    <footer className="border-t border-border bg-muted/30 pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] sm:pb-0">
      <div className="container pt-10 pb-8 sm:pt-16 sm:pb-12 md:pt-20">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          <div className="col-span-2 sm:col-span-3 lg:col-span-4 xl:col-span-2">
            <Link
              href="/"
              className="mb-4 flex items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <BrandIcon className="h-10 w-auto" height={40} />
            </Link>
            <p className="max-w-sm text-sm text-muted-foreground">{t("footerTagline")}</p>
          </div>

          <nav aria-label={t("product")}>
            <p className="mb-4 font-semibold text-foreground">{t("product")}</p>
            <ul className="space-y-2.5">
              <li>
                <Link href="/#how-it-works" className={footerLinkClass}>
                  {t("howItWorks")}
                </Link>
              </li>
              <li>
                <Link href="/#features" className={footerLinkClass}>
                  {t("features")}
                </Link>
              </li>
            </ul>
          </nav>

          <FooterNavColumn
            title={t("footerCompareApps")}
            hubHref="/compare"
            hubLabel={t("footerCompareApps")}
          >
            {orderedCompareLinks.map((item) => (
              <li key={item.slug}>
                <Link href={getComparePath(item.slug)} className={footerLinkClass}>
                  {t("footerCompareLink", {
                    competitor: item.competitorName,
                    appName: APP_NAME,
                  })}
                </Link>
              </li>
            ))}
          </FooterNavColumn>

          <FooterNavColumn
            title={t("footerUseCasesHub")}
            hubHref="/use-cases"
            hubLabel={t("footerUseCasesHub")}
          >
            {USE_CASE_SLUGS.map((slug) => (
              <li key={slug}>
                <Link href={getUseCasePath(slug)} className={footerLinkClass}>
                  {tUseCases(`${slug}.title`)}
                </Link>
              </li>
            ))}
          </FooterNavColumn>

          <nav aria-label={t("support")}>
            <p className="mb-4 font-semibold text-foreground">{t("support")}</p>
            <ul className="space-y-2.5">
              <li>
                <Link href="/#faq" className={footerLinkClass}>
                  {t("faq")}
                </Link>
              </li>
              <li>
                <Link href="/contact" className={footerLinkClass}>
                  {t("contact")}
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label={t("legal")}>
            <p className="mb-4 font-semibold text-foreground">{t("legal")}</p>
            <ul className="space-y-2.5">
              <li>
                <Link href="/privacy" className={footerLinkClass}>
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link href="/terms" className={footerLinkClass}>
                  {t("terms")}
                </Link>
              </li>
            </ul>
          </nav>

        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            {t("footerRights", { year, appName: APP_NAME })}
          </p>
          <LanguageSwitcher variant="footer" />
        </div>
      </div>
    </footer>
  );
}
