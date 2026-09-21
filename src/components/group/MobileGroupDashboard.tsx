"use client";

import dynamic from "next/dynamic";
import NextLink from "next/link";
import { useMemo, useState, useCallback, type Dispatch, type SetStateAction } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Handshake,
  Download,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  Scale,
  Search,
  Share2,
  LayoutDashboard,
  List,
  SlidersHorizontal,
  Split,
  Tag,
  User,
} from "lucide-react";

import { ExpenseListCategoryIcon } from "@/components/expense/ExpenseListCategoryIcon";
import {
  expenseHasAttachment,
  getExpensePaidByLabel,
  memberDisplayNameForViewer,
  memberLabelWithYouSuffix,
} from "@/lib/groupExpenseLabels";
import type { GroupDashboardInterface, UserInterface } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { SingleSelect } from "@/components/ui/single-select";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeMenuItems } from "@/components/theme/ThemeToggle";
import { UserAvatar, AvatarGroup } from "@/components/ui/UserAvatar";
import { formatCurrency } from "@/lib/avatar-utils";
import type { CategoryKey } from "@/components/icons/CategoryIcons";
import { formatExpenseGroupHeaderTitle } from "@/components/ui/formatters";
import { resolveCategoryDisplayLabel } from "@/lib/category-labels";
import { cn } from "@/lib/utils";
import { ADMIN_BASE_PATH } from "@/lib/constants";
import { useBackButtonClose } from "@/hooks/useBackButtonClose";
import { GenericAlertDialog } from "@/components/ui/generic-alert-dialog";

const ExpenseChart = dynamic(() => import("@/components/group/ExpenseChart"), {
  ssr: false,
  loading: () => <ChartLoadingPlaceholder />,
});

function ChartLoadingPlaceholder() {
  const tCommon = useTranslations("common");
  return (
    <div className="flex h-[200px] w-full items-center justify-center text-sm text-muted-foreground">
      {tCommon("loadingChart")}
    </div>
  );
}

type Settlement = {
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
  amount: number;
};

export type DashboardGroupBy = "date" | "paidBy" | "category" | "splitType";
export type DashboardSortBy = "date_desc" | "amount_desc" | "amount_asc";

type QuickChipIcon = React.ComponentType<{ className?: string }>;

export type MobileGroupDashboardProps = {
  groupId: string;
  isAdminView: boolean;
  group: GroupDashboardInterface["group"];
  expenses: GroupDashboardInterface["expenses"];
  groupedExpenses: Record<string, GroupDashboardInterface["expenses"]>;
  groupBy: DashboardGroupBy;
  setGroupBy: Dispatch<SetStateAction<DashboardGroupBy>>;
  sortBy: DashboardSortBy;
  setSortBy: Dispatch<SetStateAction<DashboardSortBy>>;
  shouldTitleCase: boolean;
  expandedGroups: Record<string, boolean>;
  setExpandedGroups: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  balances: Record<string, number>;
  settlements: Settlement[];
  totalExpenses: number;
  search: string;
  setSearch: (v: string) => void;
  visibleCount: number;
  /** Native share when supported; otherwise copies to the clipboard. */
  copyLink: (type: "link" | "settlement") => Promise<void>;
  onExportExpenses: () => void;
  openRow: number | null;
  setOpenRow: (n: number | null) => void;
  settlingIndex: number | null;
  settleConfirmation: { settlement: Settlement; index: number } | null;
  setSettleConfirmation: (v: { settlement: Settlement; index: number } | null) => void;
  handleSettle: (s: Settlement, index: number) => Promise<void>;
  viewMode: "list" | "chart";
  setViewMode: Dispatch<SetStateAction<"list" | "chart">>;
  chartData: { name: string; value: number }[];
  viewerMemberId: string | null;
  onViewerMemberIdChange: (memberId: string | null) => void;
};

function groupTotal(list: GroupDashboardInterface["expenses"]) {
  return list.reduce((sum, e) => sum + e.amount, 0);
}

export function MobileGroupDashboard({
  groupId,
  isAdminView,
  group,
  expenses,
  groupedExpenses,
  groupBy,
  setGroupBy,
  sortBy,
  setSortBy,
  shouldTitleCase,
  expandedGroups,
  setExpandedGroups,
  balances,
  settlements,
  totalExpenses,
  search,
  setSearch,
  visibleCount,
  copyLink,
  onExportExpenses,
  openRow,
  setOpenRow,
  settlingIndex,
  settleConfirmation,
  setSettleConfirmation,
  handleSettle,
  viewMode,
  setViewMode,
  chartData,
  viewerMemberId,
  onViewerMemberIdChange,
}: MobileGroupDashboardProps) {
  const t = useTranslations("groupDetails");
  const tGroup = useTranslations("group");
  const tCommon = useTranslations("common");
  const tCategories = useTranslations("categories");
  const resolveCategoryLabel = useCallback(
    (key: string) => resolveCategoryDisplayLabel(tCategories, key),
    [tCategories]
  );
  const youLabel = tGroup("you");

  const mobileGroupByOptions = useMemo(
    () => [
      { value: "date" as const, label: t("groupByDate"), icon: Calendar },
      { value: "paidBy" as const, label: t("groupByPaidBy"), icon: User },
      { value: "category" as const, label: t("groupByCategory"), icon: Tag },
      { value: "splitType" as const, label: t("groupBySplitType"), icon: Split },
    ],
    [t]
  );

  const mobileSortOptions = useMemo(
    () => [
      { value: "date_desc" as const, label: t("sortNewest"), icon: ArrowUpDown },
      { value: "amount_desc" as const, label: t("sortHighest"), icon: ArrowDown },
      { value: "amount_asc" as const, label: t("sortLowest"), icon: ArrowUp },
    ],
    [t]
  );

  const quickGroupChips = useMemo(
    () => [
      { groupBy: "date" as const, label: t("quickByDate"), icon: Calendar },
      { groupBy: "paidBy" as const, label: t("quickByPerson"), icon: User },
      { groupBy: "category" as const, label: t("quickByCategory"), icon: Tag },
      { groupBy: "splitType" as const, label: t("groupBySplitType"), icon: Split },
    ],
    [t]
  );

  const quickSortChips = useMemo(
    () => [
      { sortBy: "date_desc" as const, label: t("quickNewest"), icon: ArrowUpDown },
      { sortBy: "amount_desc" as const, label: t("quickHighest"), icon: ArrowDown },
      { sortBy: "amount_asc" as const, label: t("quickLowest"), icon: ArrowUp },
    ],
    [t]
  );

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewerSheetOpen, setViewerSheetOpen] = useState(false);

  useBackButtonClose(filtersOpen, () => setFiltersOpen(false));
  useBackButtonClose(viewerSheetOpen, () => setViewerSheetOpen(false));
  // Intentionally no useBackButtonClose on the ⋯ dropdown: closing the menu runs the hook's
  // history.back() cleanup, which can run after navigating (e.g. Edit group) and undo the route.

  const quickFilterRowClass =
    "mb-3 flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

  const chipButtonClass = (active: boolean) =>
    cn(
      "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors sm:text-[13px]",
      active
        ? "border-primary bg-primary text-primary-foreground shadow-sm"
        : "border-border/80 bg-muted/50 text-foreground hover:bg-muted"
    );

  const viewerBalance = useMemo(() => {
    if (!viewerMemberId) return null;
    const v = balances[viewerMemberId];
    if (v === undefined || Number.isNaN(v)) return null;
    return v;
  }, [balances, viewerMemberId]);

  const setQuickGroupBy = (next: DashboardGroupBy) => {
    setSearch("");
    setGroupBy(next);
  };

  const setQuickSortBy = (next: DashboardSortBy) => {
    setSearch("");
    setSortBy(next);
  };

  const homeHref = isAdminView ? ADMIN_BASE_PATH : "/";

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      {/* App-style header */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/90">
        <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
          <Button variant="ghost" size="icon-sm" className="shrink-0" asChild>
            {isAdminView ? (
              <NextLink href={homeHref} aria-label={tCommon("back")}>
                <ArrowLeft className="h-5 w-5" />
              </NextLink>
            ) : (
              <Link href={homeHref} aria-label={tCommon("back")}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            )}
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight">
            {group.name}
          </h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="shrink-0" aria-label={t("groupMenu")}>
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href={`/group/${groupId}/edit`} className="flex items-center gap-2">
                  <Pencil className="h-4 w-4" />
                  {t("editGroup")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  void copyLink("link");
                }}
              >
                <Share2 className="mr-2 h-4 w-4" />
                {t("shareGroupLink")}
              </DropdownMenuItem>
              {settlements.length > 0 ? (
                <DropdownMenuItem
                  onClick={() => {
                    void copyLink("settlement");
                  }}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  {t("shareSettlement")}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={onExportExpenses} disabled={!expenses.length}>
                <Download className="mr-2 h-4 w-4" />
                {t("exportExpenses")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <ThemeMenuItems />
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 rounded-lg py-2.5 pl-2 pr-2 text-sm font-medium"
                onClick={() => {
                  window.setTimeout(() => setViewerSheetOpen(true), 50);
                }}
              >
                <User className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                {t("whoAreYou")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Drawer open={viewerSheetOpen} onOpenChange={setViewerSheetOpen}>
          <DrawerContent className="z-[100] max-h-[min(88dvh,36rem)] rounded-t-2xl border-t px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
            <DrawerHeader className="space-y-1 border-b border-border/60 px-0 pb-4 pt-0 text-left">
              <DrawerTitle>{t("whoAreYou")}</DrawerTitle>
              <DrawerDescription className="text-balance">
                {t("whoAreYouDescription")}
              </DrawerDescription>
            </DrawerHeader>
            <div className="mt-4 max-h-[min(52dvh,22rem)] space-y-2 overflow-y-auto overscroll-contain pr-0.5">
              {group.members.map((m) => {
                const selected = viewerMemberId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onViewerMemberIdChange(m.id);
                      setViewerSheetOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-3 py-3.5 text-left transition-colors",
                      selected
                        ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                        : "border-border/80 bg-muted/30 active:bg-muted/50"
                    )}
                  >
                    <UserAvatar name={m.name} size="md" />
                    <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{m.name}</span>
                    {selected ? <Check className="h-5 w-5 shrink-0 text-primary" aria-hidden /> : null}
                  </button>
                );
              })}
            </div>
            {viewerMemberId ? (
              <Button
                type="button"
                variant="default"
                className="mt-4 w-full rounded-xl font-semibold"
                onClick={() => {
                  onViewerMemberIdChange(null);
                  setViewerSheetOpen(false);
                }}
              >
                {t("clearSelection")}
              </Button>
            ) : null}
          </DrawerContent>
        </Drawer>
        <div className="grid grid-cols-2 gap-3 border-t border-border/60 px-4 py-1">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{t("totalExpenses")}</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">
              {formatCurrency(totalExpenses, group.currency)}
            </p>
          </div>
          <div className="text-right">
            {viewerMemberId && viewerBalance !== null ? (
              <>
                <p className="text-xs font-medium text-muted-foreground">
                  {viewerBalance > 0.01
                    ? t("youAreOwed")
                    : viewerBalance < -0.01
                      ? t("youOwe")
                      : t("youAreSettled")}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-lg font-bold tabular-nums",
                    viewerBalance > 0.01 && "text-success",
                    viewerBalance < -0.01 && "text-destructive",
                    Math.abs(viewerBalance) <= 0.01 && "text-muted-foreground"
                  )}
                >
                  {Math.abs(viewerBalance) <= 0.01
                    ? "—"
                    : formatCurrency(
                      viewerBalance > 0.01 ? viewerBalance : Math.abs(viewerBalance),
                      group.currency
                    )}
                </p>
              </>
            ) : (
              <p onClick={() => {
                window.setTimeout(() => setViewerSheetOpen(true), 50);
              }}>
                <p className="text-xs font-medium text-muted-foreground">{t("yourBalance")}</p>
                <p className="mt-0.5 text-balance text-xs leading-snug text-muted-foreground" >
                  {t("setYourProfile")}
                </p>
              </p>
            )}
          </div>
        </div>
      </header>

      <Tabs defaultValue="expenses" className="flex flex-1 flex-col px-0">
        <TabsContent value="expenses" className="mt-0 flex-1 px-3 pb-32 pt-3 focus-visible:outline-none sm:px-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary"
                placeholder={t("searchExpenses")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onBlur={(event) => setSearch(event.target.value.trim())}
                aria-label={t("searchExpenses")}
              />
            </div>
            <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border bg-muted/80 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  viewMode === "list"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label={t("listView")}
                aria-pressed={viewMode === "list"}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("chart")}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  viewMode === "chart"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label={t("chartView")}
                aria-pressed={viewMode === "chart"}
              >
                <LayoutDashboard className="h-4 w-4" />
              </button>
            </div>
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-xl border-dashed"
                  aria-label={t("filters")}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="flex w-[min(100vw,22rem)] flex-col gap-0 sm:max-w-sm">
                <SheetHeader className="text-left">
                  <SheetTitle>{t("filters")}</SheetTitle>
                  <SheetDescription>{t("filtersDescription")}</SheetDescription>
                </SheetHeader>
                <div className="mt-6 flex flex-1 flex-col gap-6 overflow-y-auto px-1 pb-8">
                  <div className="space-y-2">
                    <SingleSelect
                      items={mobileGroupByOptions.map((m) => ({
                        id: m.value,
                        label: m.label,
                        icon: m.icon,
                      }))}
                      value={{ itemId: groupBy }}
                      onSelect={(_, itemId) => setGroupBy(itemId as DashboardGroupBy)}
                      placeholder={t("groupBy")}
                      label={t("groupBy")}
                    />
                  </div>
                  <div className="space-y-2">
                    <SingleSelect
                      items={mobileSortOptions.map((m) => ({
                        id: m.value,
                        label: m.label,
                        icon: m.icon,
                      }))}
                      value={{ itemId: sortBy }}
                      onSelect={(_, itemId) => setSortBy(itemId as DashboardSortBy)}
                      placeholder={t("sortBy")}
                      label={t("sortBy")}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="default"
                    className="w-full rounded-xl"
                    onClick={() => {
                      setSearch("");
                      setGroupBy("date");
                      setSortBy("date_desc");
                      setFiltersOpen(false);
                    }}
                  >
                    {t("resetAll")}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className={quickFilterRowClass}>
            {quickGroupChips.map((chip) => {
              const Icon = chip.icon;
              return (
                <button
                  key={`g-${chip.groupBy}`}
                  type="button"
                  onClick={() => setQuickGroupBy(chip.groupBy)}
                  className={chipButtonClass(groupBy === chip.groupBy)}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {chip.label}
                </button>
              );
            })}
            {quickSortChips.map((chip) => {
              const Icon = chip.icon;
              return (
                <button
                  key={`s-${chip.sortBy}`}
                  type="button"
                  onClick={() => setQuickSortBy(chip.sortBy)}
                  className={chipButtonClass(sortBy === chip.sortBy)}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {chip.label}
                </button>
              );
            })}
          </div>

          {search && visibleCount > 0 && (
            <p className="mb-2 text-xs text-muted-foreground">
              {t("showingMatches", { count: visibleCount })}
              <button type="button" className="ml-2 font-medium text-primary underline" onClick={() => setSearch("")}>
                {tCommon("clear")}
              </button>
            </p>
          )}
          {Object.keys(groupedExpenses).length === 0 && search ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="font-medium text-foreground">{t("noExpensesFound")}</p>
              <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
                {t("clearSearch")}
              </Button>
            </div>
          ) : null}
          {!expenses.length && !search ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <p className="font-semibold text-foreground">{t("noExpensesYet")}</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                {t("noExpensesHint")}
              </p>
            </div>
          ) : null}

          {viewMode === "chart" && chartData.length > 0 ? (
            <div className="rounded-xl border border-border/80 bg-card p-3">
              <ExpenseChart
                data={chartData}
                currency={group.currency}
                totalExpenses={chartData.reduce((s, d) => s + d.value, 0)}
              />
            </div>
          ) : null}

          {viewMode === "list" &&
            Object.entries(groupedExpenses).map(([title, list]) => {
              const isOpen = expandedGroups[title] ?? true;
              return (
                <div key={title} className="mb-1 overflow-hidden rounded-xl border border-border/80">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedGroups((p) => ({
                        ...p,
                        [title]: !isOpen,
                      }))
                    }
                    className="flex w-full items-center justify-between gap-2 bg-muted/30 px-3 py-2.5 text-left"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {formatExpenseGroupHeaderTitle(title, groupBy, shouldTitleCase, resolveCategoryLabel)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("expenseCount", { count: list.length })}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatCurrency(groupTotal(list), group.currency)}
                    </span>
                  </button>
                  {isOpen &&
                    list.map((expense) => {
                      return (
                        <Link
                          key={expense.id}
                          href={`/group/${groupId}/expense/${expense.id}`}
                          className="flex gap-3 border-t border-border/60 px-3 py-3 active:bg-muted/50"
                        >
                          <ExpenseListCategoryIcon
                            category={expense.category as CategoryKey}
                            subcategory={expense.subcategory}
                            hasAttachment={expenseHasAttachment(expense)}
                            containerClassName="rounded-sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium leading-snug">{expense.description}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {getExpensePaidByLabel(expense, viewerMemberId, youLabel, tGroup)} {tCommon("paid")}
                            </p>
                            <AvatarGroup
                              names={expense.participants
                                .map((p) => p.user)
                                .filter((u): u is UserInterface => !!u)
                                .map((u) => u.name)}
                              overlayNames={expense.participants
                                .map((p) => p.user)
                                .filter((u): u is UserInterface => !!u)
                                .map((u) =>
                                  memberLabelWithYouSuffix(u.id, u.name, viewerMemberId, youLabel)
                                )}
                              className="mt-2"
                              size="sm"
                              label=""
                            />
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold tabular-nums">
                              {formatCurrency(expense.amount, expense.currency)}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                </div>
              );
            })}
        </TabsContent>

        <TabsContent value="balances" className="mt-0 flex-1 px-3 pb-32 pt-3 focus-visible:outline-none sm:px-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("balances")}</p>
          <ul className="space-y-0 divide-y divide-border/80 rounded-xl border border-border/80">
            {group.members.map((m) => {
              const bal = balances[m.id] ?? 0;
              const label =
                Math.abs(bal) < 0.01
                  ? t("settledUp")
                  : bal > 0.01
                    ? t("getsBack")
                    : t("owesGroup");
              const displayName = memberDisplayNameForViewer(m.id, m.name, viewerMemberId, youLabel);

              return (
                <li key={m.id} className="flex items-center gap-3 px-3 py-3.5">
                  <UserAvatar name={m.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold leading-tight">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-semibold tabular-nums",
                      bal > 0.01 && "text-success",
                      bal < -0.01 && "text-destructive",
                      Math.abs(bal) < 0.01 && "text-muted-foreground"
                    )}
                  >
                    {bal > 0.01 ? "+" : ""}
                    {formatCurrency(bal, group.currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        </TabsContent>

        <TabsContent value="settlements" className="mt-0 flex-1 px-3 pb-32 pt-3 focus-visible:outline-none sm:px-4">
          {expenses.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">{t("addExpensesForSettlements")}</p>
          ) : settlements.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">{t("allSettledForNow")}</p>
          ) : (
            <ul className="space-y-2">
              {settlements.map((s, i) => {
                const isOpen = openRow === i;
                const isLoading = settlingIndex === i;
                const fromName = memberDisplayNameForViewer(s.fromId, s.fromName, viewerMemberId, youLabel);
                const toName = memberDisplayNameForViewer(s.toId, s.toName, viewerMemberId, youLabel);
                return (
                  <li key={`${s.fromId}-${s.toId}-${i}`} className="rounded-xl border border-border/80 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 text-sm leading-snug">
                        {tCommon("paysTo", { from: fromName, to: toName })}
                      </p>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-semibold tabular-nums">
                          {formatCurrency(s.amount, group.currency)}
                        </span>
                        <button
                          type="button"
                          className="rounded-md p-1.5 hover:bg-muted"
                          onClick={() => setOpenRow(isOpen ? null : i)}
                          aria-expanded={isOpen}
                        >
                          {isOpen ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </div>
                    {isOpen ? (
                      <div className="mt-3 flex justify-center">
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          disabled={isLoading}
                          className="font-semibold"
                          onClick={() => setSettleConfirmation({ settlement: s, index: i })}
                        >
                          {isLoading ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                              {tCommon("recording")}
                            </span>
                          ) : (
                            t("settleUp")
                          )}
                        </Button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <nav
          aria-label={t("groupSections")}
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom,0px))] left-1/2 z-40 -translate-x-1/2 rounded-2xl border border-border/80 bg-background/95 p-1 shadow-lg shadow-black/15 backdrop-blur-md supports-[backdrop-filter]:bg-background/85"
        >
          <TabsList className="flex h-auto items-stretch gap-0.5 bg-transparent p-0">
            <TabsTrigger
              value="expenses"
              aria-label={t("tabExpenses")}
              className="flex min-w-[4.25rem] flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 text-[10px] font-semibold leading-tight text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
            >
              <Receipt className="h-4 w-4 shrink-0" aria-hidden />
              <span className="whitespace-nowrap">{t("tabExpenses")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="balances"
              aria-label={t("tabBalances")}
              className="flex min-w-[4.25rem] flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 text-[10px] font-semibold leading-tight text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
            >
              <Scale className="h-4 w-4 shrink-0" aria-hidden />
              <span className="whitespace-nowrap">{t("tabBalances")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="settlements"
              aria-label={t("tabSettlements")}
              className="flex min-w-[4.25rem] flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 text-[10px] font-semibold leading-tight text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
            >
              <Handshake className="h-4 w-4 shrink-0" aria-hidden />
              <span className="whitespace-nowrap">{t("tabSettlements")}</span>
            </TabsTrigger>
          </TabsList>
        </nav>
      </Tabs>

      <Link
        href={`/group/${groupId}/add-expense`}
        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.75rem)] right-[max(1.25rem,env(safe-area-inset-right,0px))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:bg-primary/92 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.97]"
        aria-label={t("addExpense")}
      >
        <Plus className="h-7 w-7" strokeWidth={2.25} />
      </Link>

      <GenericAlertDialog
        open={settleConfirmation !== null}
        onOpenChange={(open) => {
          if (!open) setSettleConfirmation(null);
        }}
        title={t("recordSettlementTitle")}
        description={<span>{settleConfirmation
                ? t("recordSettlementDescription", {
                    from: memberDisplayNameForViewer(
                      settleConfirmation.settlement.fromId,
                      settleConfirmation.settlement.fromName,
                      viewerMemberId,
                      youLabel
                    ),
                    to: memberDisplayNameForViewer(
                      settleConfirmation.settlement.toId,
                      settleConfirmation.settlement.toName,
                      viewerMemberId,
                      youLabel
                    ),
                    amount: formatCurrency(
                      settleConfirmation.settlement.amount,
                      group.currency
                    ),
                  })
                : ""}</span>}
        actions={[
          { label: tCommon("cancel"), type: "cancel", className: "mt-0 flex-1" },
          {
            label: tCommon("confirm"),
            className: "flex-1",
            disabled: settleConfirmation ? settlingIndex === settleConfirmation.index : false,
            onClick: async () => {
                if (!settleConfirmation) return;
                await handleSettle(settleConfirmation.settlement, settleConfirmation.index);
                setSettleConfirmation(null);
            },
          },
        ]}
      />
    </div>
  );
}
