// Development only. When one of our APIs fails it sends the exact reason as
// `debug` (see lib/api/errors). This remembers the latest one so the error toast
// that follows can show it, with a button to copy it, in place of the friendly
// message. Production never sends `debug`, and none of this runs there.

const SHOW_FOR_MS = 5_000;
const INSTALLED_FLAG = "__splitcostDevApiErrors";

type CapturedError = { message: string; copyText: string; at: number };

let latest: CapturedError | null = null;

type DebugPayload = { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };

function describeRequest(input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  const path = new URL(url, window.location.href);
  return { method, path: path.pathname, sameOriginApi: path.origin === window.location.origin && path.pathname.startsWith("/api/") };
}

async function capture(request: { method: string; path: string }, response: Response) {
  const payload = (await response.clone().json().catch(() => null)) as { error?: unknown; debug?: DebugPayload } | null;
  const debug = payload?.debug;
  if (!debug || typeof debug.message !== "string") return;

  const extras = (["code", "details", "hint"] as const)
    .filter((key) => typeof debug[key] === "string" && debug[key])
    .map((key) => `${key}: ${debug[key]}`);
  latest = {
    message: debug.message,
    copyText: [
      `${request.method} ${request.path} -> ${response.status}`,
      typeof payload?.error === "string" ? `app message: ${payload.error}` : null,
      `error: ${debug.message}`,
      ...extras,
    ]
      .filter(Boolean)
      .join("\n"),
    at: Date.now(),
  };
}

/** Starts remembering failed API calls. Call once, in the browser. */
export function installDevApiErrorCapture() {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return;
  const flagged = window as unknown as Record<string, unknown>;
  if (flagged[INSTALLED_FLAG]) return;
  flagged[INSTALLED_FLAG] = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const response = await originalFetch(input, init);
    if (!response.ok) {
      const request = describeRequest(input, init);
      // Read before handing the response back, so the error is already
      // remembered by the time the caller reacts to the failure.
      if (request.sameOriginApi) await capture(request, response);
    }
    return response;
  };
}

/** The API failure that just happened, if any. Each one is handed out once. */
export function takeRecentApiError(): { message: string; copyText: string } | null {
  if (process.env.NODE_ENV === "production" || !latest) return null;
  const current = latest;
  latest = null;
  return Date.now() - current.at <= SHOW_FOR_MS ? { message: current.message, copyText: current.copyText } : null;
}
