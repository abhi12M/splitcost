"use client";

import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileImage,
  Globe,
  HandCoins,
  Link2,
  PieChart,
  Scale,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserRoundX,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

import { Button } from "@/components/ui/button";
import { brandFeatureAccent, brandStyles, landingSection } from "@/lib/brand-styles";
import { cn } from "@/lib/utils";

type FeatureAccent = "brand" | "emerald" | "orange";

type FeatureKey =
  | "noAccount"
  | "flexibleSplit"
  | "multiplePayers"
  | "autoBalances"
  | "shareableGroups"
  | "multiCurrency"
  | "receipts"
  | "downloadReports";

type FeatureConfig = {
  key: FeatureKey;
  icon: LucideIcon;
  accent: FeatureAccent;
};

const accentStyles: Record<
  FeatureAccent,
  { iconBg: string; iconColor: string }
> = {
  brand: brandFeatureAccent,
  emerald: {
    iconBg: "bg-emerald-100 dark:bg-emerald-950/50",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  orange: {
    iconBg: "bg-orange-100 dark:bg-orange-950/50",
    iconColor: "text-orange-600 dark:text-orange-400",
  },
};

const featureConfigs: FeatureConfig[] = [
  { key: "noAccount", icon: UserRoundX, accent: "brand" },
  { key: "flexibleSplit", icon: PieChart, accent: "emerald" },
  { key: "multiplePayers", icon: HandCoins, accent: "orange" },
  { key: "autoBalances", icon: Scale, accent: "brand" },
  { key: "shareableGroups", icon: Link2, accent: "brand" },
  { key: "multiCurrency", icon: Globe, accent: "emerald" },
  { key: "receipts", icon: FileImage, accent: "orange" },
  { key: "downloadReports", icon: Download, accent: "brand" },
];

function FeatureCard({
  title,
  description,
  icon: Icon,
  accent,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  accent: FeatureAccent;
}) {
  const styles = accentStyles[accent];

  return (
    <article className="flex gap-4 rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-shadow hover:shadow-card dark:border-border/80">
      <div
        className={cn(
          "flex h-16 w-16 shrink-0 items-center justify-center rounded-xl",
          styles.iconBg
        )}
      >
        <Icon className={cn("h-8 w-8", styles.iconColor)} strokeWidth={2} aria-hidden />
      </div>
      <div className="min-w-0">
        <h3 className="mb-1 text-[15px] font-bold text-foreground">{title}</h3>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </article>
  );
}

function FeaturesCta() {
  const t = useTranslations("landing.features");

  const trustPoints = [
    { key: "freeToStart" as const, icon: CheckCircle2 },
    { key: "noCreditCard" as const, icon: ShieldCheck },
    { key: "anyDevice" as const, icon: Smartphone },
  ];

  return (
    <div className={cn("mt-5 p-5 sm:p-8 lg:p-5", brandStyles.ctaPanel)}>
      <div className="grid min-w-0 items-center gap-5 sm:gap-6 lg:grid-cols-[1.1fr_1fr_1fr] lg:gap-8">
        <div className="flex min-w-0 flex-col items-center gap-3 text-center md:flex-row md:items-center md:gap-4 md:text-left">
          <span
            className={cn(
              "hidden h-16 w-16 shrink-0 md:flex lg:h-20 lg:w-20",
              brandStyles.ctaIconCircle
            )}
          >
            <Wallet className="h-9 w-9 lg:h-12 lg:w-12" strokeWidth={2} aria-hidden />
          </span>
          <div className="min-w-0 max-w-full">
            <p className="text-balance text-lg font-bold leading-tight text-foreground sm:text-xl">
              {t("cta.title")}{" "}
              <span className={brandStyles.headingAccent}>{t("cta.titleHighlight")}</span>
            </p>
            <p className="mt-1.5 text-pretty text-sm text-muted-foreground">
              {t("cta.description")}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-col items-stretch gap-3 text-center sm:items-center">
          <Button
            asChild
            size="lg"
            className="h-12 w-full rounded-xl px-5 text-base font-semibold sm:max-w-xs sm:self-center sm:px-6"
          >
            <Link href="/create-group">
              {t("cta.button")}
              <ArrowRight className="ml-1 h-5 w-5 shrink-0" />
            </Link>
          </Button>
          <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:gap-x-4">
            {trustPoints.map(({ key, icon: Icon }) => (
              <li
                key={key}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground sm:text-xs"
              >
                <Icon className={cn("h-3.5 w-3.5 shrink-0", brandStyles.iconSm)} aria-hidden />
                {t(`trust.${key}`)}
              </li>
            ))}
          </ul>
        </div>

        <div className="hidden justify-center lg:flex lg:justify-end">
          <Image
            src="/landing/features-cta-illustration.png"
            alt={t("cta.imageAlt")}
            width={520}
            height={300}
            className="h-auto w-full max-w-[420px] object-contain"
            priority={false}
          />
        </div>
      </div>
    </div>
  );
}

export function FeaturesSection() {
  const t = useTranslations("landing.features");

  return (
    <section
      className={cn(landingSection.default, landingSection.padding)}
      id="features"
      aria-labelledby="features"
    >
      <div className="container">
        <header className="mx-auto mb-10 max-w-3xl text-center sm:mb-12 md:mb-14">
          <p className={cn("mb-5", brandStyles.sectionBadge)}>
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {t("badge")}
          </p>
          <h2
            className="text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-[2.75rem] md:leading-tight"
          >
            {t("title")}{" "}
            <span className={brandStyles.headingAccent}>{t("titleHighlight")}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
            {t("description")}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4 xl:gap-6">
          {featureConfigs.map((feature) => (
            <FeatureCard
              key={feature.key}
              title={t(`items.${feature.key}.title`)}
              description={t(`items.${feature.key}.description`)}
              icon={feature.icon}
              accent={feature.accent}
            />
          ))}
        </div>

        <FeaturesCta />
      </div>
    </section>
  );
}
