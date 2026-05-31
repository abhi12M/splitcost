const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/i;

/** Placeholder IDs from `.env.development` — never send hits. */
const GA_PLACEHOLDER_PATTERN = /^G-X+$/i;

export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";

export function isGoogleAnalyticsEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  if (!GA_MEASUREMENT_ID_PATTERN.test(GA_MEASUREMENT_ID)) {
    return false;
  }

  if (GA_PLACEHOLDER_PATTERN.test(GA_MEASUREMENT_ID)) {
    return false;
  }

  return true;
}
