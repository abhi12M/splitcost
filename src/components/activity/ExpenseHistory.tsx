"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, History } from "lucide-react";
import { useActivityText } from "@/components/activity/useActivityText";
import { useActivityTime } from "@/components/activity/useActivityTime";
import { useExpenseActivity } from "@/hooks/useExpenseActivity";
import { cn } from "@/lib/utils";

function isValidTime(value?: string | null): value is string {
  return Boolean(value) && !Number.isNaN(new Date(value as string).getTime());
}

/**
 * One line with the latest update (or when the expense was added, if it never
 * changed); expands into every update, newest first, ending with when it was
 * added. The line shows at once from the expense's own saved times; the list of
 * changes fills in when the history has loaded.
 */
export function ExpenseHistory({
  expenseId,
  currency,
  createdAt,
  isSettlement = false,
  updatedAt,
  refreshKey,
}: {
  expenseId: string;
  currency: string;
  /** When the expense was added. */
  createdAt?: string | null;
  /** A settlement is "recorded" rather than "added". */
  isSettlement?: boolean;
  /** When it was last changed; leave out if it never was. */
  updatedAt?: string | null;
  /** Changes whenever the expense changes, to reload in the background. */
  refreshKey?: unknown;
}) {
  const t = useTranslations("activity");
  const { historyEntry } = useActivityText();
  const { dayLabel, shortTime, isJustNow, dayAtTime } = useActivityTime();
  const { events, status } = useExpenseActivity(expenseId, refreshKey);
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const ready = status === "ready";
  const updates = events.filter((event) => event.kind === "expense_updated");
  const latest = updates[0];
  const hasCreated = isValidTime(createdAt);
  // The newer of the latest change in the history and the expense's own saved
  // time: until the history has loaded, or when its saved copy is a step
  // behind, the expense's own time is the more current one.
  const savedChangeAt = isValidTime(updatedAt) ? updatedAt : undefined;
  const eventAt = ready ? latest?.createdAt : undefined;
  const lastChangeAt =
    eventAt && savedChangeAt
      ? Date.parse(savedChangeAt) > Date.parse(eventAt)
        ? savedChangeAt
        : eventAt
      : eventAt ?? savedChangeAt;
  if (!lastChangeAt && !hasCreated) return null;

  const timeOf = (at: string) => (dayLabel(at) === t("today") ? shortTime(at) : dayAtTime(at));
  // "Just now" leads a line elsewhere; mid-sentence it needs its own wording.
  const summary = lastChangeAt
    ? isJustNow(lastChangeAt)
      ? t("historyUpdatedJustNow")
      : t("historyLastUpdated", { time: timeOf(lastChangeAt) })
    : isJustNow(createdAt as string)
      ? t(isSettlement ? "historyRecordedJustNow" : "historyAddedJustNow")
      : t(isSettlement ? "historyLastRecorded" : "historyLastAdded", { time: timeOf(createdAt as string) });

  return (
    <section className="shrink-0 rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? t("hideHistory") : t("showHistory")}
        className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-left transition hover:bg-muted/40"
      >
        <History className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          <span className={cn(open && "font-medium text-foreground")}>{t("history")}</span>
          {open ? null : <> · {summary}</>}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open ? (
        <ol id={panelId} className="mx-4 mb-4 space-y-3 border-l border-border pl-4">
          {updates.map((event) => {
            const { title, lines } = historyEntry(event, currency);
            return (
              <li key={event.id} className="relative">
                <span className="absolute -left-[1.3rem] top-1.5 h-2 w-2 rounded-full bg-border" aria-hidden />
                <p className="text-sm leading-snug text-foreground">{title}</p>
                {lines.map((line) => (
                  <p key={line} className="mt-0.5 text-xs text-muted-foreground">
                    {line}
                  </p>
                ))}
                <p className="mt-0.5 text-xs text-muted-foreground/80">{dayAtTime(event.createdAt)}</p>
              </li>
            );
          })}
          {status === "loading" && isValidTime(updatedAt) ? (
            <li className="relative">
              <span className="absolute -left-[1.3rem] top-1.5 h-2 w-2 rounded-full bg-border" aria-hidden />
              <p className="text-sm leading-snug text-muted-foreground">{t("historyLoading")}</p>
            </li>
          ) : null}
          {hasCreated ? (
            <li className="relative">
              <span className="absolute -left-[1.3rem] top-1.5 h-2 w-2 rounded-full bg-border" aria-hidden />
              <p className="text-sm leading-snug text-foreground">
                {t(isSettlement ? "historyCreatedSettlement" : "historyCreated")}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground/80">{dayAtTime(createdAt as string)}</p>
            </li>
          ) : null}
        </ol>
      ) : null}
    </section>
  );
}
