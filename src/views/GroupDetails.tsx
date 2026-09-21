"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import NextLink from "next/link";
import { Link } from "@/i18n/navigation";
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

import { MobileGroupDashboard } from "@/components/group/MobileGroupDashboard";
import { MobileGroupDashboardSkeleton } from "@/components/group/MobileGroupDashboardSkeleton";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar, AvatarGroup } from "@/components/ui/UserAvatar";
import { formatCurrency } from "@/lib/avatar-utils";
import type { CategoryKey } from "@/components/icons/CategoryIcons";
import { ExpenseListCategoryIcon } from "@/components/expense/ExpenseListCategoryIcon";
import {
  expenseHasAttachment,
  getExpensePaidByLabel,
  getExpensePayers,
  memberDisplayNameForViewer,
  memberLabelWithYouSuffix,
} from "@/lib/groupExpenseLabels";
import {
  clearGroupViewerMemberId,
  getGroupViewerMemberId,
  setGroupViewerMemberId,
} from "@/lib/groupViewer";
import {
  addExpense,
  ExpenseRequest,
  GroupDashboardInterface,
  UserInterface,
} from "@/lib/storage";
import { useGroupDashboard } from "@/lib/groupExpenseData";
import { useAttachmentUploadCompletion } from "@/lib/attachmentUploads";
import { SingleSelect } from "@/components/ui/single-select";
import { formatExpenseGroupHeaderTitle, toTitleCase } from "@/components/ui/formatters";
import { resolveCategoryDisplayLabel } from "@/lib/category-labels";
import { shareOrCopy } from "@/lib/shareContent";
import { isMobileViewportWidth, useDeviceType } from "@/hooks/useDeviceType";
import { toast } from "@/hooks/use-toast";
import { getEncryptedItem, setEncryptedItem } from "@/lib/localStorage";
import { ADMIN_BASE_PATH, LOCAL_GROUPS_KEY } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SmartTooltip } from "@/components/ui/smartTooltip";
import { GenericAlertDialog } from "@/components/ui/generic-alert-dialog";

function ChartLoadingPlaceholder() {
  const tCommon = useTranslations("common");
  return (
    <div className="h-[200px] w-full flex items-center justify-center text-sm text-muted-foreground">
      {tCommon("loadingChart")}
    </div>
  );
}

// Recharts is ~100KB. Only load it when the user opens the chart view.
const ExpenseChart = dynamic(() => import("@/components/group/ExpenseChart"), {
  ssr: false,
  loading: () => <ChartLoadingPlaceholder />,
});

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

function calculateBalances(
  expenses: GroupDashboardInterface["expenses"],
  members: UserInterface[]
) {
  const balances: Record<string, number> = {};
  const EPS = 1e-9;
  const normalize = (value: number) => {
    if (!Number.isFinite(value)) return 0;
    if (Math.abs(value) < EPS) return 0;
    const rounded = Math.round(value * 100) / 100;
    return Object.is(rounded, -0) ? 0 : rounded;
  };

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
    balances[key] = normalize(balances[key]);
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

type CsvLabels = {
  date: string;
  description: string;
  category: string;
  cost: string;
  currency: string;
  netMeaning: string;
  totalBalance: string;
};

function buildExpensesCsv(
  group: GroupDashboardInterface["group"],
  expenses: GroupDashboardInterface["expenses"],
  balances: Record<string, number>,
  labels: CsvLabels
) {
  const headers: Array<string | number> = [
    labels.date,
    labels.description,
    labels.category,
    labels.cost,
    labels.currency,
    ...group.members.map((member) => member.name),
  ];

  const memberMeaningRow: Array<string | number> = [
    "",
    "",
    "",
    "",
    "",
    ...group.members.map(() => labels.netMeaning),
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
    labels.totalBalance,
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
      <div className="container space-y-5 py-5 sm:space-y-6 sm:py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-7 w-48 max-w-full sm:h-8" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Skeleton className="h-9 w-20 rounded-md" />
            <Skeleton className="h-9 w-20 rounded-md" />
            <Skeleton className="hidden h-9 w-28 rounded-md sm:block" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[4.5rem] rounded-xl sm:h-[4.75rem]" />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
  const t = useTranslations("groupDetails");
  const tGroup = useTranslations("group");
  const tCommon = useTranslations("common");
  const tCategories = useTranslations("categories");
  const resolveCategoryLabel = useCallback(
    (key: string) => resolveCategoryDisplayLabel(tCategories, key, toTitleCase(key.replace(/_/g, " "))),
    [tCategories]
  );
  const youLabel = tGroup("you");
  const { data: dashboard, loading, refresh } = useGroupDashboard(groupId);
  const attachmentUploadVersion = useAttachmentUploadCompletion(groupId);

  useEffect(() => {
    if (attachmentUploadVersion > 0) void refresh();
  }, [attachmentUploadVersion, refresh]);

  const groupByOptions = useMemo(
    () => [
      { value: "date" as const, label: t("groupByDate"), icon: Calendar },
      { value: "paidBy" as const, label: t("groupByPaidBy"), icon: User },
      { value: "category" as const, label: t("groupByCategory"), icon: Tag },
      { value: "splitType" as const, label: t("groupBySplitType"), icon: Split },
    ],
    [t]
  );

  const sortOptions = useMemo(
    () => [
      { value: "date_desc" as const, label: t("sortNewest"), icon: ArrowUpDown },
      { value: "amount_desc" as const, label: t("sortHighest"), icon: ArrowDown },
      { value: "amount_asc" as const, label: t("sortLowest"), icon: ArrowUp },
    ],
    [t]
  );

  const group = dashboard?.group ?? null;
  const expenses = dashboard?.expenses ?? [];

  const [viewerMemberId, setViewerMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return;
    let id = getGroupViewerMemberId(groupId);
    if (group && !id && group.members.length === 1) {
      id = group.members[0].id;
      setGroupViewerMemberId(groupId, id);
    }
    setViewerMemberId(id ?? null);
  }, [groupId, group]);

  const onViewerMemberIdChange = (memberId: string | null) => {
    if (!groupId) return;
    if (memberId === null) clearGroupViewerMemberId(groupId);
    else setGroupViewerMemberId(groupId, memberId);
    setViewerMemberId(memberId);
  };

  const [viewMode, setViewMode] = useState<"list" | "chart">("list");
  // UI state
  const [search, setSearch] = useState("");
  // Debounced search avoids re-running the entire filter / group / sort
  // pipeline on every keystroke, which can be slow on long expense lists.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(search), 150);
    return () => window.clearTimeout(handle);
  }, [search]);
  const [groupBy, setGroupBy] =
    useState<GroupByValue>("date");
  const [sortBy, setSortBy] =
    useState<SortByValue>("date_desc");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {}
  );
  const shouldTitleCase = groupBy === "category" || groupBy === "splitType";
  const [openRow, setOpenRow] = useState<number | null>(null);
  const [settlingIndex, setSettlingIndex] = useState<number | null>(null);
  const [settleConfirmation, setSettleConfirmation] = useState<{
    settlement: ReturnType<typeof calculateSettlements>[number];
    index: number;
  } | null>(null);

  const device = useDeviceType();

  // Track this group in the user's local "recent groups" list once it loads.
  useEffect(() => {
    if (!groupId || isAdminView || !dashboard) return;
    const existingGroups = getEncryptedItem<string[]>(LOCAL_GROUPS_KEY, []);
    const updatedGroups = Array.from(new Set([groupId, ...existingGroups]));
    setEncryptedItem(LOCAL_GROUPS_KEY, updatedGroups);
  }, [groupId, isAdminView, dashboard]);

  /* ======================================================
     FILTER / SORT / GROUP
  ====================================================== */
  const groupedExpenses = useMemo(() => {
    let list = [...expenses];

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      const memberMap = group ? new Map(group.members.map(m => [m.id, m.name])) : new Map();
      list = list.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          getExpensePaidByLabel(e, viewerMemberId).toLowerCase().includes(q) ||
          getExpensePayers(e).some((p) => p.name.toLowerCase().includes(q)) ||
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
      if (groupBy === "date") key = e.date ? e.date : String(e.date);
      if (groupBy === "paidBy") key = getExpensePaidByLabel(e, viewerMemberId);
      if (groupBy === "category") key = e.category;
      if (groupBy === "splitType") key = e.splitType || "equal";

      grouped[key] ||= [];
      grouped[key].push(e);
    });

    return grouped;
  }, [expenses, debouncedSearch, sortBy, groupBy, group, viewerMemberId]);

  const chartData = useMemo(() => {
    return Object.entries(groupedExpenses).map(([key, list]) => {
      const name = formatExpenseGroupHeaderTitle(key, groupBy, shouldTitleCase, resolveCategoryLabel);

      const value = list.reduce((sum, e) => sum + e.amount, 0);

      return { name, value };
    });
  }, [groupedExpenses, shouldTitleCase, groupBy]);

  const members = group?.members;

  const balances = useMemo(
    () => (members ? calculateBalances(expenses, members) : {}),
    [expenses, members]
  );

  const settlements = useMemo(
    () => (members ? calculateSettlements(balances, members) : []),
    [balances, members]
  );

  const totalExpenses = useMemo(
    () => expenses.reduce((s, e) => s + e.amount, 0),
    [expenses]
  );

  const visibleCount = useMemo(
    () =>
      Object.values(groupedExpenses).reduce(
        (sum, list) => sum + list.length,
        0
      ),
    [groupedExpenses]
  );

  const isMobileGroupLoading = device === "mobile" || isMobileViewportWidth();

  if (loading) {
    // SSR defaults to desktop in useDeviceType — use minimal skeleton so phones
    // never flash the full-site GroupResponsesSkeleton (header + footer).
    if (typeof window === "undefined" || isMobileGroupLoading) {
      return (
        <Layout variant="minimal">
          <MobileGroupDashboardSkeleton />
        </Layout>
      );
    }
    return <GroupResponsesSkeleton />;
  }

  if (!group) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">{tCommon("groupNotFound")}</p>
          <Button asChild className="mt-4">
            <Link href="/">{tCommon("goHome")}</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const shareLink = `${typeof window !== "undefined" ? window.location.origin : ""}/group/${groupId}`;

  type CopyType = "settlement" | "link";

  const shareGroupContent = async (type: CopyType) => {
    const settlementText = type === "settlement" ? getSettlementText() : "";

    if (type === "settlement" && !settlementText.trim()) {
      toast({
        title: t("nothingToShare"),
        description: t("nothingToShareHint"),
        variant:'info',
      });
      return;
    }

    const clipboardText = type === "link" ? shareLink : settlementText;

    const share: ShareData =
      type === "link"
        ? {
            title: t("shareGroupTitle", { name: group.name }),
            text: t("shareJoinText", { name: group.name }),
            url: shareLink,
          }
        : {
            title: t("shareSettlementTitle", { name: group.name }),
            text: settlementText,
          };

    const outcome = await shareOrCopy({ share, clipboardText });

    if (outcome === "copied") {
      toast({
        title: t("copiedTitle"),
        description:
          type === "link"
            ? t("copiedLinkHint")
            : t("copiedSettlementHint"),
        variant:'info',
      });
    } else if (outcome === "failed") {
      toast({
        title: t("shareFailedTitle"),
        description: t("shareFailedHint"),
        variant: "destructive",
      });
    }
  };


  const getSettlementText = () => {
    if (settlements.length === 0) return "";

    const lines = settlements.map((s) =>
      t("settlementLine", {
        from: memberDisplayNameForViewer(s.fromId, s.fromName, viewerMemberId),
        to: memberDisplayNameForViewer(s.toId, s.toName, viewerMemberId),
        amount: formatCurrency(s.amount, group.currency),
      })
    );

    return [
      t("settlementSummaryTitle"),
      "",
      ...lines,
      "",
      t("viewDetailsHere"),
      shareLink,
    ].join("\n");
  };

  const handleExportExpenses = () => {
    const exportExpenses = Object.values(groupedExpenses).flat();

    if (!exportExpenses.length) {
      toast({
        title: t("nothingToExport"),
        description: search ? t("noSearchExport") : t("addBeforeExport"),
        variant:'info',
      });
      return;
    }

    const exportBalances = calculateBalances(exportExpenses, group.members);
    const csv = buildExpensesCsv(group, exportExpenses, exportBalances, {
      date: t("exportDate"),
      description: t("exportDescription"),
      category: t("exportCategory"),
      cost: t("exportCost"),
      currency: t("exportCurrency"),
      netMeaning: t("exportNetMeaning"),
      totalBalance: t("exportTotalBalance"),
    });
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
      title: t("exportReady"),
      description: t("exportReadyDescription", { count: exportExpenses.length }),
      variant:'info',
    });
  };

  const handleSettle = async (
    setlementData: ReturnType<typeof calculateSettlements>[number],
    index: number
  ) => {
    try {
      setSettlingIndex(index);
      const data: ExpenseRequest = {
        description: t("settlementBetween", {
          from: setlementData.fromName,
          to: setlementData.toName,
        }),
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
      await refresh();
    } catch (error) {
      // toast.error("Failed to delete expense");
    } finally {
      setSettlingIndex(null);
    }
  };

  /* ======================================================
     UI
  ====================================================== */
  const settlementCount = settlements.length;

  if (device === "mobile") {
    return (
      <Layout variant="minimal">
        <MobileGroupDashboard
          groupId={groupId}
          isAdminView={isAdminView}
          group={group}
          expenses={expenses}
          groupedExpenses={groupedExpenses}
          groupBy={groupBy}
          setGroupBy={setGroupBy}
          sortBy={sortBy}
          setSortBy={setSortBy}
          shouldTitleCase={shouldTitleCase}
          expandedGroups={expandedGroups}
          setExpandedGroups={setExpandedGroups}
          balances={balances}
          settlements={settlements}
          totalExpenses={totalExpenses}
          search={search}
          setSearch={setSearch}
          visibleCount={visibleCount}
          copyLink={shareGroupContent}
          onExportExpenses={handleExportExpenses}
          openRow={openRow}
          setOpenRow={setOpenRow}
          settlingIndex={settlingIndex}
          settleConfirmation={settleConfirmation}
          setSettleConfirmation={setSettleConfirmation}
          handleSettle={handleSettle}
          viewMode={viewMode}
          setViewMode={setViewMode}
          chartData={chartData}
          viewerMemberId={viewerMemberId}
          onViewerMemberIdChange={onViewerMemberIdChange}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container space-y-5 py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:space-y-6 sm:py-6 lg:pb-6">
        {/* HEADER */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center sm:gap-3">
            <Button variant="ghost" size="icon-sm" className="mt-0.5 shrink-0 sm:mt-0" asChild>
              {isAdminView ? (
                <NextLink href={ADMIN_BASE_PATH} aria-label={tCommon("back")}>
                  <ArrowLeft className="h-5 w-5" />
                </NextLink>
              ) : (
                <Link href="/" aria-label={tCommon("back")}>
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              )}
            </Button>
            <div className="min-w-0 flex-1 space-y-2">
              <SmartTooltip
                text={group.name}
                className="block truncate text-xl font-bold leading-tight sm:text-2xl"
              />
              <AvatarGroup
                names={group.members.map((m) => m.name)}
                overlayNames={group.members.map((m) =>
                  memberLabelWithYouSuffix(m.id, m.name, viewerMemberId, youLabel)
                )}
                className="max-w-full"
              />
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2 sm:justify-start">
            <Button variant="outline" size="sm" className="h-9 flex-1 sm:flex-initial" asChild>
              <Link href={`/group/${groupId}/edit`}>
                <Pencil className="h-4 w-4" />
                <span className="sm:hidden">{tCommon("edit")}</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 flex-1 sm:flex-initial"
              type="button"
              title={t("shareGroupLink")}
              aria-label={t("shareGroupLink")}
              onClick={() => shareGroupContent("link")}
            >
              <Share2 className="h-4 w-4" />
              <span className="sm:hidden">{tCommon("share")}</span>
            </Button>
            <Button asChild size="sm" className="hidden h-9 sm:inline-flex">
              <Link href={`/group/${groupId}/add-expense`}>
                <Plus className="h-4 w-4" />
                {t("addExpense")}
              </Link>
            </Button>
          </div>
        </header>

        {/* Summary strip — matches dashboard-style overview */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
          {[
            {
              label: t("groupTotal"),
              value: formatCurrency(totalExpenses, group.currency),
              hint: t("expenseCount", { count: expenses.length }),
            },
            {
              label: t("membersStat"),
              value: String(group.members.length),
              hint: t("inThisGroup"),
            },
            {
              label: t("settlementsStat"),
              value: String(settlementCount),
              hint:
                settlementCount === 1
                  ? t("suggestedTransfer")
                  : t("suggestedTransfers"),
            },
            {
              label: t("currencyStat"),
              value: group.currency || "—",
              hint: t("groupDefault"),
            },
          ].map((stat) => (
            <Card key={stat.label} className="border-border/80 shadow-sm">
              <CardContent className="p-3 sm:p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                  {stat.label}
                </p>
                <p className="mt-1 truncate text-base font-semibold tabular-nums text-foreground sm:text-lg">
                  {stat.value}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground sm:text-xs">{stat.hint}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* MAIN: insights first on mobile, expenses + chart on desktop left */}
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-3 lg:gap-6">
          {/* EXPENSE LIST */}
          <div className="order-2 space-y-4 lg:order-1 lg:col-span-2">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-12 gap-3 items-center">
                  {/* Search */}
                  <div className="col-span-12 sm:col-span-5 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      className="w-full pl-9 h-10 rounded-md border bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      placeholder={t("searchExpenses")}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  {/* Group By */}
                  <div className="col-span-12 sm:col-span-3">
                    <SingleSelect
                      items={groupByOptions.map((m) => ({
                        id: m.value,
                        label: m.label,
                        icon: m.icon,
                      }))}
                      value={{ itemId: groupBy }}
                      onSelect={(_, itemId) => setGroupBy(itemId as GroupByValue)}
                      placeholder={t("groupBy")}
                      label={t("groupBy")}
                    />
                  </div>

                  {/* Sort By */}
                  <div className="col-span-12 sm:col-span-4">
                    <SingleSelect
                      items={sortOptions.map((m) => ({
                        id: m.value,
                        label: m.label,
                        icon: m.icon,
                      }))}
                      value={{ itemId: sortBy }}
                      onSelect={(_, itemId) => setSortBy(itemId as SortByValue)}
                      placeholder={t("sortBy")}
                      label={t("sortBy")}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expenses */}
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                {/* LEFT */}
                <div className="min-w-0 space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Wallet className="h-5 w-5 shrink-0 text-primary" />
                    {t("expensesTitle")}
                  </CardTitle>

                  <p className="text-sm text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:gap-1">
                    <span>
                      {t("totalLabel")}{" "}
                      <span className="font-semibold text-foreground">
                        {formatCurrency(totalExpenses, group.currency)}
                      </span>
                    </span>

                    <span className="hidden sm:inline opacity-60">·</span>

                    <span>{t("expenseCount", { count: expenses.length })}</span>
                  </p>

                </div>

                {/* RIGHT */}
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
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
                      <span className="hidden sm:inline">{tCommon("list")}</span>
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
                      <span className="hidden sm:inline">{tCommon("chart")}</span>
                    </button>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExportExpenses}
                    disabled={!expenses.length}
                    title={t("exportExpenses")}
                    className="h-auto px-0"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">{tCommon("export")}</span>
                  </Button>

                  {/* Add Button */}
                  <Button asChild size="sm">
                    <Link href={`/group/${groupId}/add-expense`}>
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">{tCommon("add")}</span>
                    </Link>
                  </Button>
                </div>

              </CardHeader>
              <CardContent className="p-0">
                {search && visibleCount > 0 && (
                  <div className="px-4 py-2 text-sm text-muted-foreground">
                    {t("showingSearch", { count: visibleCount, query: search })}
                    <button
                      className="ml-2 underline text-xs"
                      onClick={() => setSearch("")}
                    >
                      {tCommon("clear")}
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
                        {t("noExpensesFound")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("tryDifferentSearch")}
                      </p>
                    </div>

                    {search && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearch("")}
                      >
                        {t("clearSearch")}
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
                        {t("noExpensesYet")}
                      </p>
                      <p className="text-sm text-muted-foreground max-w-xs">
                        {t("startAddingHint")}
                      </p>
                    </div>

                    <Button asChild size="sm" className="shrink-0">
                      <Link href={`/group/${groupId}/add-expense`}>
                        <Plus className="w-4 h-4" />
                        {t("addFirstExpense")}
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
                          <div className="sticky top-14 z-10 border-b border-border/60 bg-background/95 backdrop-blur-sm sm:top-16 supports-[backdrop-filter]:bg-background/80">
                              <button
                                onClick={() =>
                                  setExpandedGroups((p) => ({
                                    ...p,
                                    [title]: !isOpen,
                                  }))
                                }
                                className="flex w-full items-center justify-between border-b px-4 py-3 transition hover:bg-muted/40"
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                  {isOpen ? (
                                    <ChevronDown className="w-4 h-4 shrink-0" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 shrink-0" />
                                  )}

                                  <div className="min-w-0 flex-1 text-left">
                                    <div className="truncate font-semibold">
                                      {formatExpenseGroupHeaderTitle(title, groupBy, shouldTitleCase, resolveCategoryLabel)}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {t("expenseCount", { count: list.length })}
                                    </p>
                                  </div>
                                </div>

                                <span className="ml-2 shrink-0 font-semibold">
                                  {formatCurrency(groupTotal, group.currency)}
                                </span>
                              </button>
                            </div>

                          {/* ✅ EXPENSE ITEMS */}
                          {isOpen &&
                            list.map((expense) => {
                              return (
                                <div
                                  key={expense.id}
                                  className="group relative border-b last:border-b-0 hover:bg-muted/50 transition-colors animate-in fade-in slide-in-from-top-1 duration-200"
                                >
                                  <Link
                                    href={`/group/${groupId}/expense/${expense.id}`}
                                    className="flex gap-3 p-4"
                                  >
                                    <ExpenseListCategoryIcon
                                      category={expense.category as CategoryKey}
                                      subcategory={expense.subcategory}
                                      hasAttachment={expenseHasAttachment(expense)}
                                      containerClassName="rounded-xl"
                                    />

                                    {/* CONTENT */}
                                    <div className="min-w-0 flex-1">
                                      {/* DESCRIPTION + MOBILE EDIT */}
                                      <div className="flex items-center gap-2">
                                        <SmartTooltip
                                          text={expense.description}
                                          disableMobileTooltip
                                        />
                                      </div>

                                      {/* PAID BY */}
                                      <div className="text-xs md:text-base text-muted-foreground mt-0.5 flex items-center gap-1">
                                        <SmartTooltip
                                          text={getExpensePaidByLabel(expense, viewerMemberId, youLabel, tGroup)}
                                          disableMobileTooltip
                                        />
                                        <span className="shrink-0">{tCommon("paid")}</span>
                                      </div>


                                      {/* PARTICIPANTS */}
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
                                        label=""
                                      />

                                    </div>

                                    {/* AMOUNT */}
                                    <div className="flex shrink-0 flex-col items-end justify-start pt-0.5">
                                      <p className="text-sm font-semibold tabular-nums whitespace-nowrap">
                                        {formatCurrency(
                                          expense.amount,
                                          expense.currency
                                        )}
                                      </p>
                                    </div>
                                  </Link>
                                </div>

                              );
                            })}
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <ExpenseChart
                    data={chartData}
                    currency={group.currency}
                    totalExpenses={totalExpenses}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="order-1 space-y-4 lg:sticky lg:top-20 lg:order-2 lg:col-span-1 lg:self-start">
            {/* Balances */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Users className="h-5 w-5 shrink-0 text-primary" />
                  {t("balances")}
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-none space-y-3 overflow-visible sm:max-h-[min(22rem,50vh)] sm:overflow-y-auto lg:max-h-[17rem] lg:overflow-y-auto">
                {group.members.map((m) => {
                  const bal = balances[m.id];
                  const displayName = memberDisplayNameForViewer(m.id, m.name, viewerMemberId);

                  return (
                    <div key={m.id} className="flex justify-between items-center">
                      <div className="flex items-center gap-2 min-w-0">
                        <UserAvatar name={m.name} />
                        <SmartTooltip text={displayName} />
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
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <ArrowRight className="h-5 w-5 shrink-0 text-primary" />
                  {t("whoPaysWhom")}
                </CardTitle>

                {(expenses.length > 0 || settlements.length > 0) && (
                  <button
                    onClick={() => shareGroupContent("settlement")}
                    className="p-2 rounded-md hover:bg-muted transition"
                    title={t("shareSettlement")}
                  >
                    <Share2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </CardHeader>

              <CardContent className="max-h-none space-y-3 overflow-visible sm:max-h-[min(20rem,45vh)] sm:overflow-y-auto lg:max-h-[16rem] lg:overflow-y-auto">
                {/* 🚫 NO EXPENSES YET */}
                {expenses.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center">
                    {t("addExpensesWhoOwes")}
                  </p>
                )}

                {/* ✅ EXPENSES EXIST BUT ALL SETTLED */}
                {expenses.length > 0 && settlements.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center">
                    {t("allSettledCelebration")}
                  </p>
                )}

                {/* ✅ SETTLEMENTS */}
                {settlements.map((s, i) => {
                  const isOpen = openRow === i;
                  const isLoading = settlingIndex === i;
                  const fromName = memberDisplayNameForViewer(s.fromId, s.fromName, viewerMemberId);
                  const toName = memberDisplayNameForViewer(s.toId, s.toName, viewerMemberId);

                  return (
                    <div key={i} className="border-b last:border-b-0">
                      {/* ROW */}
                      <div className="flex items-start justify-between gap-3 py-2">
                        <div className="flex-1 min-w-0 text-sm leading-snug break-words">
                          {tCommon("paysTo", { from: fromName, to: toName })}
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
                            {isLoading ? t("settling") : t("settleUp")}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

              </CardContent>
            </Card>

            <GenericAlertDialog
              open={settleConfirmation !== null}
              onOpenChange={(open) => {
                if (!open) setSettleConfirmation(null);
              }}
              title={t("recordSettlementTitle")}
              titleClassName="text-lg"
              descriptionClassName="text-xs"
              description={<span>{settleConfirmation
                      ? t("recordSettlementDescriptionDesktop", {
                          from: memberDisplayNameForViewer(
                            settleConfirmation.settlement.fromId,
                            settleConfirmation.settlement.fromName,
                            viewerMemberId
                          ),
                          to: memberDisplayNameForViewer(
                            settleConfirmation.settlement.toId,
                            settleConfirmation.settlement.toName,
                            viewerMemberId
                          ),
                          amount: formatCurrency(
                            settleConfirmation.settlement.amount,
                            group.currency
                          ),
                        })
                      : ""}</span>}
              contentClassName="max-w-[310px] rounded-2xl"
              footerClassName="flex-row gap-2 mt-4"
              actions={[
                { label: tCommon("cancel"), type: "cancel", className: "flex-1 mt-0 border-none bg-muted hover:bg-muted/80" },
                {
                  label: tCommon("yesSettleUp"),
                  className: "flex-1",
                  onClick: () => {
                      if (!settleConfirmation) return;
                      handleSettle(
                        settleConfirmation.settlement,
                        settleConfirmation.index
                      );
                  },
                  disabled: settleConfirmation ? settlingIndex === settleConfirmation.index : false,
                },
              ]}
            />

          </div>
        </div>

        <Link
          href={`/group/${groupId}/add-expense`}
          className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] right-[max(1.25rem,env(safe-area-inset-right,0px))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:bg-primary/92 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.97] lg:hidden"
          aria-label={t("addExpense")}
        >
          <Plus className="h-7 w-7" strokeWidth={2.25} />
        </Link>
      </div>
    </Layout>
  );
}
