import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Handshake,
  LayoutDashboard,
  List,
  MoreHorizontal,
  Plus,
  Receipt,
  Scale,
  Search,
  SlidersHorizontal,
  Tag,
  User,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ExpenseListCategoryIcon } from "@/components/expense/ExpenseListCategoryIcon";
import { AvatarGroup } from "@/components/ui/UserAvatar";
import { formatCurrency } from "@/lib/avatar-utils";
import { cn } from "@/lib/utils";

const DEMO_MEMBERS = ["Emily", "James", "Sophie"] as const;

/** Realistic USD demo — mirrors live mobile dashboard layout. */
const DEMO = {
  currency: "USD",
  totalExpenses: 654,
  youOwe: 82,
  dateGroups: [
    {
      dateLabel: "18 May 2026",
      expenseCount: 3,
      groupTotal: 654,
      expenses: [
        {
          id: "1",
          descriptionKey: "dinnerOceanGrill",
          paidBy: "James",
          amount: 148,
          category: "food" as const,
          subcategory: "dining",
        },
        {
          id: "2",
          descriptionKey: "lunchBeach",
          paidBy: "Emily",
          amount: 86,
          category: "food" as const,
          subcategory: "dining",
        },
        {
          id: "3",
          descriptionKey: "hotelStay",
          paidBy: "You",
          amount: 420,
          category: "home" as const,
          subcategory: "rent",
          hasAttachment: true,
        },
      ],
    },
  ],
} as const;

type CompareMobileDashboardPreviewProps = {
  className?: string;
  "aria-label"?: string;
};

/** Static preview matching the real mobile group dashboard UI. */
export async function CompareMobileDashboardPreview({
  className,
  "aria-label": ariaLabel,
}: CompareMobileDashboardPreviewProps) {
  const t = await getTranslations("groupDetails");
  const tCommon = await getTranslations("common");
  const tPreview = await getTranslations("landing.comparePreview");
  const demoGroupName = tPreview("demoGroupName");

  const chipButtonClass = (active: boolean) =>
    cn(
      "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[10px] font-semibold leading-none",
      active
        ? "border-primary bg-primary text-primary-foreground shadow-sm"
        : "border-border/80 bg-muted/50 text-foreground"
    );

  const navTabClass = (active: boolean) =>
    cn(
      "flex min-w-[3.75rem] flex-col items-center justify-center gap-0.5 rounded-xl px-2.5 py-2 text-[10px] font-semibold leading-tight",
      active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
    );

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[280px] overflow-hidden rounded-[2rem] border-[10px] border-foreground/90 bg-background shadow-2xl ring-1 ring-border/60 dark:border-foreground/80",
        className
      )}
      aria-label={ariaLabel}
      role={ariaLabel ? "img" : undefined}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <div className="flex flex-col bg-background pb-[4.75rem]">
        <header className="border-b border-border/80 bg-background/95">
          <div className="flex h-12 items-center gap-2 px-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground">
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight">
              {demoGroupName}
            </h2>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground">
              <MoreHorizontal className="h-5 w-5" aria-hidden />
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-border/60 px-3 py-2">
            <div>
              <p className="text-[10px] font-medium text-muted-foreground">{t("totalExpenses")}</p>
              <p className="mt-0.5 text-base font-bold tabular-nums text-foreground">
                {formatCurrency(DEMO.totalExpenses, DEMO.currency)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-medium text-muted-foreground">{t("youOwe")}</p>
              <p className="mt-0.5 text-base font-bold tabular-nums text-destructive">
                {formatCurrency(DEMO.youOwe, DEMO.currency)}
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden px-3 pt-3">
          <div className="mb-2.5 flex items-center gap-1.5">
            <div className="relative min-w-0 flex-1 overflow-hidden">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <div className="h-9 overflow-hidden rounded-xl border border-input bg-background pl-8 pr-2">
                <span className="block truncate text-xs leading-9 text-muted-foreground">{tPreview("searchPlaceholder")}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-border bg-muted/80 p-0.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-background text-foreground shadow-sm">
                <List className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground">
                <LayoutDashboard className="h-3.5 w-3.5" aria-hidden />
              </span>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-dashed border-border">
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            </span>
          </div>

          <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className={chipButtonClass(true)}>
              <Calendar className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
              <span>{t("quickByDate")}</span>
            </span>
            <span className={chipButtonClass(false)}>
              <User className="h-3 w-3 shrink-0" aria-hidden />
              <span>{t("quickByPerson")}</span>
            </span>
            <span className={chipButtonClass(false)}>
              <Tag className="h-3 w-3 shrink-0" aria-hidden />
              <span>{t("quickByCategory")}</span>
            </span>
          </div>

          {DEMO.dateGroups.map((group) => (
            <div
              key={group.dateLabel}
              className="overflow-hidden rounded-xl border border-border/80"
            >
              <div className="flex w-full items-center justify-between gap-2 bg-muted/30 px-2.5 py-2">
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{group.dateLabel}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {t("expenseCount", { count: group.expenseCount })}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-xs font-semibold tabular-nums">
                  {formatCurrency(group.groupTotal, DEMO.currency)}
                </span>
              </div>

              {group.expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex gap-2 border-t border-border/60 px-2.5 py-2"
                >
                  <ExpenseListCategoryIcon
                    category={expense.category}
                    subcategory={expense.subcategory}
                    hasAttachment={"hasAttachment" in expense && expense.hasAttachment}
                    containerClassName="rounded-sm scale-90 origin-top-left"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium leading-snug">{tPreview(`demoExpenses.${expense.descriptionKey}`)}</p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {expense.paidBy} {tCommon("paid")}
                    </p>
                    <AvatarGroup
                      names={[...DEMO_MEMBERS]}
                      className="mt-1.5"
                      size="xs"
                      label=""
                    />
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold tabular-nums">
                      {formatCurrency(expense.amount, DEMO.currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <span
        className="absolute bottom-[calc(5.5rem+0.25rem)] right-3.5 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
        aria-hidden
      >
        <Plus className="h-6 w-6" strokeWidth={2.25} />
      </span>

      <nav
        aria-hidden
        className="absolute bottom-2.5 left-1/2 z-10 -translate-x-1/2 rounded-2xl border border-border/80 bg-background/95 p-1 shadow-lg shadow-black/10 backdrop-blur-md"
      >
        <div className="flex items-stretch gap-0.5">
          <span className={navTabClass(true)}>
            <Receipt className="h-4 w-4 shrink-0" aria-hidden />
            <span className="whitespace-nowrap">{t("tabExpenses")}</span>
          </span>
          <span className={navTabClass(false)}>
            <Scale className="h-4 w-4 shrink-0" aria-hidden />
            <span className="whitespace-nowrap">{t("tabBalances")}</span>
          </span>
          <span className={navTabClass(false)}>
            <Handshake className="h-4 w-4 shrink-0" aria-hidden />
            <span className="whitespace-nowrap">{t("tabSettlements")}</span>
          </span>
        </div>
      </nav>
    </div>
  );
}
