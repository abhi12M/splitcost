// utils/formatters.ts
export const toCurrencyMinorUnits = (amount: number) => {
  return Math.round(Number(amount || 0) * 100);
};

export const fromCurrencyMinorUnits = (amount: number) => {
  return amount / 100;
};

export const getRoundedDifference = (
  target: number,
  current: number,
  precision = 2
) => {
  const scale = 10 ** precision;
  return (Math.round(Number(target || 0) * scale) -
    Math.round(Number(current || 0) * scale)) / scale;
};

export const getCurrencyDifference = (target: number, current: number) => {
  return fromCurrencyMinorUnits(
    toCurrencyMinorUnits(target) - toCurrencyMinorUnits(current)
  );
};

export const formatAmount = (amount: number, currency?: string) => {
  if (currency) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatInputDisplayValue = (
  rawValue: string,
  formatOnBlur?: "currency" | "number",
  currency?: string,
) => {
  if (!formatOnBlur || rawValue.trim() === "") {
    return rawValue;
  }

  const num = Number(rawValue);
  if (Number.isNaN(num)) {
    return rawValue;
  }

  return formatOnBlur === "currency"
    ? formatAmount(num, currency)
    : formatAmount(num);
};

export const toTitleCase = (text) => {
  if (!text) return "";

  return text
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}


export const formatDateForDB = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Parse `YYYY-MM-DD` as a local calendar date (avoids UTC shift from `new Date("YYYY-MM-DD")`). */
function parseDateInput(date: string | Date): Date {
  if (typeof date === "string" && ISO_DATE_ONLY.test(date.trim())) {
    const [y, m, d] = date.trim().split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return typeof date === "string" ? new Date(date) : date;
}

export const formatDisplayDate = (date: string | Date) => {
  const value = parseDateInput(date);

  if (Number.isNaN(value.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
};

export type ExpenseDashboardGroupBy = "date" | "paidBy" | "category" | "splitType";

/** Label for grouped expense sections on the group dashboard (e.g. date → "9 May 2026"). */
export function formatExpenseGroupHeaderTitle(
  title: string,
  groupBy: ExpenseDashboardGroupBy,
  shouldTitleCase: boolean,
): string {
  if (!title) return title;
  if (groupBy === "date" && ISO_DATE_ONLY.test(title.trim())) {
    return formatDisplayDate(title) || title;
  }
  return shouldTitleCase ? toTitleCase(title) : title;
}

export const formatDisplayDateTime = (date?: string | Date | null) => {
  if (!date) {
    return "N/A";
  }

  const value = parseDateInput(date);

  if (Number.isNaN(value.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
};
