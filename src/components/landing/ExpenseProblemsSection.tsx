"use client";

import {
  AlertTriangle,
  Bell,
  Building2,
  Calculator,
  Car,
  Clock,
  Luggage,
  MessageCircle,
  MessageSquare,
  Plane,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { brandProblemAccent, brandStyles, landingSection } from "@/lib/brand-styles";
import { cn } from "@/lib/utils";

type ProblemAccent = "brand" | "emerald" | "orange";

type ProblemKey = "whoPaidLast" | "confusingBalances" | "awkwardReminders" | "travelChaotic";

type ProblemCardConfig = {
  key: ProblemKey;
  accent: ProblemAccent;
  icon: LucideIcon;
  illustration: ReactNode;
};

const accentStyles: Record<
  ProblemAccent,
  {
    iconWrap: string;
    bar: string;
    scene: string;
    panelBorder: string;
    accentIcon: string;
    accentBg: string;
  }
> = {
  brand: brandProblemAccent,
  emerald: {
    iconWrap: "bg-emerald-600 text-white ring-emerald-100 dark:ring-emerald-900",
    bar: "bg-emerald-500",
    scene: "bg-emerald-50 dark:bg-emerald-950/35",
    panelBorder: "border-emerald-100 dark:border-emerald-900/50",
    accentIcon: "text-emerald-600 dark:text-emerald-400",
    accentBg: "bg-emerald-100 dark:bg-emerald-950/50",
  },
  orange: {
    iconWrap: "bg-orange-500 text-white ring-orange-100 dark:ring-orange-900",
    bar: "bg-orange-500",
    scene: "bg-orange-50 dark:bg-orange-950/35",
    panelBorder: "border-orange-100 dark:border-orange-900/50",
    accentIcon: "text-orange-600 dark:text-orange-400",
    accentBg: "bg-orange-100 dark:bg-orange-950/50",
  },
};

const SCENE_HEIGHT = "h-44";
const SCENE_WIDTH = "max-w-[220px]";
const PANEL_WIDTH = "w-[188px]";

function ProblemSceneLayout({
  accent,
  panelTitle,
  bottomIcon: BottomIcon,
  children,
}: {
  accent: ProblemAccent;
  panelTitle: string;
  bottomIcon: LucideIcon;
  children: ReactNode;
}) {
  const styles = accentStyles[accent];

  return (
    <div className={cn("relative mx-auto w-full", SCENE_HEIGHT, SCENE_WIDTH)}>
      <div
        className={cn(
          "absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-xl border bg-white p-2.5 shadow-md dark:bg-card",
          PANEL_WIDTH,
          styles.panelBorder
        )}
        aria-hidden
      >
        <p className="mb-1.5 text-center text-[10px] font-bold text-foreground">{panelTitle}</p>
        {children}
      </div>
      <div
        className={cn(
          "absolute bottom-0 left-1/2 z-0 flex h-20 w-20 -translate-x-1/2 items-center justify-center rounded-full",
          styles.accentBg
        )}
        aria-hidden
      >
        <BottomIcon className={cn("h-8 w-8", styles.accentIcon)} strokeWidth={2} aria-hidden />
      </div>
    </div>
  );
}

const chatClaims = [
  { name: "Sarah", note: "Dinner", amount: "$48.00" },
  { name: "You", note: "Last trip", amount: "$28.00" },
] as const;

function WhoPaidLastScene() {
  return (
    <ProblemSceneLayout accent="brand" panelTitle="Group chat" bottomIcon={MessageSquare}>
      <ul className="space-y-1.5 text-[10px] font-medium">
        {chatClaims.map(({ name, note, amount }) => (
          <li key={name} className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-muted-foreground">
              <span className="font-semibold text-foreground">{name}</span>
              <span className="text-muted-foreground"> · {note}</span>
            </span>
            <span className={cn("shrink-0 tabular-nums", brandStyles.headingAccent)}>{amount}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-center text-[9px] font-medium text-muted-foreground">
        Which payment counts?
      </p>
    </ProblemSceneLayout>
  );
}

const groupBalances = [
  { name: "James", amount: "+$42.00", positive: true },
  { name: "Emma", amount: "-$18.00", positive: false },
  { name: "Michael", amount: "+$9.50", positive: true },
  { name: "Sofia", amount: "-$33.50", positive: false },
] as const;

function GroupBalancesScene() {
  return (
    <ProblemSceneLayout accent="emerald" panelTitle="Group balance" bottomIcon={Users}>
      <ul className="space-y-1 text-[10px] font-medium">
        {groupBalances.map(({ name, amount, positive }) => (
          <li key={name} className="flex justify-between gap-2">
            <span className="text-muted-foreground">{name}</span>
            <span className={positive ? "text-emerald-600" : "text-destructive"}>{amount}</span>
          </li>
        ))}
      </ul>
    </ProblemSceneLayout>
  );
}

function PaymentReminderScene() {
  return (
    <ProblemSceneLayout accent="orange" panelTitle="Payment due" bottomIcon={Clock}>
      <ul className="space-y-1.5 text-[10px] font-medium">
        <li className="flex justify-between gap-2">
          <span className="text-muted-foreground">To</span>
          <span className="font-semibold text-foreground">James</span>
        </li>
        <li className="flex justify-between gap-2">
          <span className="text-muted-foreground">Amount</span>
          <span className="tabular-nums font-bold text-orange-600">$28.00</span>
        </li>
        <li className="flex justify-between gap-2">
          <span className="text-muted-foreground">Status</span>
          <span className="font-semibold text-destructive">Unpaid</span>
        </li>
      </ul>
      <p className="mt-2 text-center text-[9px] leading-snug text-muted-foreground">
        Still waiting on a follow-up
      </p>
    </ProblemSceneLayout>
  );
}

const travelReceiptItems = [
  { label: "Dinner", amount: "$45.00", icon: Utensils },
  { label: "Taxi", amount: "$58.00", icon: Car },
  { label: "Hotel", amount: "$78.00", icon: Building2 },
] as const;

function TravelExpensesScene() {
  return (
    <ProblemSceneLayout accent="brand" panelTitle="Trip expenses" bottomIcon={Plane}>
      <ul className="space-y-1.5 text-[10px] font-medium">
        {travelReceiptItems.map(({ label, amount, icon: Icon }) => (
          <li key={label} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
              <Icon className={cn("h-3 w-3 shrink-0", brandStyles.icon)} strokeWidth={2.25} aria-hidden />
              <span className="truncate">{label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-foreground">{amount}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2 text-[10px] font-bold">
        <span className="text-muted-foreground">Total</span>
        <span className={cn("tabular-nums", brandStyles.headingAccent)}>$181.00</span>
      </div>
    </ProblemSceneLayout>
  );
}

const problemCardConfigs: ProblemCardConfig[] = [
  {
    key: "whoPaidLast",
    accent: "brand",
    icon: MessageCircle,
    illustration: <WhoPaidLastScene />,
  },
  {
    key: "confusingBalances",
    accent: "emerald",
    icon: Calculator,
    illustration: <GroupBalancesScene />,
  },
  {
    key: "awkwardReminders",
    accent: "orange",
    icon: Bell,
    illustration: <PaymentReminderScene />,
  },
  {
    key: "travelChaotic",
    accent: "brand",
    icon: Luggage,
    illustration: <TravelExpensesScene />,
  },
];

function ProblemCard({
  title,
  description,
  card,
}: {
  title: string;
  description: string;
  card: ProblemCardConfig;
}) {
  const styles = accentStyles[card.accent];
  const Icon = card.icon;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-border/60 bg-card shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover">
      <div className={cn("relative px-4 pb-10 pt-6", styles.scene)} aria-hidden>
        {card.illustration}
        <span
          className={cn(
            "absolute bottom-0 left-1/2 flex h-11 w-11 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full ring-4",
            styles.iconWrap
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2.25} aria-hidden />
        </span>
      </div>

      <div className="flex flex-1 flex-col px-6 pb-6 pt-10 text-center">
        <h3 className="mb-2 text-lg font-bold text-foreground">{title}</h3>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        <div className="mt-6 flex justify-center" aria-hidden>
          <span className={cn("h-1 w-10 rounded-full", styles.bar)} />
        </div>
      </div>
    </article>
  );
}

export function ExpenseProblemsSection() {
  const t = useTranslations("landing.problems");

  return (
    <section
      className={cn(landingSection.default, landingSection.padding)}
      aria-labelledby="expense-problems-heading"
    >
      <div className="container">
        <header className="mx-auto mb-10 max-w-3xl text-center sm:mb-12 md:mb-14">
          <p
            className={cn(
              "mb-4 inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.14em]",
              brandStyles.headingAccent
            )}
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            {t("badge")}
          </p>
          <h2
            id="expense-problems-heading"
            className="text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl md:text-4xl"
          >
            {t("title")}{" "}
            <span className={brandStyles.headingAccent}>{t("titleHighlight")}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
            {t("description")}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
          {problemCardConfigs.map((card) => (
            <ProblemCard
              key={card.key}
              card={card}
              title={t(`items.${card.key}.title`)}
              description={t(`items.${card.key}.description`)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
