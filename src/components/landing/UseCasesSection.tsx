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
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UseCaseAccent = "violet" | "emerald" | "rose" | "blue" | "cyan";

type UseCaseItem = {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  icon: LucideIcon;
  accent: UseCaseAccent;
  tags: string[];
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
  violet: {
    iconBg: "bg-violet-600",
    tagBg: "bg-violet-100 dark:bg-violet-950/50",
    tagText: "text-violet-700 dark:text-violet-300",
    sceneBg: "from-violet-50/80 to-sky-50/80 dark:from-violet-950/30 dark:to-sky-950/20",
  },
  emerald: {
    iconBg: "bg-emerald-600",
    tagBg: "bg-emerald-100 dark:bg-emerald-950/50",
    tagText: "text-emerald-700 dark:text-emerald-300",
    sceneBg: "from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/30 dark:to-teal-950/20",
  },
  rose: {
    iconBg: "bg-rose-500",
    tagBg: "bg-rose-100 dark:bg-rose-950/50",
    tagText: "text-rose-700 dark:text-rose-300",
    sceneBg: "from-rose-50/80 to-pink-50/80 dark:from-rose-950/30 dark:to-pink-950/20",
  },
  blue: {
    iconBg: "bg-blue-600",
    tagBg: "bg-blue-100 dark:bg-blue-950/50",
    tagText: "text-blue-700 dark:text-blue-300",
    sceneBg: "from-blue-50/80 to-indigo-50/80 dark:from-blue-950/30 dark:to-indigo-950/20",
  },
  cyan: {
    iconBg: "bg-cyan-600",
    tagBg: "bg-cyan-100 dark:bg-cyan-950/50",
    tagText: "text-cyan-700 dark:text-cyan-300",
    sceneBg: "from-cyan-50/80 to-slate-50/80 dark:from-cyan-950/30 dark:to-slate-950/20",
  },
};

const useCases: UseCaseItem[] = [
  {
    title: "Travel Groups",
    description:
      "Track hotel bookings, transport, food, and trip expenses with one shared travel expense tracker.",
    image: "/landing/use-cases/use-case-travel.png",
    imageAlt: "Friends planning a trip together",
    icon: Luggage,
    accent: "violet",
    tags: ["Trips", "Bookings", "Transport", "Food", "Travel Expenses"],
  },
  {
    title: "Roommates",
    description:
      "Manage rent, groceries, utility bills, and shared household expenses without confusion.",
    image: "/landing/use-cases/use-case-roommates.png",
    imageAlt: "Roommates in a shared living room",
    icon: Home,
    accent: "emerald",
    tags: ["Rent", "Groceries", "Utility Bills", "Household Expenses"],
  },
  {
    title: "Couples & Partners",
    description:
      "Keep shared spending organized for daily expenses, subscriptions, dinners, and travel plans.",
    image: "/landing/use-cases/use-case-couples.png",
    imageAlt: "Couple reviewing shared expenses on a phone",
    icon: Heart,
    accent: "rose",
    tags: ["Daily Expenses", "Subscriptions", "Dinners", "Travel Plans"],
  },
  {
    title: "Friends & Events",
    description:
      "Split group dinners, parties, concerts, and event costs fairly with flexible expense sharing.",
    image: "/landing/use-cases/use-case-friends.png",
    imageAlt: "Friends at a social gathering",
    icon: Users,
    accent: "blue",
    tags: ["Dinners", "Parties", "Concerts", "Event Costs"],
  },
  {
    title: "Teams & Communities",
    description:
      "Organize shared payments, reimbursements, and group expenses for teams, clubs, and communities.",
    image: "/landing/use-cases/use-case-teams.png",
    imageAlt: "Team collaborating around a laptop",
    icon: Network,
    accent: "cyan",
    tags: ["Reimbursements", "Group Expenses", "Teams", "Communities"],
  },
];

function UseCaseCard({ item }: { item: UseCaseItem }) {
  const styles = accentStyles[item.accent];
  const Icon = item.icon;

  return (
    <article className="flex h-full min-w-[220px] snap-center flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm sm:min-w-0 dark:border-border/80">
      <div className="relative px-3 pt-3">
        <div
          className={cn(
            "relative flex h-36 items-end justify-center overflow-hidden rounded-xl bg-gradient-to-b sm:h-40",
            styles.sceneBg
          )}
        >
          <Image
            src={item.image}
            alt={item.imageAlt}
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
        <h3 className="mb-2 text-center text-base font-bold text-foreground">{item.title}</h3>
        <p className="mb-4 flex-1 text-center text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
          {item.description}
        </p>
        <div className="flex flex-wrap justify-center gap-1.5">
          {item.tags.map((tag) => (
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
      </div>
    </article>
  );
}

function UseCasesCta() {
  return (
    <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-violet-100 bg-gradient-to-br from-violet-50/90 via-violet-50/50 to-card p-6 shadow-card ring-1 ring-violet-100/60 dark:border-violet-900/40 dark:from-violet-950/35 dark:via-card dark:to-violet-950/15 dark:ring-violet-900/30 sm:p-8">
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
            One Expense Tracker for Every Group
          </h3>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
            Whether you&apos;re planning a trip, managing roommate bills, or tracking everyday
            shared spending, SplitCost keeps every expense organized in one place.
          </p>
          <Button
            asChild
            size="lg"
            className="h-11 rounded-xl bg-violet-600 px-6 text-sm font-semibold text-white shadow-md hover:bg-violet-700 sm:h-12 sm:text-base"
          >
            <Link href="/create-group">
              Start Tracking Expenses
              <ArrowRight className="ml-1 h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
          </Button>
        </div>

        <div className="hidden items-end justify-center md:flex md:justify-end">
          <Image
            src="/landing/use-cases/use-cases-cta-phone.png"
            alt="SplitCost mobile app on a phone"
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
  return (
    <section
      className="bg-background py-12 sm:py-16 md:py-20"
      aria-labelledby="use-cases-heading"
    >
      <div className="container">
        <header className="mx-auto mb-10 max-w-3xl text-center sm:mb-12 md:mb-14">
          <p className="mb-5 inline-flex items-center justify-center gap-2 rounded-full bg-violet-100 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Use Cases
          </p>
          <h2
            id="use-cases-heading"
            className="text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-[2.75rem] md:leading-tight"
          >
            Perfect for <span className="text-violet-600">Every</span> Shared Expense{" "}
            <span className="text-violet-600">Situation</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
            From travel expenses and roommate bills to events and everyday group payments,
            SplitCost makes shared expense management simple and organized.
          </p>
        </header>

        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 snap-x snap-mandatory sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3 xl:grid-cols-5 xl:gap-4">
          {useCases.map((item) => (
            <UseCaseCard key={item.title} item={item} />
          ))}
        </div>

        <UseCasesCta />
      </div>
    </section>
  );
}
