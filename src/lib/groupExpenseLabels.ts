import { formatSummaryName } from "@/components/ui/formatters";
import type { GroupDashboardInterface, UserInterface } from "@/lib/storage";

export type DashboardExpense = GroupDashboardInterface["expenses"][number];

export type GroupExpenseTranslateFn = (
  key: string,
  values?: Record<string, string | number>
) => string;

const DEFAULT_YOU = "You";

export function expenseHasAttachment(expense: DashboardExpense): boolean {
  return Boolean(expense.attachmentDataUrl ?? expense.attachment_data_url);
}

export function memberNameForViewer(
  memberId: string,
  name: string,
  viewerMemberId: string | null | undefined,
  youLabel: string = DEFAULT_YOU
): string {
  if (viewerMemberId && memberId === viewerMemberId) return youLabel;
  return name;
}

/** Full name with optional suffix for forms and lists, e.g. `Sam (You)`. */
export function memberLabelWithYouSuffix(
  memberId: string,
  name: string,
  viewerMemberId: string | null | undefined,
  youLabel: string = DEFAULT_YOU
): string {
  if (viewerMemberId && memberId === viewerMemberId) return `${name} (${youLabel})`;
  return name;
}

/** Viewer-aware label with the same short name format as expense detail (who paid, balances, settlements). */
export function memberDisplayNameForViewer(
  memberId: string,
  name: string,
  viewerMemberId: string | null | undefined,
  youLabel: string = DEFAULT_YOU
): string {
  return formatSummaryName(
    memberNameForViewer(memberId, name, viewerMemberId, youLabel)
  );
}

export function getExpensePayers(expense: DashboardExpense): UserInterface[] {
  if (expense.payers?.length) {
    return expense.payers
      .map((payer) => payer.user)
      .filter((payer): payer is UserInterface => !!payer);
  }

  return expense.paidBy ? [expense.paidBy] : [];
}

export function getExpensePaidByLabel(
  expense: DashboardExpense,
  viewerMemberId?: string | null,
  youLabel: string = DEFAULT_YOU,
  t?: GroupExpenseTranslateFn
) {
  const payers = getExpensePayers(expense);
  const labels = payers.map((p) =>
    memberDisplayNameForViewer(p.id, p.name, viewerMemberId, youLabel)
  );

  const unknown = t?.("unknownPayer") ?? "Unknown payer";
  const paidByTwo = (first: string, second: string) =>
    t?.("paidByTwo", { first, second }) ?? `${first} & ${second}`;
  const youPlusOthers = (count: number) =>
    t?.("youPlusOthers", { count }) ??
    `You + ${count} other${count === 1 ? "" : "s"}`;
  const peopleCount = (count: number) =>
    t?.("peopleCount", { count }) ?? `${count} people`;

  if (labels.length === 0) return unknown;
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return paidByTwo(labels[0], labels[1]);
  if (viewerMemberId && payers.some((p) => p.id === viewerMemberId)) {
    const others = payers.length - 1;
    return youPlusOthers(others);
  }
  return peopleCount(payers.length);
}
