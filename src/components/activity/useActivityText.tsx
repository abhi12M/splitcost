"use client";

import { useMemo, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useActivityTime } from "@/components/activity/useActivityTime";
import { formatCurrency } from "@/lib/avatar-utils";
import type { SplitType } from "@/lib/storage";
import type { ActivityCategory, ActivityChange, ActivityEvent, ShareChange } from "@/lib/activity/types";

const bold = (chunks: ReactNode) => <span className="font-medium text-foreground">{chunks}</span>;

/**
 * Wording for activity. There is no login yet, so nothing says who made a
 * change; once it exists, actor-first messages can use `event.actorName`.
 */
export function useActivityText() {
  const t = useTranslations("activity");
  const tCategories = useTranslations("categories");
  const locale = useLocale();
  const list = useMemo(() => new Intl.ListFormat(locale, { type: "conjunction" }), [locale]);
  const { formatDate } = useActivityTime();

  const names = (people: string[]) => list.format(people.filter(Boolean));
  const money = (amount: number, currency: string) => formatCurrency(amount, currency);
  const date = (value: string) => {
    const [y, m, d] = value.split("-").map(Number);
    return y && m && d ? formatDate(new Date(y, m - 1, d)) : value;
  };
  const percent = useMemo(() => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 2 }), [locale]);
  /** The most specific name: "Movies" rather than "Entertainment · Movies". */
  const category = ({ category: key, subcategory }: ActivityCategory) => {
    const sub = `${key}.subcategories.${subcategory}`;
    if (tCategories.has(sub)) return tCategories(sub);
    return tCategories.has(`${key}.label`) ? tCategories(`${key}.label`) : key;
  };
  const splitLabel = (type: SplitType) =>
    t(type === "equal" ? "splitTypeEqual" : type === "percentage" ? "splitTypePercentage" : "splitTypeCustom");
  const share = (value: number, unit: ShareChange["unit"], currency: string) =>
    unit === "percent" ? percent.format(value / 100) : money(value, currency);

  /** One line in the group feed. */
  const feedSentence = (event: ActivityEvent): ReactNode => {
    switch (event.kind) {
      case "expense_added":
        return t.rich("expenseAdded", { expense: event.data.expense.description, b: bold });
      case "expense_updated":
        return t.rich("expenseUpdated", { expense: event.data.description, b: bold });
      case "expense_deleted": {
        const e = event.data.expense;
        return t.rich("expenseDeleted", { expense: e.description, amount: money(e.amount, e.currency), b: bold });
      }
      case "settlement_added":
      case "settlement_deleted": {
        const s = event.data;
        return t.rich(event.kind === "settlement_added" ? "settlementAdded" : "settlementDeleted", {
          from: s.from.name,
          to: s.to.name,
          amount: money(s.amount, s.currency),
          b: bold,
        });
      }
      case "group_created":
        return t("groupCreated", { count: event.data.members.length });
      case "group_renamed":
        return t.rich("groupRenamed", { name: event.data.to, b: bold });
      case "member_added":
        return t.rich("memberAdded", { name: event.data.member.name, b: bold });
      case "member_renamed":
        return t.rich("memberRenamed", { from: event.data.from, to: event.data.to, b: bold });
      case "member_removed":
        return t.rich("memberRemoved", { name: event.data.member.name, b: bold });
    }
  };

  /** Second line in the feed: what a deleted expense was (its page is gone). */
  const feedDetail = (event: ActivityEvent) => {
    if (event.kind !== "expense_deleted") return "";
    const e = event.data.expense;
    return t("deletedDetail", {
      payers: names(e.payers.map((p) => p.name)),
      names: names(e.participants.map((p) => p.name)),
    });
  };

  const changeLine = (change: ActivityChange, currency: string): string[] => {
    switch (change.field) {
      case "description":
        return [t("changeDescription", { from: change.from, to: change.to })];
      case "amount":
        return [t("changeAmount", { from: money(change.from, currency), to: money(change.to, currency) })];
      case "paidBy":
        return [t("changePaidBy", { from: names(change.from), to: names(change.to) })];
      case "payerAmounts":
        return [t("changePayerAmounts")];
      case "split": {
        const lines: string[] = [];
        if (change.fromType !== change.toType) {
          lines.push(t("changeSplitType", { from: splitLabel(change.fromType), to: splitLabel(change.toType) }));
        }
        for (const name of change.added) lines.push(t("changeSplitAdded", { name }));
        for (const name of change.removed) lines.push(t("changeSplitRemoved", { name }));
        if (change.shares) {
          for (const s of change.shares) {
            lines.push(t("changeShare", { name: s.name, from: share(s.from, s.unit, currency), to: share(s.to, s.unit, currency) }));
          }
        } else if (change.sharesChanged) {
          // Recorded before per-person shares were kept.
          lines.push(t("changeShares"));
        }
        return lines;
      }
      case "date":
        return [t("changeDate", { from: date(change.from), to: date(change.to) })];
      case "category":
        // Moving off "uncategorized" is choosing a category, not changing one.
        return change.from.category === "uncategorized"
          ? [t("changeCategorySet", { category: category(change.to) })]
          : [t("changeCategory", { from: category(change.from), to: category(change.to) })];
      case "notes":
        return [t(change.action === "added" ? "notesAdded" : change.action === "removed" ? "notesRemoved" : "notesUpdated")];
      case "attachment":
        return [
          t(change.action === "added" ? "attachmentAdded" : change.action === "replaced" ? "attachmentReplaced" : "attachmentRemoved"),
        ];
    }
  };

  /** Expense history: a headline per update, with one line per change. */
  const historyEntry = (event: ActivityEvent, currency: string): { title: ReactNode; lines: string[] } => {
    if (event.kind !== "expense_updated") return { title: feedSentence(event), lines: [] };
    const lines = event.data.changes.flatMap((change) => changeLine(change, currency));
    // A single change reads best as the headline itself.
    return lines.length === 1 ? { title: lines[0], lines: [] } : { title: t("historyUpdated"), lines };
  };

  return { feedSentence, feedDetail, historyEntry };
}
