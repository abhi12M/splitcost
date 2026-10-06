import { useCallback, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

function startOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Locale-aware labels for activity timestamps ("2 minutes ago", "Yesterday", "Oct 3", "9:42 PM"). */
export function useActivityTime() {
  const locale = useLocale();
  const t = useTranslations("activity");
  const relative = useMemo(() => new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "long" }), [locale]);
  const clock = useMemo(() => new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }), [locale]);
  const dayMonth = useMemo(() => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }), [locale]);
  const dayMonthYear = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }),
    [locale]
  );

  /** "Oct 3" this year, "Oct 3, 2025" otherwise. */
  const formatDate = useCallback(
    (date: Date) => (date.getFullYear() === new Date().getFullYear() ? dayMonth : dayMonthYear).format(date),
    [dayMonth, dayMonthYear]
  );

  const dayKey = useCallback((at: string) => String(startOfDay(new Date(at).getTime())), []);

  const dayLabel = useCallback(
    (at: string) => {
      const day = startOfDay(new Date(at).getTime());
      const today = startOfDay(Date.now());
      if (day === today) return t("today");
      // The day before today's midnight, so it holds across daylight-saving changes.
      if (day === startOfDay(today - 1)) return t("yesterday");
      return formatDate(new Date(day));
    },
    [formatDate, t]
  );

  /** "Just now" / "5 minutes ago" / "3 hours ago" for the last few hours, the clock time otherwise. */
  const shortTime = useCallback(
    (at: string) => {
      const ms = new Date(at).getTime();
      const diff = Date.now() - ms;
      if (diff < MINUTE) return t("justNow");
      if (diff < HOUR) return relative.format(-Math.floor(diff / MINUTE), "minute");
      if (diff < 6 * HOUR) return relative.format(-Math.floor(diff / HOUR), "hour");
      return clock.format(ms);
    },
    [clock, relative, t]
  );

  const isJustNow = useCallback((at: string) => Date.now() - new Date(at).getTime() < MINUTE, []);

  const dayAtTime = useCallback(
    (at: string) => t("dayAtTime", { day: dayLabel(at), time: clock.format(new Date(at).getTime()) }),
    [clock, dayLabel, t]
  );

  return { dayKey, dayLabel, shortTime, isJustNow, dayAtTime, formatDate };
}
