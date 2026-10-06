// Presentation rules for the group feed. Pure, so they are unit-tested.
import type { ActivityEvent } from "./types";

/** Updates to one expense this close together show as a single "updated". */
export const RAPID_UPDATE_WINDOW_MS = 10 * 60 * 1000;

const time = (event: ActivityEvent) => new Date(event.createdAt).getTime();

/**
 * Collapses bursts of changes to the same expense (an image added, then the
 * category set, then the name fixed) into one feed line. An update right
 * after the expense was added is folded into the "added" line; a run of
 * updates becomes the latest one. Every change stays in the expense history.
 * Takes and returns events newest first.
 */
export function collapseRapidUpdates(events: ActivityEvent[], windowMs = RAPID_UPDATE_WINDOW_MS): ActivityEvent[] {
  // Oldest first; a dropped line becomes null so stored indexes stay valid.
  const kept: (ActivityEvent | null)[] = [];
  // Index in `kept` of the last added/updated line shown for each expense,
  // and when that burst started (the window runs from its first change).
  const lastShown = new Map<string, { index: number; startedAt: number }>();

  for (const event of [...events].reverse()) {
    const expenseId = event.expenseId;
    if (!expenseId || (event.kind !== "expense_added" && event.kind !== "expense_updated")) {
      kept.push(event);
      continue;
    }
    const previous = lastShown.get(expenseId);
    const previousEvent = previous ? kept[previous.index] : null;
    if (event.kind === "expense_updated" && previous && previousEvent && time(event) - previous.startedAt <= windowMs) {
      // Keep "added" as is. A run of updates shows once, at its latest time.
      if (previousEvent.kind === "expense_updated") {
        kept[previous.index] = null;
        lastShown.set(expenseId, { index: kept.length, startedAt: previous.startedAt });
        kept.push(event);
      }
      continue;
    }
    lastShown.set(expenseId, { index: kept.length, startedAt: time(event) });
    kept.push(event);
  }
  return kept.filter((event): event is ActivityEvent => event !== null).reverse();
}
