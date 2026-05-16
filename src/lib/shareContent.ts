export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

/**
 * Uses the Web Share API when available and valid; otherwise copies to the clipboard.
 * AbortError (user dismissed the share sheet) is treated as cancelled — no fallback copy.
 */
export async function shareOrCopy(options: {
  share: ShareData;
  clipboardText: string;
}): Promise<ShareOutcome> {
  if (typeof navigator === "undefined") {
    return "failed";
  }

  const { share, clipboardText } = options;

  if (typeof navigator.share === "function") {
    const canTry =
      typeof navigator.canShare !== "function" || navigator.canShare(share);

    if (canTry) {
      try {
        await navigator.share(share);
        return "shared";
      } catch (err: unknown) {
        const name =
          err instanceof DOMException ? err.name : (err as { name?: string })?.name;
        if (name === "AbortError") {
          return "cancelled";
        }
      }
    }
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(clipboardText);
      return "copied";
    }
  } catch {
    /* ignore */
  }

  return "failed";
}
