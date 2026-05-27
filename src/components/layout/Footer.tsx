"use client";

import { useTranslations } from "next-intl";

import { BrandIcon } from "@/components/brand/BrandIcon";
import { APP_NAME } from "@/lib/constants";
import { Link } from "@/i18n/navigation";

export function Footer() {
  const t = useTranslations("layout");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-muted/30 pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] sm:pb-0">
      <div className="container pt-10 pb-8 sm:pt-16 sm:pb-12 md:pt-20">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <Link
              href="/"
              className="flex items-center gap-3 mb-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl"
            >
              <BrandIcon className="h-10 w-auto" height={40} />
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm">{t("footerTagline")}</p>
          </div>

          <nav aria-label={t("product")}>
            <p className="font-semibold text-foreground mb-4">{t("product")}</p>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/#how-it-works"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
                >
                  {t("howItWorks")}
                </Link>
              </li>
              <li>
                <Link
                  href="/#features"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
                >
                  {t("features")}
                </Link>
              </li>
              <li>
                <Link
                  href="/#use-cases"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
                >
                  {t("useCases")}
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label={t("support")}>
            <p className="font-semibold text-foreground mb-4">{t("support")}</p>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/#faq"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
                >
                  {t("faq")}
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
                >
                  {t("contact")}
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label={t("legal")}>
            <p className="font-semibold text-foreground mb-4">{t("legal")}</p>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
                >
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
                >
                  {t("terms")}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-8 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            {t("footerRights", { year, appName: APP_NAME })}
          </p>
          <p className="text-xs text-muted-foreground">{t("footerMotto")}</p>
        </div>
      </div>
    </footer>
  );
}
