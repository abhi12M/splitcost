import type { EditExpenseInterface } from "@/lib/storage";

// Session-scoped cache so navigation hops between view and edit can render
// instantly with the data we already loaded once. We intentionally use
// sessionStorage (not localStorage) so the cache dies when the tab closes and
// stale data never leaks across sessions / users sharing a device.
//
// Each entry has a short TTL because attachment URLs are signed and expire
// (currently 1 hour). 5 minutes keeps the UI snappy while ensuring we
// re-fetch frequently enough that signed URLs stay fresh.

const CACHE_PREFIX = "expense-cache:v2:";
const TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  cachedAt: number;
  expiresAt: number;
  payload: EditExpenseInterface;
};

export type CachedExpense = {
  payload: EditExpenseInterface;
  cachedAt: number;
};

function isBrowser() {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

function key(expenseId: string) {
  return `${CACHE_PREFIX}${expenseId}`;
}

export function saveCachedExpense(
  expenseId: string,
  payload: EditExpenseInterface
) {
  if (!isBrowser()) return;
  try {
    const now = Date.now();
    const entry: CacheEntry = {
      cachedAt: now,
      expiresAt: now + TTL_MS,
      payload,
    };
    sessionStorage.setItem(key(expenseId), JSON.stringify(entry));
  } catch {
    // Ignore quota / serialization errors — the cache is purely an optimization.
  }
}

export function readCachedExpense(expenseId: string): CachedExpense | null {
  if (!isBrowser()) return null;
  try {
    const raw = sessionStorage.getItem(key(expenseId));
    if (!raw) return null;

    const entry = JSON.parse(raw) as CacheEntry;
    if (!entry?.expiresAt || entry.expiresAt < Date.now()) {
      sessionStorage.removeItem(key(expenseId));
      return null;
    }

    return { payload: entry.payload, cachedAt: entry.cachedAt };
  } catch {
    return null;
  }
}

export function clearCachedExpense(expenseId: string) {
  if (!isBrowser()) return;
  try {
    sessionStorage.removeItem(key(expenseId));
  } catch {
    // Best effort.
  }
}
