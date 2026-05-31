"use client";

import { MessageSquareQuote, Star } from "lucide-react";
import { useTranslations } from "next-intl";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { brandStyles, landingSection } from "@/lib/brand-styles";
import { cn } from "@/lib/utils";

const TESTIMONIAL_KEYS = ["one", "two", "three", "four", "five", "six"] as const;

type TestimonialKey = (typeof TESTIMONIAL_KEYS)[number];

const avatarAccent: Record<TestimonialKey, string> = {
  one: "bg-primary/15 text-primary dark:bg-primary-muted dark:text-primary/90",
  two: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  three: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400",
  four: "bg-primary/15 text-primary dark:bg-primary-muted dark:text-primary/90",
  five: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  six: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400",
};

function TestimonialCard({
  quote,
  name,
  role,
  initials,
  accent,
  ratingAriaLabel,
}: {
  quote: string;
  name: string;
  role: string;
  initials: string;
  accent: string;
  ratingAriaLabel: string;
}) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-border/80 bg-card p-6 shadow-sm dark:border-border/60">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            brandStyles.iconCircle
          )}
          aria-hidden
        >
          <MessageSquareQuote className={cn("h-5 w-5", brandStyles.icon)} strokeWidth={2} />
        </span>
        <div className="flex gap-0.5" aria-label={ratingAriaLabel}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className="h-4 w-4 fill-amber-400 text-amber-400"
              strokeWidth={0}
              aria-hidden
            />
          ))}
        </div>
      </div>
      <blockquote className="flex-1 text-pretty text-sm leading-relaxed text-foreground sm:text-[15px]">
        &ldquo;{quote}&rdquo;
      </blockquote>
      <footer className="mt-6 flex items-center gap-3 border-t border-border/60 pt-5">
        <Avatar className="h-11 w-11">
          <AvatarFallback className={cn("text-sm font-bold", accent)}>{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{role}</p>
        </div>
      </footer>
    </article>
  );
}

export function TestimonialsSection() {
  const t = useTranslations("landing.testimonials");

  return (
    <section
      id="testimonials"
      className={cn(landingSection.default, landingSection.padding)}
      aria-labelledby="testimonials-heading"
    >
      <div className="container">
        <header className="mx-auto mb-8 max-w-3xl text-center sm:mb-12 md:mb-14">
          <p className={cn("mb-5", brandStyles.sectionBadge)}>
            <MessageSquareQuote className="h-3.5 w-3.5" aria-hidden />
            {t("badge")}
          </p>
          <h2
            id="testimonials-heading"
            className="text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-[2.75rem] md:leading-tight"
          >
            {t("title")}{" "}
            <span className={brandStyles.headingAccent}>{t("titleHighlight")}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
            {t("description")}
          </p>
        </header>

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {TESTIMONIAL_KEYS.map((key) => (
            <li key={key}>
              <TestimonialCard
                quote={t(`items.${key}.quote`)}
                name={t(`items.${key}.name`)}
                role={t(`items.${key}.role`)}
                initials={t(`items.${key}.initials`)}
                accent={avatarAccent[key]}
                ratingAriaLabel={t("ratingAriaLabel")}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
