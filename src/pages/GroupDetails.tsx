"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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
  ChevronUp,
  Download,
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
  addExpense,
  deleteExpense,
  ExpenseRequest,
  GroupDashboardInterface,
  loadGroupDetails,
  UserInterface,
} from "@/lib/storage";
import { SingleSelect } from "@/components/ui/single-select";
import { toTitleCase } from "@/components/ui/formatters";
import { toast } from "@/hooks/use-toast";
import { getEncryptedItem, setEncryptedItem } from "@/lib/localStorage";
import { ADMIN_BASE_PATH, LOCAL_GROUPS_KEY } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ActionMenu } from "@/components/ui/action-menu";
import { SmartTooltip } from "@/components/ui/smartTooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

type GroupByValue = (typeof GROUP_BY_OPTIONS)[number]["value"];
type SortByValue = (typeof SORT_OPTIONS)[number]["value"];

/* ======================================================
   UTILS – MOVE TO UTILS FILE LATER
====================================================== */
function calculateShare(
  expense: GroupDashboardInterface["expenses"][number],
  userId: string
): number {
  const participant = expense.participants.find(
    (p) => p.user.id === userId
  );
  if (!participant) return 0;

  const amount = Number(participant.amount);
  return Number.isNaN(amount) ? 0 : amount;
}

function getExpensePayers(
  expense: GroupDashboardInterface["expenses"][number]
): UserInterface[] {
  if (expense.payers?.length) {
    return expense.payers
      .map((payer) => payer.user)
      .filter((payer): payer is UserInterface => !!payer);
  }

  return expense.paidBy ? [expense.paidBy] : [];
}

function getExpensePaidByLabel(
  expense: GroupDashboardInterface["expenses"][number]
) {
  const payerNames = getExpensePayers(expense).map((payer) => payer.name);

  if (payerNames.length === 0) return "Unknown payer";
  if (payerNames.length === 1) return payerNames[0];
  return `${payerNames.length} people`;
}

function calculateBalances(
  expenses: GroupDashboardInterface["expenses"],
  members: UserInterface[]
) {
  const balances: Record<string, number> = {};

  members.forEach((m) => {
    balances[m.id] = 0;
  });

  expenses.forEach((expense) => {
    expense.participants.forEach((p) => {
      const pId = p.user.id;
      if (balances[pId] === undefined) {
        balances[pId] = 0;
      }
      balances[pId] -= calculateShare(expense, pId);
    });

    if (expense.payers?.length) {
      expense.payers.forEach((payer) => {
        const payerId = payer.user?.id;
        if (!payerId) return;

        if (balances[payerId] === undefined) {
          balances[payerId] = 0;
        }

        balances[payerId] += Number(payer.amount) || 0;
      });
      return;
    }

    const payerId = expense.paidBy?.id;
    if (!payerId) return;

    if (balances[payerId] === undefined) {
      balances[payerId] = 0;
    }

    balances[payerId] += expense.amount;
  });

  Object.keys(balances).forEach((key) => {
    balances[key] = Math.round(balances[key] * 100) / 100;
  });

  return balances;
}

function calculateSettlements(
  balances: Record<string, number>,
  members: UserInterface[]
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

  let i = 0;
  let j = 0;

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


function getGroupTotal(expenses: GroupDashboardInterface["expenses"]) {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

function escapeCsvCell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function slugifyFilename(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "group";
}

function formatExportDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
}

function buildExpensesCsv(
  group: GroupDashboardInterface["group"],
  expenses: GroupDashboardInterface["expenses"],
  balances: Record<string, number>
) {
  const headers: Array<string | number> = [
    "Date",
    "Description",
    "Category",
    "Cost",
    "Currency",
    ...group.members.map((member) => member.name),
  ];

  const memberMeaningRow: Array<string | number> = [
    "",
    "",
    "",
    "",
    "",
    ...group.members.map(() => "Net amount (+ gets back, - owes)"),
  ];

  const rows = expenses.map((expense) => {
    const memberValues = group.members.map((member) => {
      let net = 0;

      if (expense.payers?.length) {
        const payer = expense.payers.find((item) => item.user?.id === member.id);
        net += Number(payer?.amount ?? 0);
      } else if (expense.paidBy?.id === member.id) {
        net += Number(expense.amount) || 0;
      }

      const participant = expense.participants.find(
        (item) => item.user.id === member.id
      );
      net -= Number(participant?.amount ?? 0);

      return Math.round(net * 100) / 100;
    });

    return [
      formatExportDate(expense.date),
      expense.description,
      toTitleCase(expense.category.replace(/_/g, " ")),
      expense.amount,
      expense.currency || group.currency,
      ...memberValues,
    ];
  });

  const totalBalanceRow: Array<string | number> = [
    formatExportDate(new Date()),
    "Total balance",
    "",
    "",
    group.currency,
    ...group.members.map((member) => Math.round((balances[member.id] ?? 0) * 100) / 100),
  ];

  return [headers, memberMeaningRow, ...rows, [], totalBalanceRow]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\r\n");
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
export default function GroupResponsesPage({
  groupId,
  isAdminView = false,
}: {
  groupId: string;
  isAdminView?: boolean;
}) {
  const [group, setGroup] = useState<GroupDashboardInterface["group"] | null>(null);
  const [expenses, setExpenses] = useState<GroupDashboardInterface["expenses"]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "chart">("list");
  // UI state
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] =
    useState<GroupByValue>("date");
  const [sortBy, setSortBy] =
    useState<SortByValue>("date_desc");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {}
  );
  const shouldTitleCase = groupBy === "category" || groupBy === "splitType";
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [openRow, setOpenRow] = useState<number | null>(null);
  const [settlingIndex, setSettlingIndex] = useState<number | null>(null);
  const [settleConfirmation, setSettleConfirmation] = useState<{
    settlement: ReturnType<typeof calculateSettlements>[number];
    index: number;
  } | null>(null);

  const handleDelete = async (expenseId: string) => {
    try {
      setIsDeleting(expenseId);
      await deleteExpense(expenseId);
      const details = await loadGroupDetails(groupId!);
      setExpenses(details?.expenses || []);
    } catch (error) {
      // toast.error("Failed to delete expense");
    } finally {
      setIsDeleting(null);
    }
  };
  useEffect(() => {
    if (!groupId) return;
    setLoading(true);

    loadGroupDetails(groupId)
      .then((details) => {
        if (!details) return;

        setGroup(details.group);
        setExpenses(details.expenses || []);
        if (!isAdminView) {
          const existingGroups = getEncryptedItem<string[]>(LOCAL_GROUPS_KEY, []);
          const updatedGroups = Array.from(
            new Set([groupId, ...existingGroups])
          );
          setEncryptedItem(LOCAL_GROUPS_KEY, updatedGroups);
        }
      })
      .finally(() => setLoading(false));
  }, [groupId, isAdminView]);

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
          getExpensePaidByLabel(e).toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.subcategory.toLowerCase().includes(q) ||
          e.amount.toString().includes(q) ||
          e.participants.some((p) => {
            const name = memberMap.get(p.user.id);
            return name?.toLowerCase().includes(q);
          })
      );
    }

    if (sortBy === "date_desc") {
      list.sort((a, b) => {
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }

        return (
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
        );
      });


    } else if (sortBy === "amount_desc") {
      list.sort((a, b) => b.amount - a.amount);
    } else {
      list.sort((a, b) => a.amount - b.amount);
    }

    const grouped: Record<string, GroupDashboardInterface["expenses"]> = {};
    list.forEach((e) => {
      let key = "";
      if (groupBy === "date")
        key = e.date
          ? e.date
          : String(e.date);
      if (groupBy === "paidBy") key = getExpensePaidByLabel(e);
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
  }, [groupedExpenses, shouldTitleCase]);
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  if (loading) {
    return <GroupResponsesSkeleton />;
  }

  if (!group) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">Group not found</p>
          <Button asChild className="mt-4">
            <Link href="/">Go Home</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const balances = calculateBalances(expenses, group.members);
  const settlements = calculateSettlements(balances, group.members);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const visibleCount = Object.values(groupedExpenses).reduce(
    (sum, list) => sum + list.length,
    0
  );

  const shareLink = `${typeof window !== "undefined" ? window.location.origin : ""}/group/${groupId}`;

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

  const handleExportExpenses = () => {
    const exportExpenses = Object.values(groupedExpenses).flat();

    if (!exportExpenses.length) {
      toast({
        title: "Nothing to export",
        description: search
          ? "No expenses match the current search."
          : "Add an expense before exporting.",
      });
      return;
    }

    const exportBalances = calculateBalances(exportExpenses, group.members);
    const csv = buildExpensesCsv(group, exportExpenses, exportBalances);
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];

    link.href = url;
    link.download = `${slugifyFilename(group.name)}-expenses-${today}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    toast({
      title: "Export ready",
      description: `${exportExpenses.length} expense${exportExpenses.length === 1 ? "" : "s"} exported.`,
    });
  };

  const handleSettle = async (
    setlementData: ReturnType<typeof calculateSettlements>[number],
    index: number
  ) => {
    try {
      setSettlingIndex(index);
      const data: ExpenseRequest = {
        description: `Settlement between ${setlementData.fromName} and ${setlementData.toName}`,
        category: "settlement",
        subcategory: "settle_up",
        amount: setlementData.amount,
        currency: group.currency,
        paidByUserId: setlementData.fromId,
        splitType: "equal",
        date: new Date().toISOString().split("T")[0],
        participants: [
          {
            userId: setlementData.toId,
            amount: setlementData.amount,
            percent: null
          }
        ]
      }
      await addExpense(groupId!, data);
      const details = await loadGroupDetails(groupId!);
      setExpenses(details?.expenses || []);
    } catch (error) {
      // toast.error("Failed to delete expense");
    } finally {
      setSettlingIndex(null);
    }
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
            <Link href={isAdminView ? ADMIN_BASE_PATH : "/"}>
              <ArrowLeft />
            </Link>
          </Button>

          {/* Middle content takes remaining space */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center">
              <SmartTooltip text={group.name} className="text-2xl font-bold" />
            </div>
            <AvatarGroup names={group.members.map((m) => m.name)} />
          </div>

          {/* Right aligned */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/group/${groupId}/edit`}>
                <Pencil className="w-4 h-4" />
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => copyLink("link")}>
              <Share2 className="w-4 h-4" />
            </Button>
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
                      className="w-full pl-9 h-10 rounded-md border bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                      onSelect={(_, itemId) => setGroupBy(itemId as GroupByValue)}
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
                      onSelect={(_, itemId) => setSortBy(itemId as SortByValue)}
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
                        "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
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
                        "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        viewMode === "chart"
                          ? "bg-background shadow text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Chart</span>
                    </button>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExportExpenses}
                    disabled={!expenses.length}
                    title="Export expenses"
                    className="h-auto px-0"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>

                  {/* Add Button */}
                  <Button asChild size="sm">
                    <Link href={`/group/${groupId}/add-expense`}>
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
                  <div className="py-[4rem] px-2 flex flex-col items-center justify-center text-center gap-4">
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
                  <div className="py-[4rem] px-2 flex flex-col items-center justify-center text-center gap-5">
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
                      <Link href={`/group/${groupId}/add-expense`}>
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
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {isOpen ? (
                                  <ChevronDown className="w-4 h-4 shrink-0" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 shrink-0" />
                                )}

                                <div className="text-left min-w-0 flex-1">
                                  <div
                                    className="font-semibold truncate"
                                  >
                                    {shouldTitleCase ? toTitleCase(title) : title}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {list.length} expenses
                                  </p>
                                </div>
                              </div>

                              <span className="font-semibold shrink-0 ml-2">
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

                                  <div className="absolute right-4 top-4">
                                    <ActionMenu
                                      editHref={`/group/${groupId}/edit-expense/${expense.id}`}
                                      onDelete={() => handleDelete(expense.id)}
                                      isDeleting={isDeleting === expense.id}
                                      deleteTitle="Delete expense?"
                                      deleteDescription="Are you sure you want to delete this expense?"
                                      stopPropagation
                                    />
                                  </div>

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
                                        <SmartTooltip text={expense.description} />
                                      </div>

                                      {/* PAID BY */}
                                      <div className="text-xs md:text-base text-muted-foreground mt-0.5 flex items-center gap-1">
                                        <SmartTooltip text={getExpensePaidByLabel(expense)} />
                                        <span className="shrink-0">paid</span>
                                      </div>


                                      {/* PARTICIPANTS */}
                                      <AvatarGroup
                                        names={expense.participants
                                          .map(p => p.user)          // get the user object
                                          .filter((u): u is UserInterface => !!u) // type guard to remove null/undefined
                                          .map(u => u.name)           // map to name
                                        }
                                        className="mt-2"
                                        label=""
                                      />

                                    </div>

                                    {/* AMOUNT */}
                                    <div className="flex flex-col items-end justify-center shrink-0">
                                      <p className="font-semibold whitespace-nowrap text-sm mb-[12px]">
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
                          className="flex justify-between items-center p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors my-2"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: COLORS[i % COLORS.length] }}
                            />
                            {/* <span className="text-sm font-medium truncate">{item.name}</span> */}
                            <SmartTooltip text={item.name} />
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
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
          <div className="space-y-4 order-2 lg:order-none sticky top-[80px] self-start">
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
                        <SmartTooltip text={m.name} />
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

                {/* ✅ SETTLEMENTS */}
                {settlements.map((s, i) => {
                  const isOpen = openRow === i;
                  const isLoading = settlingIndex === i;

                  return (
                    <div key={i} className="border-b last:border-b-0">
                      {/* ROW */}
                      <div className="flex items-start justify-between gap-3 py-2">
                        <div className="flex-1 min-w-0 text-sm leading-snug break-words">
                          <span>{s.fromName}</span>{" "}
                          <span className="font-semibold">pays</span>{" "}
                          <span>{s.toName}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm whitespace-nowrap">
                            {formatCurrency(s.amount, group.currency)}
                          </span>

                          <button
                            onClick={() => setOpenRow(isOpen ? null : i)}
                            className="p-1 rounded-md hover:bg-muted transition"
                          >
                            {isOpen ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* TOGGLED ACTION */}
                      {isOpen && (
                        <div className="flex justify-center pb-2">
                          <button
                            disabled={isLoading}
                            onClick={() =>
                              setSettleConfirmation({ settlement: s, index: i })
                            }
                            className={`
              text-sm font-medium px-4 py-2 rounded-sm
              bg-primary/10 text-primary
              hover:bg-primary/20 transition
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center gap-2
            `}
                          >
                            {isLoading && (
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            )}
                            {isLoading ? "Settling…" : "Settle up"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

              </CardContent>
            </Card>

            <AlertDialog
              open={settleConfirmation !== null}
              onOpenChange={(open) => {
                if (!open) setSettleConfirmation(null);
              }}
            >
              <AlertDialogContent className="max-w-[310px] rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-lg">
                    Record this settlement?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-xs">
                    {settleConfirmation
                      ? `This will mark that ${settleConfirmation.settlement.fromName} paid ${settleConfirmation.settlement.toName} ${formatCurrency(settleConfirmation.settlement.amount, group.currency)} by adding a settlement entry to the group.`
                      : ""}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-row gap-2 mt-4">
                  <AlertDialogCancel className="flex-1 mt-0 rounded-xl border-none bg-muted hover:bg-muted/80">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (!settleConfirmation) return;
                      handleSettle(
                        settleConfirmation.settlement,
                        settleConfirmation.index
                      );
                    }}
                    disabled={
                      settleConfirmation
                        ? settlingIndex === settleConfirmation.index
                        : false
                    }
                    className="flex-1 rounded-xl"
                  >
                    Yes, settle up
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

          </div>
        </div>
      </div>
    </Layout >
  );
}
