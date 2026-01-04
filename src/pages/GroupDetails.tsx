import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  ArrowRight,
  Loader2,
  Wallet,
  Users,
  Search,
  ChevronDown,
  ChevronRight,
  Calendar,
  User,
  Tag,
  Split,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
} from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar, AvatarGroup } from "@/components/ui/UserAvatar";
import { formatCurrency } from "@/lib/avatar-utils";
import {
  getCategoryIcon,
  EXPENSE_CATEGORIES,
  type CategoryKey,
} from "@/components/icons/CategoryIcons";
import {
  getGroup,
  loadExpenses,
  type Group,
  type Expense,
} from "@/lib/storage";
import { useIsMobile } from "@/hooks/use-mobile";
import { SingleSelect } from "@/components/ui/single-select";
import { toTitleCase } from "@/components/ui/formatters";

/* ======================================================
   CONSTANTS – MOVE TO CONSTANTS FILE LATER
====================================================== */
const GROUP_BY_OPTIONS = [
  { value: "date", label: "Date", icon: Calendar },
  { value: "paidBy", label: "Paid By", icon: User },
  { value: "category", label: "Category", icon: Tag },
  { value: "splitType", label: "Split Type", icon: Split },
] as const;

const SORT_OPTIONS = [
  { value: "date_desc", label: "Newest first", icon: ArrowUpDown },
  { value: "amount_desc", label: "Highest amount", icon: ArrowDown },
  { value: "amount_asc", label: "Lowest amount", icon: ArrowUp },
] as const;

/* ======================================================
   UTILS – MOVE TO UTILS FILE LATER
====================================================== */
function calculateShare(expense: Expense, member: string): number {
  if (!expense.participants.includes(member)) return 0;

  if (expense.splitType === "equal") {
    return expense.amount / expense.participants.length;
  }

  const split = expense.splits?.find((s) => s.member === member);
  return split?.amount || 0;
}

function calculateBalances(expenses: Expense[], members: string[]) {
  const balances: Record<string, number> = {};
  members.forEach((m) => (balances[m] = 0));

  expenses.forEach((expense) => {
    expense.participants.forEach((p) => {
      balances[p] -= calculateShare(expense, p);
    });
    balances[expense.paidBy] += expense.amount;
  });

  return balances;
}

function calculateSettlements(balances: Record<string, number>) {
  const settlements: { from: string; to: string; amount: number }[] = [];

  const debtors = Object.entries(balances)
    .filter(([, b]) => b < -0.01)
    .map(([name, balance]) => ({ name, balance }))
    .sort((a, b) => a.balance - b.balance);

  const creditors = Object.entries(balances)
    .filter(([, b]) => b > 0.01)
    .map(([name, balance]) => ({ name, balance }))
    .sort((a, b) => b.balance - a.balance);

  let i = 0,
    j = 0;

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(-debtors[i].balance, creditors[j].balance);

    settlements.push({
      from: debtors[i].name,
      to: creditors[j].name,
      amount: Math.round(amount * 100) / 100,
    });

    debtors[i].balance += amount;
    creditors[j].balance -= amount;

    if (Math.abs(debtors[i].balance) < 0.01) i++;
    if (Math.abs(creditors[j].balance) < 0.01) j++;
  }

  return settlements;
}

function getGroupTotal(expenses: Expense[]) {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

/* ======================================================
   COMPONENT
====================================================== */
export default function GroupDetailsPage() {
  const { groupId } = useParams();
  const isMobile = useIsMobile();
  const [group, setGroup] = useState<Group>();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] =
    useState<"date" | "paidBy" | "category" | "splitType">("date");
  const [sortBy, setSortBy] =
    useState<"date_desc" | "amount_desc" | "amount_asc">("date_desc");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {}
  );
  const shouldTitleCase = groupBy === "category" || groupBy === "splitType";

  useEffect(() => {
    if (!groupId) return;
    setLoading(true);

    Promise.all([getGroup(groupId), loadExpenses(groupId)])
      .then(([g, e]) => {
        setGroup(g);
        setExpenses(e);
      })
      .finally(() => setLoading(false));
  }, [groupId]);

  /* ======================================================
     FILTER / SORT / GROUP
  ====================================================== */
  const groupedExpenses = useMemo(() => {
    let list = [...expenses];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.paidBy.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.subcategory.toLowerCase().includes(q) ||
          e.amount.toString().includes(q) ||
          e.participants.includes(q)
      );
    }

    if (sortBy === "date_desc") {
      list.sort((a, b) => +new Date(b.date) - +new Date(a.date));
    } else if (sortBy === "amount_desc") {
      list.sort((a, b) => b.amount - a.amount);
    } else {
      list.sort((a, b) => a.amount - b.amount);
    }

    const grouped: Record<string, Expense[]> = {};
    list.forEach((e) => {
      let key = "";
      if (groupBy === "date") key = e.date;
      if (groupBy === "paidBy") key = e.paidBy;
      if (groupBy === "category") key = e.category;
      if (groupBy === "splitType") key = e.splitType || "equal";

      grouped[key] ||= [];
      grouped[key].push(e);
    });

    return grouped;
  }, [expenses, search, sortBy, groupBy]);

  if (loading || !group) {
    return (
      <Layout>
        <div className="container py-12 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const balances = calculateBalances(expenses, group.members);
  const settlements = calculateSettlements(balances);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const visibleCount = Object.values(groupedExpenses).reduce(
    (sum, list) => sum + list.length,
    0
  );
  /* ======================================================
     UI
  ====================================================== */
  return (
    <Layout>
      <div className="container py-6 space-y-6">
        {/* HEADER */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link to="/">
              <ArrowLeft />
            </Link>
          </Button>

          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">{group.name}</h1>
            <AvatarGroup names={group.members} max={4} />
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* EXPENSE LIST */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-12 gap-3 items-center">
                  {/* Search */}
                  <div className="col-span-12 sm:col-span-5 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      className="w-full pl-9 h-10 rounded-md border bg-background"
                      placeholder="Search expenses"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  {/* Group By */}
                  <div className="col-span-12 sm:col-span-3">
                    <SingleSelect
                      items={GROUP_BY_OPTIONS.map((m) => ({
                        id: m.value,
                        label: m.label,
                        icon: m.icon,
                      }))}
                      value={{ itemId: groupBy }}
                      onSelect={(_, itemId) => setGroupBy(itemId as any)}
                      placeholder="Group by"
                      label="Group by"
                    />
                  </div>

                  {/* Sort By */}
                  <div className="col-span-12 sm:col-span-4">
                    <SingleSelect
                      items={SORT_OPTIONS.map((m) => ({
                        id: m.value,
                        label: m.label,
                        icon: m.icon,
                      }))}
                      value={{ itemId: sortBy }}
                      onSelect={(_, itemId) => setSortBy(itemId as any)}
                      placeholder="Sort by"
                      label="Sort by"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expenses */}
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                {/* LEFT */}
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-primary" />
                    Expenses
                  </CardTitle>

                  {/* MOBILE */}
                  {isMobile ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Total{" "}
                        <span className="font-semibold text-foreground">
                          {formatCurrency(totalExpenses, group.currency)}
                        </span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {expenses.length} expenses
                      </p>
                    </>
                  ) : (
                    /* DESKTOP */
                    <p className="text-sm text-muted-foreground inline-flex items-center gap-1 whitespace-nowrap">
                      <span>Total</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(totalExpenses, group.currency)}
                      </span>
                      <span className="opacity-60">·</span>
                      <span>{expenses.length} expenses</span>
                    </p>
                  )}
                </div>

                {/* RIGHT */}
                <Button asChild size="sm" className="shrink-0">
                  <Link to={`/group/${groupId}/add-expense`}>
                    <Plus className="w-4 h-4" />
                    Add
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {search && visibleCount > 0 && (
                  <div className="px-4 py-2 text-sm text-muted-foreground border-b">
                    Showing{" "}
                    <span className="font-medium text-foreground">
                      {visibleCount}
                    </span>{" "}
                    expense{visibleCount !== 1 && "s"} for{" "}
                    <span className="font-medium text-foreground">
                      “{search}”
                    </span>
                    <button
                      className="ml-2 underline text-xs"
                      onClick={() => setSearch("")}
                    >
                      Clear
                    </button>
                  </div>
                )}
                {/* ✅ EMPTY search result */}
                {Object.keys(groupedExpenses).length === 0 && search && (
                  <div className="py-[4rem] flex flex-col items-center justify-center text-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                      <Search className="w-6 h-6 text-muted-foreground" />
                    </div>

                    <div>
                      <p className="font-medium text-foreground">
                        No expenses found
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Try a different keyword or clear your search
                      </p>
                    </div>

                    {search && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearch("")}
                      >
                        Clear search
                      </Button>
                    )}
                  </div>
                )}
                {/* 🟢 EMPTY GROUP STATE */}
                {!expenses?.length && !search && (
                  <div className="py-[4rem] flex flex-col items-center justify-center text-center gap-5">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Wallet className="w-7 h-7 text-primary" />
                    </div>

                    <div className="space-y-1">
                      <p className="font-semibold text-lg text-foreground">
                        No expenses yet
                      </p>
                      <p className="text-sm text-muted-foreground max-w-xs">
                        Start adding expenses to track who paid, who owes, and settle up easily.
                      </p>
                    </div>

                    <Button asChild size="sm" className="shrink-0">
                      <Link to={`/group/${groupId}/add-expense`}>
                        <Plus className="w-4 h-4" />
                        Add first expense
                      </Link>
                    </Button>
                  </div>
                )}


                {/* ✅ GROUPED LIST */}
                {Object.entries(groupedExpenses).map(([title, list]) => {
                  const isOpen = expandedGroups[title] ?? true;
                  const groupTotal = getGroupTotal(list);

                  return (
                    <div key={title} className="relative">
                      {/* ✅ STICKY GROUP HEADER */}
                      <div className="sticky top-[64px] z-10 bg-background">
                        <button
                          onClick={() =>
                            setExpandedGroups((p) => ({
                              ...p,
                              [title]: !isOpen,
                            }))
                          }
                          className="w-full flex items-center justify-between px-4 py-3 border-b hover:bg-muted/40 transition"
                        >
                          <div className="flex items-center gap-2">
                            {isOpen ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            <div className="text-left">
                              <p className="font-semibold">
                                {shouldTitleCase ? toTitleCase(title) : title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {list.length} expenses
                              </p>
                            </div>
                          </div>

                          <span className="font-semibold">
                            {formatCurrency(groupTotal, group.currency)}
                          </span>
                        </button>
                      </div>

                      {/* ✅ EXPENSE ITEMS */}
                      {isOpen &&
                        list.map((expense, index) => {
                          const IconComponent = getCategoryIcon(
                            expense.category as CategoryKey,
                            expense.subcategory
                          );

                          const categoryColor =
                            EXPENSE_CATEGORIES[
                              expense.category as CategoryKey
                            ]?.color || "category-uncategorized";

                          return (
                            <motion.div
                              key={expense.id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.03 }}
                              className="p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex gap-3">
                                {/* LEFT */}
                                <div className="flex gap-3 min-w-0 flex-1">
                                  {/* Category Icon */}
                                  <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                    style={{
                                      backgroundColor: `hsl(var(--${categoryColor}) / 0.15)`,
                                    }}
                                  >
                                    <IconComponent
                                      className="w-5 h-5"
                                      style={{
                                        color: `hsl(var(--${categoryColor}))`,
                                      }}
                                    />
                                  </div>

                                  {/* Text + Participants */}
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium truncate">
                                      {expense.description}
                                    </p>

                                    <AvatarGroup
                                      names={expense.participants}
                                      max={4}
                                      size="sm"
                                      className="mt-1"
                                      showBelow={isMobile}
                                    />

                                    {/* MOBILE META */}
                                    <div className="flex items-center gap-2 mt-2 sm:hidden">
                                      <p className="font-semibold">
                                        {formatCurrency(
                                          expense.amount,
                                          expense.currency
                                        )}
                                      </p>
                                      <UserAvatar
                                        name={expense.paidBy}
                                        size="xs"
                                        aria-label={`Paid by ${expense.paidBy}`}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* DESKTOP META */}
                                <div className="hidden sm:flex flex-col items-end justify-center min-w-[80px]">
                                  <p className="font-semibold">
                                    {formatCurrency(
                                      expense.amount,
                                      expense.currency
                                    )}
                                  </p>

                                  <UserAvatar
                                    name={expense.paidBy}
                                    size="xs"
                                    aria-label={`Paid by ${expense.paidBy}`}
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                    </div>
                  );
                })}
              </CardContent>

            </Card>
          </div>

          {/* INSIGHTS – SCROLL AFTER EXPENSES ON MOBILE */}
          <div className="space-y-4 order-2 lg:order-none">
            {/* Balances */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  Balances
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.members.map((m) => {
                  const bal = balances[m];
                  return (
                    <div key={m} className="flex justify-between items-center">
                      <div className="flex items-center gap-2 min-w-0">
                        <UserAvatar name={m} size="sm" />
                        <span className="truncate">{m}</span>
                      </div>
                      <span
                        className={`font-semibold ${bal > 0
                          ? "text-success"
                          : bal < 0
                            ? "text-destructive"
                            : "text-muted-foreground"
                          }`}
                      >
                        {bal > 0 ? "+" : ""}
                        {formatCurrency(bal, group.currency)}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Settle Up */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRight className="w-5 h-5 text-secondary" />
                  Settle Up
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* 🚫 NO EXPENSES YET */}
                {expenses.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center">
                    Add expenses to see who owes whom
                  </p>
                )}

                {/* ✅ EXPENSES EXIST BUT ALL SETTLED */}
                {expenses.length > 0 && settlements.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center">
                    All settled 🎉
                  </p>
                )}

                {settlements.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-muted/50 rounded-xl p-3"
                  >
                    <div className="flex items-center gap-2">
                      <UserAvatar name={s.from} size="sm" />
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <UserAvatar name={s.to} size="sm" />
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(s.amount, group.currency)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout >
  );
}
