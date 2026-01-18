import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import {
  ArrowLeft,
  Plus,
  ArrowRight,
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
  Share2,
  Pencil,
  List,
  LayoutDashboard,
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
  GroupResponse,
  loadGroupDetails,
} from "@/lib/storage";
import { SingleSelect } from "@/components/ui/single-select";
import { toTitleCase } from "@/components/ui/formatters";
import { toast } from "@/hooks/use-toast";
import { getEncryptedItem, setEncryptedItem } from "@/lib/localstorage";
import { LOCAL_GROUPS_KEY } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
function calculateShare(
  expense: GroupResponse["expenses"][number],
  userId: string
): number {
  // Equal split – divide evenly among participants
  if (expense.splitType === "equal") {
    if (!expense.participants.some((p) => p.id === userId)) return 0;
    return expense.amount / Math.max(expense.participants.length, 1);
  }

  // Custom / percentage splits – look up by participant id
  const participant = expense.participants?.find((p) => p.id === userId);
  if (!participant) return 0;

  const amount = Number(participant.amount ?? 0);
  if (Number.isNaN(amount)) return 0;
  return amount;
}

function calculateBalances(
  expenses: GroupResponse["expenses"],
  members: GroupResponse["members"]
) {
  const balances: Record<string, number> = {};

  // Initialize balances for all members by userId
  members.forEach((m) => {
    balances[m.id] = 0;
  });

  expenses.forEach((expense) => {
    // Ensure payer is in balances map
    if (balances[expense.paidBy.id] === undefined) {
      balances[expense.paidBy.id] = 0;
    }

    expense.participants.forEach((p) => {
      if (balances[p.id] === undefined) {
        balances[p.id] = 0;
      }
      balances[p.id] -= calculateShare(expense, p.id);
    });

    balances[expense.paidBy.id] += expense.amount;
  });

  return balances;
}

function calculateSettlements(
  balances: Record<string, number>,
  members: GroupResponse["members"]
) {
  const settlements: {
    fromId: string;
    toId: string;
    fromName: string;
    toName: string;
    amount: number;
  }[] = [];

  const memberById = members.reduce<Record<string, { id: string; name: string }>>(
    (acc, m) => {
      acc[m.id] = { id: m.id, name: m.name };
      return acc;
    },
    {}
  );

  const debtors = Object.entries(balances)
    .filter(([, b]) => b < -0.01)
    .map(([id, balance]) => ({ id, balance }))
    .sort((a, b) => a.balance - b.balance);

  const creditors = Object.entries(balances)
    .filter(([, b]) => b > 0.01)
    .map(([id, balance]) => ({ id, balance }))
    .sort((a, b) => b.balance - a.balance);

  let i = 0,
    j = 0;

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(-debtors[i].balance, creditors[j].balance);

    settlements.push({
      fromId: debtors[i].id,
      toId: creditors[j].id,
      fromName: memberById[debtors[i].id]?.name ?? debtors[i].id,
      toName: memberById[creditors[j].id]?.name ?? creditors[j].id,
      amount: Math.round(amount * 100) / 100,
    });

    debtors[i].balance += amount;
    creditors[j].balance -= amount;

    if (Math.abs(debtors[i].balance) < 0.01) i++;
    if (Math.abs(creditors[j].balance) < 0.01) j++;
  }

  return settlements;
}

function getGroupTotal(expenses: GroupResponse["expenses"]) {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

function GroupResponsesSkeleton() {
  return (
    <Layout>
      <div className="container py-6 space-y-6">
        {/* HEADER */}
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-md" />

          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>

          <Skeleton className="w-9 h-9 rounded-md" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filters */}
            <div className="border rounded-lg p-4 space-y-3">
              <Skeleton className="h-10 w-full" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>

            {/* Expense list */}
            <div className="border rounded-lg">
              <div className="p-4 flex justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-9 w-20" />
              </div>

              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="flex gap-3 p-4 border-t items-center"
                >
                  <Skeleton className="w-10 h-10 rounded-xl" />

                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-5 w-32" />
                  </div>

                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-4">
            {/* Balances */}
            <div className="border rounded-lg p-4 space-y-3">
              <Skeleton className="h-5 w-32" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>

            {/* Settlements */}
            <div className="border rounded-lg p-4 space-y-3">
              <Skeleton className="h-5 w-40" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

/* ======================================================
   COMPONENT
====================================================== */
export default function GroupResponsesPage() {
  const { groupId } = useParams();
  const [group, setGroup] = useState<GroupResponse | null>(null);
  const [expenses, setExpenses] = useState<GroupResponse["expenses"]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "chart">("list");
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

    loadGroupDetails(groupId)
      .then((details) => {
        if (!details) return;

        setGroup(details);
        setExpenses(details.expenses || []);
        const existingGroups = getEncryptedItem<string[]>(LOCAL_GROUPS_KEY, []);
        const updatedGroups = Array.from(
          new Set([groupId, ...existingGroups])
        );
        setEncryptedItem(LOCAL_GROUPS_KEY, updatedGroups);
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
      const memberMap = group ? new Map(group.members.map(m => [m.id, m.name])) : new Map();
      list = list.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.paidBy.name.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.subcategory.toLowerCase().includes(q) ||
          e.amount.toString().includes(q) ||
          e.participants.some((p) => {
            const name = memberMap.get(p.id);
            return name?.toLowerCase().includes(q);
          })
      );
    }

    if (sortBy === "date_desc") {
      list.sort((a, b) => +new Date(b.date) - +new Date(a.date));
    } else if (sortBy === "amount_desc") {
      list.sort((a, b) => b.amount - a.amount);
    } else {
      list.sort((a, b) => a.amount - b.amount);
    }

    const grouped: Record<string, GroupResponse["expenses"]> = {};
    list.forEach((e) => {
      let key = "";
      if (groupBy === "date")
        key = e.date
          ? e.date
          : String(e.date);
      if (groupBy === "paidBy") key = e.paidBy.name;
      if (groupBy === "category") key = e.category;
      if (groupBy === "splitType") key = e.splitType || "equal";

      grouped[key] ||= [];
      grouped[key].push(e);
    });

    return grouped;
  }, [expenses, search, sortBy, groupBy, group]);

  const chartData = useMemo(() => {
    return Object.entries(groupedExpenses).map(([key, list]) => {
      // Format the label based on the grouping type
      let name = key;
      name = shouldTitleCase ? toTitleCase(key) : key;

      const value = list.reduce((sum, e) => sum + e.amount, 0);

      return { name, value };
    });
  }, [groupedExpenses, groupBy, shouldTitleCase]);
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  if (loading || !group) {
    return <GroupResponsesSkeleton />;
  }

  const balances = calculateBalances(expenses, group.members);
  const settlements = calculateSettlements(balances, group.members);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const visibleCount = Object.values(groupedExpenses).reduce(
    (sum, list) => sum + list.length,
    0
  );

  const shareLink = `${window.location.origin}/group/${groupId}`;

  type CopyType = "settlement" | "link";

  const copyLink = async (type: CopyType) => {
    let textToCopy = "";
    let description = "";

    switch (type) {
      case "settlement":
        textToCopy = getSettlementText();
        description = "Settlement summary copied";
        break;
      case "link":
        textToCopy = shareLink;
        description = "Share this link with your group members";
        break;
      default:
        textToCopy = shareLink;
        description = "Share this link with your group members";
    }

    await navigator.clipboard.writeText(textToCopy);
    toast({
      title: "Copied!",
      description,
    });

  };


  const getSettlementText = () => {
    if (settlements.length === 0) return "";

    const lines = settlements.map(
      (s) =>
        `${s.fromName} pays ${s.toName} ${formatCurrency(
          s.amount,
          group.currency
        )}`
    );

    return `
Settlement Summary

${lines.join("\n")}

View full details here:
${shareLink}
  `.trim();
  };


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

          {/* Middle content takes remaining space */}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold truncate">{group.name}</h1>
            <AvatarGroup names={group.members.map((m) => m.name)} />
          </div>

          {/* Right aligned */}
          <Button variant="outline" size="sm" onClick={() => copyLink("link")}>
            <Share2 className="w-4 h-4" />
          </Button>
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

                  <p className="text-sm text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:gap-1">
                    <span>
                      Total{" "}
                      <span className="font-semibold text-foreground">
                        {formatCurrency(totalExpenses, group.currency)}
                      </span>
                    </span>

                    <span className="hidden sm:inline opacity-60">·</span>

                    <span>{expenses.length} expenses</span>
                  </p>

                </div>

                {/* RIGHT */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* View Toggle */}
                  <div className="flex items-center rounded-lg border bg-muted p-0.5">
                    <button
                      onClick={() => setViewMode("list")}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition",
                        viewMode === "list"
                          ? "bg-background shadow text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <List className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">List</span>
                    </button>

                    <button
                      onClick={() => setViewMode("chart")}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition",
                        viewMode === "chart"
                          ? "bg-background shadow text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Chart</span>
                    </button>
                  </div>

                  {/* Add Button */}
                  <Button asChild size="sm">
                    <Link to={`/group/${groupId}/add-expense`}>
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Add</span>
                    </Link>
                  </Button>
                </div>

              </CardHeader>
              <CardContent className="p-0">
                {search && visibleCount > 0 && (
                  <div className="px-4 py-2 text-sm text-muted-foreground">
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
                {viewMode === "list" ? (
                  <>
                    {/* ✅ GROUPED LIST  */}
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
                                  className="group relative p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                                >
                                  {/* ✏️ EDIT ICON */}
                                  <Link to={`/group/${groupId}/edit-expense/${expense.id}`}>
                                    <button
                                      // onClick={() => onEditExpense(expense)}
                                      className="absolute right-4 top-4 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition text-muted-foreground hover:text-foreground"
                                      aria-label="Edit expense"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                  </Link>


                                  <div className="flex gap-3">
                                    {/* CATEGORY ICON */}
                                    <div
                                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                      style={{
                                        backgroundColor: `hsl(var(--${categoryColor}) / 0.15)`,
                                      }}
                                    >
                                      <IconComponent
                                        className="w-5 h-5"
                                        style={{ color: `hsl(var(--${categoryColor}))` }}
                                      />
                                    </div>

                                    {/* CONTENT */}
                                    <div className="min-w-0 flex-1">
                                      {/* DESCRIPTION + MOBILE EDIT */}
                                      <div className="flex items-center gap-2">
                                        <p className="font-medium truncate flex-1">
                                          {expense.description}
                                        </p>

                                      </div>

                                      {/* PAID BY */}
                                      <p className="text-xs md:text-base text-muted-foreground truncate mt-0.5">
                                        {expense.paidBy.name} paid
                                      </p>

                                      {/* PARTICIPANTS */}
                                      <AvatarGroup
                                        names={expense.participants.map((p) => {
                                          const member = group.members.find(m => m.id === p.id);
                                          return member?.name || "";
                                        }).filter(Boolean)}
                                        className="mt-2"
                                        label=""
                                      />
                                    </div>

                                    {/* AMOUNT */}
                                    <div className="flex flex-col items-end justify-center shrink-0">
                                      <p className="font-semibold whitespace-nowrap">
                                        {formatCurrency(
                                          expense.amount,
                                          expense.currency
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </motion.div>

                              );
                            })}
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="flex flex-col lg:flex-row lg:items-center gap-2">

                    {/* THE CHART CONTAINER */}
                    <div className="h-[200px] w-full lg:w-1/2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            animationDuration={750}
                          >
                            {chartData.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                                stroke="transparent"
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => formatCurrency(value, group.currency)}
                            contentStyle={{
                              borderRadius: '8px',
                              border: 'none',
                              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* DYNAMIC LEGEND TABLE */}
                    <div className="grid grid-cols-1 gap-2 w-full lg:w-1/2 px-[10px] sm:px-0">
                      {chartData.map((item, i) => (
                        <div
                          key={item.name}
                          className="flex justify-between items-center p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: COLORS[i % COLORS.length] }}
                            />
                            <span className="text-sm font-medium truncate">{item.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold">
                              {formatCurrency(item.value, group.currency)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {((item.value / totalExpenses) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
              <CardContent className="space-y-3 max-h-[17rem] overflow-y-auto">
                {group.members.map((m) => {
                  const bal = balances[m.id];
                  return (
                    <div key={m.id} className="flex justify-between items-center">
                      <div className="flex items-center gap-2 min-w-0">
                        <UserAvatar name={m.name} />
                        <span className="truncate text-sm">{m.name}</span>
                      </div>
                      <span
                        className={`font-semibold text-sm flex-shrink-0 ${bal > 0
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
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ArrowRight className="w-5 h-5 text-secondary" />
                  Who pays whom
                </CardTitle>

                {(expenses.length > 0 || settlements.length > 0) && (
                  <button
                    onClick={() => copyLink("settlement")}
                    className="p-2 rounded-md hover:bg-muted transition"
                    title="Copy settlement summary"
                  >
                    <Share2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </CardHeader>

              <CardContent className="space-y-3 max-h-[16rem] overflow-y-auto">
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
                    className="flex items-start justify-between gap-3 border-b last:border-b-0 pb-2"
                  >
                    {/* LEFT: Full name, wraps naturally */}
                    <div className="flex-1 min-w-0 text-sm leading-snug break-words">
                      <span>{s.fromName}</span>{" "}
                      <span className="font-semibold">pays</span>{" "}
                      <span>{s.toName}</span>
                    </div>

                    {/* RIGHT: Amount (never wraps) */}
                    <span className="font-semibold text-sm whitespace-nowrap">
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
