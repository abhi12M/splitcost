import type { GroupDashboardInterface, UserInterface } from "@/lib/storage";

export type DashboardExpense = GroupDashboardInterface["expenses"][number];

export function memberNameForViewer(
  memberId: string,
  name: string,
  viewerMemberId: string | null | undefined
): string {
  if (viewerMemberId && memberId === viewerMemberId) return "You";
  return name;
}

/** Full name with optional suffix for forms and lists, e.g. `Sam (You)`. */
export function memberLabelWithYouSuffix(
  memberId: string,
  name: string,
  viewerMemberId: string | null | undefined
): string {
  if (viewerMemberId && memberId === viewerMemberId) return `${name} (You)`;
  return name;
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
  viewerMemberId?: string | null
) {
  const payers = getExpensePayers(expense);
  const labels = payers.map((p) => memberNameForViewer(p.id, p.name, viewerMemberId));

  if (labels.length === 0) return "Unknown payer";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} & ${labels[1]}`;
  if (viewerMemberId && payers.some((p) => p.id === viewerMemberId)) {
    const others = payers.length - 1;
    return `You + ${others} other${others === 1 ? "" : "s"}`;
  }
  return `${payers.length} people`;
}
