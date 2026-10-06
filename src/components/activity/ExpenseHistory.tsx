"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, History } from "lucide-react";
import { useActivityText } from "@/components/activity/useActivityText";
import { useActivityTime } from "@/components/activity/useActivityTime";
import { useExpenseActivity } from "@/hooks/useExpenseActivity";
import { cn } from "@/lib/utils";

/**
 * One line with the latest update; expands into every update (newest first).
 * Creation isn't listed: the page already shows when the expense was added.
 * Hidden until the expense has been updated.
 */
export function ExpenseHistory({
  expenseId,
  currency,
  refreshKey,
}: {
  expenseId: string;
  currency: string;
  /** Changes whenever the expense changes, to reload in the background. */
  refreshKey?: unknown;
}) {
  const t = useTranslations("activity");
  const { historyEntry } = useActivityText();
  const { dayLabel, shortTime, isJustNow, dayAtTime } = useActivityTime();
  const { events, status } = useExpenseActivity(expenseId, refreshKey);
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const updates = events.filter((event) => event.kind === "expense_updated");
  const latest = updates[0];
  if (status !== "ready" || !latest) return null;

  const when = dayLabel(latest.createdAt) === t("today") ? shortTime(latest.createdAt) : dayAtTime(latest.createdAt);
  // "Just now" leads a line elsewhere; mid-sentence it needs its own wording.
  const summary = isJustNow(latest.createdAt) ? t("historyUpdatedJustNow") : t("historyLastUpdated", { time: when });

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
          {open ? <span className="font-medium text-foreground">{t("history")}</span> : summary}
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
        </ol>
      ) : null}
    </section>
  );
}
