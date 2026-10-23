"use client";

// Module state belongs to one loaded browser document. Unlike sessionStorage,
// it is not copied when a user duplicates a tab or opens a page from another
// tab, so each tab can still receive the other's realtime updates.
let originSessionId: string | null = null;

/** A per-tab id used only to avoid showing a tab its own notification. */
export function getRealtimeOriginSessionId() {
  if (typeof window === "undefined") return "";

  if (!originSessionId) {
    originSessionId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  }
  return originSessionId;
}
