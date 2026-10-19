// Whether the app can reach its own server. `navigator.onLine` is only a hint
// (it stays true on a captive Wi-Fi), so a failed request also counts as
// offline, and the browser's "online" event is confirmed with a ping before
// anything is unblocked.

const PING_URL = "/api/ping";
const PROBE_INTERVAL_MS = 15_000;

type Listener = () => void;

let online = typeof navigator === "undefined" ? true : navigator.onLine;
let probeTimer: ReturnType<typeof setInterval> | null = null;
let started = false;
const listeners = new Set<Listener>();

function setOnline(next: boolean) {
  if (next === online) return;
  online = next;
  if (online) stopProbing();
  else startProbing();
  listeners.forEach((listener) => listener());
}

async function ping(): Promise<boolean> {
  try {
    const res = await fetch(`${PING_URL}?t=${Date.now()}`, { method: "GET", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

function startProbing() {
  if (probeTimer || typeof window === "undefined") return;
  probeTimer = setInterval(() => {
    void ping().then((ok) => {
      if (ok) setOnline(true);
    });
  }, PROBE_INTERVAL_MS);
}

function stopProbing() {
  if (!probeTimer) return;
  clearInterval(probeTimer);
  probeTimer = null;
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("offline", () => setOnline(false));
  window.addEventListener("online", () => {
    void ping().then((ok) => setOnline(ok));
  });
  if (!online) startProbing();
}

export function isOnline() {
  start();
  return online;
}

/**
 * Asks the server directly whether it can be reached, and updates the online
 * state with the answer. Used before a send whose failure would be costly to
 * interpret (a lost request can't be told apart from a lost response).
 */
export async function checkServerReachable() {
  start();
  const ok = await ping();
  setOnline(ok);
  return ok;
}

export function subscribeOnline(listener: Listener) {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** A request reached the server (any status): the app is online. */
export function reportNetworkSuccess() {
  setOnline(true);
}

/** A request failed before reaching the server: treat the app as offline. */
export function reportNetworkFailure() {
  setOnline(false);
}

// When the server last answered a request successfully, kept across reloads so
// the status sheet can still say it while offline.
const LAST_SYNCED_KEY = "splitcost:lastSyncedAt";
let lastSyncedAt: number | null = null;
let lastSyncedLoaded = false;
const lastSyncedListeners = new Set<Listener>();

/** When the server last answered a request successfully; null if never on this device. */
export function getLastSyncedAt() {
  if (!lastSyncedLoaded && typeof window !== "undefined") {
    lastSyncedLoaded = true;
    try {
      const stored = Number(window.localStorage.getItem(LAST_SYNCED_KEY));
      if (stored > 0) lastSyncedAt = stored;
    } catch {
      // Storage unavailable: it just starts empty.
    }
  }
  return lastSyncedAt;
}

export function subscribeLastSynced(listener: Listener) {
  lastSyncedListeners.add(listener);
  return () => {
    lastSyncedListeners.delete(listener);
  };
}

function markSynced() {
  getLastSyncedAt();
  lastSyncedAt = Date.now();
  try {
    window.localStorage.setItem(LAST_SYNCED_KEY, String(lastSyncedAt));
  } catch {
    // Not saved across reloads; still right for this page.
  }
  lastSyncedListeners.forEach((listener) => listener());
}

/** Thrown instead of sending a request the app already knows can't go out. */
export class OfflineError extends Error {
  code = "OFFLINE" as const;
  constructor() {
    super("You're offline.");
  }
}

export function isOfflineError(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "OFFLINE";
}

/**
 * `fetch` that keeps the online state up to date. A network failure is
 * rethrown as an OfflineError so callers can tell it apart from a refusal.
 */
export async function trackedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  start();
  try {
    const res = await fetch(input, init);
    reportNetworkSuccess();
    if (res.ok) markSynced();
    return res;
  } catch (error) {
    // An aborted request says nothing about the network.
    if ((error as { name?: string })?.name === "AbortError") throw error;
    reportNetworkFailure();
    throw new OfflineError();
  }
}
