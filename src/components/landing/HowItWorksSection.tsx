import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  DollarSign,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";

import {
  EXPENSE_CATEGORIES,
  getCategoryIcon,
  type CategoryKey,
} from "@/components/icons/CategoryIcons";
import { Button } from "@/components/ui/button";
import { AvatarGroup, UserAvatar } from "@/components/ui/UserAvatar";
import { cn } from "@/lib/utils";

type StepAccent = "violet" | "emerald" | "blue" | "orange";

type StepConfig = {
  number: number;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: StepAccent;
  mockup: ReactNode;
};

const stepAccentStyles: Record<
  StepAccent,
  {
    badgeBg: string;
    badgeText: string;
    iconBg: string;
    iconColor: string;
    arrow: string;
  }
> = {
  violet: {
    badgeBg: "bg-violet-100 dark:bg-violet-950/60",
    badgeText: "text-violet-700 dark:text-violet-300",
    iconBg: "bg-violet-100 dark:bg-violet-950/50",
    iconColor: "text-violet-600",
    arrow: "text-violet-400",
  },
  emerald: {
    badgeBg: "bg-emerald-100 dark:bg-emerald-950/60",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    iconBg: "bg-emerald-100 dark:bg-emerald-950/50",
    iconColor: "text-emerald-600",
    arrow: "text-emerald-400",
  },
  blue: {
    badgeBg: "bg-blue-100 dark:bg-blue-950/60",
    badgeText: "text-blue-700 dark:text-blue-300",
    iconBg: "bg-blue-100 dark:bg-blue-950/50",
    iconColor: "text-blue-600",
    arrow: "text-blue-400",
  },
  orange: {
    badgeBg: "bg-orange-100 dark:bg-orange-950/60",
    badgeText: "text-orange-700 dark:text-orange-300",
    iconBg: "bg-orange-100 dark:bg-orange-950/50",
    iconColor: "text-orange-600",
    arrow: "text-orange-400",
  },
};

const GROUP_MEMBERS = ["Sarah", "James", "Emma", "Michael", "Sofia"];

const recentExpenses: {
  title: string;
  paidBy: string;
  amount: string;
  category: CategoryKey;
  subcategory: string;
}[] = [
  {
    title: "Dinner at Cafe",
    paidBy: "Emma",
    amount: "$48.00",
    category: "food",
    subcategory: "dining",
  },
  {
    title: "Taxi to Airport",
    paidBy: "Michael",
    amount: "$28.00",
    category: "transportation",
    subcategory: "taxi",
  },
  {
    title: "Hotel Booking",
    paidBy: "James",
    amount: "$82.00",
    category: "transportation",
    subcategory: "hotel",
  },
  {
    title: "Groceries",
    paidBy: "Sofia",
    amount: "$14.00",
    category: "food",
    subcategory: "groceries",
  },
];

const groupBalances = [
  { name: "James", label: "gets back", amount: "$42.00", positive: true },
  { name: "Emma", label: "gets back", amount: "$18.00", positive: true },
  { name: "Michael", label: "owes", amount: "$58.00", positive: false },
  { name: "Sofia", label: "owes", amount: "$62.00", positive: false },
] as const;

function MockupCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-white p-3 shadow-sm dark:bg-card",
        className
      )}
    >
      {children}
    </div>
  );
}

function CreateGroupMockup() {
  return (
    <MockupCard>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-base dark:bg-violet-950/50">
            🏖️
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-foreground">Beach Trip</p>
            <p className="text-[10px] text-muted-foreground">5 members</p>
          </div>
        </div>
        <span className="text-muted-foreground" aria-hidden>
          ⋮
        </span>
      </div>
      <div className="mt-3 flex items-center gap-1">
        <AvatarGroup
          names={GROUP_MEMBERS}
          max={4}
          size="sm"
          isShowTotalMemberText={false}
          disableMobileTooltip
        />
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-border text-xs font-semibold text-muted-foreground">
          +
        </span>
      </div>
    </MockupCard>
  );
}

function AddExpensesMockup() {
  return (
    <MockupCard className="space-y-1.5">
      {recentExpenses.map((expense) => {
        const IconComponent = getCategoryIcon(expense.category, expense.subcategory);
        const categoryColor =
          EXPENSE_CATEGORIES[expense.category]?.color || "category-uncategorized";

        return (
        <div
          key={expense.title}
          className="flex items-center justify-between gap-2 border-b border-border/40 pb-1.5 last:border-0 last:pb-0"
        >
          <div className="flex min-w-0 items-center gap-2">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
              style={{
                backgroundColor: `hsl(var(--${categoryColor}) / 0.15)`,
              }}
            >
              <IconComponent
                className="h-4 w-4"
                style={{ color: `hsl(var(--${categoryColor}))` }}
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold text-foreground">
                {expense.title}
              </p>
              <p className="text-[9px] text-muted-foreground">Paid by {expense.paidBy}</p>
            </div>
          </div>
          <span className="shrink-0 text-[10px] font-bold tabular-nums text-foreground">
            {expense.amount}
          </span>
        </div>
        );
      })}
    </MockupCard>
  );
}

function TrackBalancesMockup() {
  return (
    <MockupCard>
      <p className="mb-2 text-[10px] font-bold text-foreground">Group Balance</p>
      <ul className="space-y-1.5">
        {groupBalances.map((row) => (
          <li key={row.name} className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <UserAvatar name={row.name} size="xs" disableMobileTooltip />
              <div className="min-w-0">
                <span className="block truncate text-[10px] font-semibold text-foreground">
                  {row.name}
                </span>
                <span className="block text-[9px] text-muted-foreground">{row.label}</span>
              </div>
            </div>
            <span
              className={cn(
                "shrink-0 text-[10px] font-bold tabular-nums",
                row.positive ? "text-emerald-600" : "text-destructive"
              )}
            >
              {row.positive ? "+" : "-"}
              {row.amount.replace("-", "").replace("+", "")}
            </span>
          </li>
        ))}
      </ul>
    </MockupCard>
  );
}

function SettleFasterMockup() {
  return (
    <MockupCard className="text-center">
      <p className="text-[10px] text-muted-foreground">You are owed</p>
      <p className="my-1 text-2xl font-extrabold tabular-nums text-emerald-600">$43.00</p>
      <p className="mb-2 mt-3 text-[10px] font-medium text-muted-foreground">Settle with</p>
      <div className="flex items-center justify-center gap-1">
        <AvatarGroup
          names={["James", "Emma", "Michael"]}
          max={3}
          size="sm"
          isShowTotalMemberText={false}
          disableMobileTooltip
        />
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
          +2
        </span>
      </div>
    </MockupCard>
  );
}

const steps: StepConfig[] = [
  {
    number: 1,
    title: "Create Groups",
    description:
      "Organize expenses for trips, roommates, events, or everyday shared spending.",
    icon: Users,
    accent: "violet",
    mockup: <CreateGroupMockup />,
  },
  {
    number: 2,
    title: "Add Expenses",
    description:
      "Record shared payments, bills, transport costs, dinners, and bookings in seconds.",
    icon: DollarSign,
    accent: "emerald",
    mockup: <AddExpensesMockup />,
  },
  {
    number: 3,
    title: "Track Balances",
    description: "See who paid, who owes, and every group balance in real time.",
    icon: BarChart3,
    accent: "blue",
    mockup: <TrackBalancesMockup />,
  },
  {
    number: 4,
    title: "Settle Faster",
    description: "Simplify settlements and avoid unnecessary payment confusion.",
    icon: Wallet,
    accent: "orange",
    mockup: <SettleFasterMockup />,
  },
];

function StepConnector({ accent }: { accent: StepAccent }) {
  const styles = stepAccentStyles[accent];
  return (
    <div
      className="hidden shrink-0 items-center justify-center self-start pt-24 xl:flex"
      aria-hidden
    >
      <svg
        width="48"
        height="14"
        viewBox="0 0 48 14"
        fill="none"
        className={styles.arrow}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M2 7H38"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeDasharray="3 5"
        />
        <path
          d="M36 2L42 7L36 12"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function HowItWorksStep({ step }: { step: StepConfig }) {
  const styles = stepAccentStyles[step.accent];
  const Icon = step.icon;

  return (
    <article className="relative flex min-w-0 flex-1 flex-col rounded-2xl border border-border/60 bg-card p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover sm:p-6">
      <span
        className={cn(
          "absolute left-5 top-5 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold sm:left-6 sm:top-6",
          styles.badgeBg,
          styles.badgeText
        )}
      >
        {step.number}
      </span>

      <div className="flex flex-col items-center text-center">
        <div
          className={cn(
            "mb-4 flex h-16 w-16 items-center justify-center rounded-full",
            styles.iconBg
          )}
        >
          <Icon className={cn("h-7 w-7", styles.iconColor)} strokeWidth={2} aria-hidden />
        </div>
        <h3 className="mb-2 text-lg font-bold text-foreground">{step.title}</h3>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
          {step.description}
        </p>
      </div>

      <div className="mt-5">{step.mockup}</div>
    </article>
  );
}

const trustPoints = [
  "Free to start",
  "No credit card required",
  "Secure & Private",
] as const;

function HowItWorksCta() {
  return (
    <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-violet-100 bg-gradient-to-br from-violet-50 via-card to-violet-50/80 p-5 shadow-card ring-1 ring-violet-100/60 dark:border-violet-900/40 dark:bg-violet-950/25 dark:from-violet-950/40 dark:via-card dark:to-violet-950/20 dark:shadow-none dark:ring-violet-900/30 sm:p-8 lg:p-5">
      <div className="grid min-w-0 items-center gap-5 sm:gap-6 lg:grid-cols-[1.1fr_1fr_1fr] lg:gap-8">
        <div className="flex min-w-0 flex-col items-center gap-3 text-center md:flex-row md:items-center md:gap-4 md:text-left">
          <span className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg md:flex lg:h-20 lg:w-20">
            <Wallet className="h-9 w-9 lg:h-12 lg:w-12" strokeWidth={2} aria-hidden />
          </span>
          <div className="min-w-0 max-w-full">
            <p className="text-balance text-lg font-bold leading-tight text-foreground sm:text-xl">
              Start Managing Shared Expenses Smarter
            </p>
            <p className="mt-1.5 text-pretty text-sm text-muted-foreground">
              Join groups, add expenses, and settle up in just a few taps.
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-col items-stretch gap-3 text-center sm:items-center">
          <Button
            asChild
            size="lg"
            className="h-12 w-full rounded-xl bg-violet-600 px-5 text-base font-semibold text-white shadow-md hover:bg-violet-700 hover:shadow-lg sm:max-w-xs sm:self-center sm:px-6"
          >
            <Link href="/create-group">
              Create Your First Group
              <ArrowRight className="ml-1 h-5 w-5 shrink-0" />
            </Link>
          </Button>
          <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:gap-x-4">
            {trustPoints.map((point) => (
              <li
                key={point}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground sm:text-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-violet-500" aria-hidden />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="hidden justify-center lg:flex lg:justify-end">
          <Image
            src="/landing/how-it-works-cta-people.png"
            alt="Three friends managing shared expenses on their phones with SplitCost"
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

export function HowItWorksSection() {
  return (
    <section
      className="bg-muted/30 py-12 sm:py-16 md:py-20"
      aria-labelledby="how-it-works-heading"
    >
      <div className="container">
        <header className="mx-auto mb-10 max-w-3xl text-center sm:mb-12 md:mb-14">
          <p className="mb-5 inline-flex items-center justify-center gap-2 rounded-full bg-violet-100 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Simple Expense Management
          </p>
          <h2
            id="how-it-works-heading"
            className="text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl"
          >
            One Simple Way to
            <br />
            <span className="text-violet-600">Track, Split &amp; Settle</span> Expenses
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
            SplitCost helps groups manage shared bills, track balances, organize travel expenses,
            and settle payments without spreadsheets or awkward reminders.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 xl:flex xl:items-stretch xl:gap-0">
          {steps.map((step, index) => (
            <Fragment key={step.number}>
              <HowItWorksStep step={step} />
              {index < steps.length - 1 ? <StepConnector accent={step.accent} /> : null}
            </Fragment>
          ))}
        </div>

        <HowItWorksCta />
      </div>
    </section>
  );
}
