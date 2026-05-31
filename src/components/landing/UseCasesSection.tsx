"use client";

import {
  ArrowRight,
  Heart,
  Home,
  Luggage,
  Network,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

import { Button } from "@/components/ui/button";
import { brandStyles, brandUseCaseAccent, landingSection } from "@/lib/brand-styles";
import { cn } from "@/lib/utils";
import { getUseCasePath } from "@/lib/use-cases";

type UseCaseAccent = "brand" | "emerald" | "rose" | "cyan";

type UseCaseKey = "travel" | "roommates" | "couples" | "friends" | "teams";

type UseCaseConfig = {
  key: UseCaseKey;
  image: string;
  icon: LucideIcon;
  accent: UseCaseAccent;
  tagKeys: readonly string[];
};

const accentStyles: Record<
  UseCaseAccent,
  {
    iconBg: string;
    tagBg: string;
    tagText: string;
    sceneBg: string;
  }
> = {
  brand: brandUseCaseAccent,
  emerald: {
    iconBg: "bg-emerald-600",
    tagBg: "bg-emerald-100 dark:bg-emerald-950/50",
    tagText: "text-emerald-700 dark:text-emerald-400",
    sceneBg: "from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/30 dark:to-teal-950/20",
  },
  rose: {
    iconBg: "bg-rose-500",
    tagBg: "bg-rose-100 dark:bg-rose-950/50",
    tagText: "text-rose-700 dark:text-rose-400",
    sceneBg: "from-rose-50/80 to-pink-50/80 dark:from-rose-950/30 dark:to-pink-950/20",
  },
  cyan: {
    iconBg: "bg-cyan-600",
    tagBg: "bg-cyan-100 dark:bg-cyan-950/50",
    tagText: "text-cyan-700 dark:text-cyan-300",
    sceneBg: "from-cyan-50/80 to-slate-50/80 dark:from-cyan-950/30 dark:to-slate-950/20",
  },
};

const useCaseConfigs: UseCaseConfig[] = [
  {
    key: "travel",
    image: "/landing/use-cases/use-case-travel.png",
    icon: Luggage,
    accent: "brand",
    tagKeys: ["trips", "bookings", "transport", "food", "travelExpenses"],
  },
  {
    key: "roommates",
    image: "/landing/use-cases/use-case-roommates.png",
    icon: Home,
    accent: "emerald",
    tagKeys: ["rent", "groceries", "utilities", "household"],
  },
  {
    key: "couples",
    image: "/landing/use-cases/use-case-couples.png",
    icon: Heart,
    accent: "rose",
    tagKeys: ["daily", "subscriptions", "dinners", "travelPlans"],
  },
  {
    key: "friends",
    image: "/landing/use-cases/use-case-friends.png",
    icon: Users,
    accent: "brand",
    tagKeys: ["dinners", "parties", "concerts", "eventCosts"],
  },
  {
    key: "teams",
    image: "/landing/use-cases/use-case-teams.png",
    icon: Network,
    accent: "cyan",
    tagKeys: ["reimbursements", "groupExpenses", "teams", "communities"],
  },
];

function UseCaseCard({
  config,
  title,
  description,
  imageAlt,
  tags,
  learnMoreLabel,
}: {
  config: UseCaseConfig;
  title: string;
  description: string;
  imageAlt: string;
  tags: string[];
  learnMoreLabel: string;
}) {
  const styles = accentStyles[config.accent];
  const Icon = config.icon;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md dark:border-border/80">
      <Link
        href={getUseCasePath(config.key)}
        className="group flex flex-1 flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-2xl"
      >
        <div className="relative px-3 pt-3">
          <div
            className={cn(
              "relative flex h-36 items-end justify-center overflow-hidden rounded-xl bg-gradient-to-b sm:h-40",
              styles.sceneBg
            )}
          >
            <Image
              src={config.image}
              alt={imageAlt}
              width={280}
              height={180}
              className="h-[88%] w-auto max-w-full object-contain object-bottom"
            />
          </div>
          <span
            className={cn(
              "absolute bottom-0 left-1/2 z-10 flex h-11 w-11 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full text-white shadow-md ring-4 ring-card",
              styles.iconBg
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </span>
        </div>

        <div className="flex flex-1 flex-col px-4 pb-5 pt-9">
          <h3 className="mb-2 text-center text-base font-bold text-foreground">{title}</h3>
          <p className="mb-4 flex-1 text-center text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
            {description}
          </p>
          <div className="mb-4 flex flex-wrap justify-center gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold sm:text-[11px]",
                  styles.tagBg,
                  styles.tagText
                )}
              >
                {tag}
              </span>
            ))}
          </div>
          <span className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-primary group-hover:underline">
            {learnMoreLabel}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        </div>
      </Link>
    </article>
  );
}

function UseCasesCta() {
  const t = useTranslations("landing.useCases");

  return (
    <div className={cn("mt-5 p-6 sm:p-8", brandStyles.ctaPanel)}>
      <div className="grid items-center gap-6 md:grid-cols-[minmax(11rem,1fr)_1.15fr_minmax(11rem,1fr)] md:gap-4 lg:gap-6">
        <div className="hidden items-end justify-center md:flex md:justify-start">
          <Image
            src="/landing/use-cases/use-cases-cta-wallet.png"
            alt=""
            width={320}
            height={280}
            className="h-auto w-full max-w-[220px] object-contain object-bottom md:max-w-[240px] lg:max-w-[280px]"
            aria-hidden
          />
        </div>

        <div className="space-y-4 text-center">
          <h3 className="text-balance text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            {t("cta.title")}
          </h3>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
            {t("cta.description")}
          </p>
          <Button asChild size="lg" className="h-11 rounded-xl px-6 text-sm font-semibold sm:h-12 sm:text-base">
            <Link href="/create-group">
              {t("cta.button")}
              <ArrowRight className="ml-1 h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
          </Button>
        </div>

        <div className="hidden items-end justify-center md:flex md:justify-end">
          <Image
            src="/landing/use-cases/use-cases-cta-phone.png"
            alt={t("cta.phoneImageAlt")}
            width={360}
            height={320}
            className="h-auto w-full max-w-[240px] object-contain object-bottom md:max-w-[260px] lg:max-w-[300px]"
          />
        </div>
      </div>
    </div>
  );
}

export function UseCasesSection() {
  const t = useTranslations("landing.useCases");

  return (
    <section
      className={cn(landingSection.alternate, landingSection.padding)}
      aria-labelledby="use-cases" id="use-cases"
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
            <span className={brandStyles.headingAccent}>{t("titleHighlight1")}</span>{" "}
            {t("titleMiddle")}{" "}
            <span className={brandStyles.headingAccent}>{t("titleHighlight2")}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
            {t("description")}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-5 xl:gap-4">
          {useCaseConfigs.map((config) => (
            <UseCaseCard
              key={config.key}
              config={config}
              title={t(`items.${config.key}.title`)}
              description={t(`items.${config.key}.description`)}
              imageAlt={t(`items.${config.key}.imageAlt`)}
              learnMoreLabel={t("learnMore")}
              tags={config.tagKeys.map((tagKey) =>
                t(`items.${config.key}.tags.${tagKey}`)
              )}
            />
          ))}
        </div>

        <div className="mt-6 text-center">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/use-cases">
              {t("viewAll")}
              <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>

        <UseCasesCta />
      </div>
    </section>
  );
}
