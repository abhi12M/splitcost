// utils/formatters.ts
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

export const formatDisplayDate = (date: string | Date) => {
  const value = typeof date === "string" ? new Date(date) : date;

  if (Number.isNaN(value.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
};

export const formatDisplayDateTime = (date?: string | Date | null) => {
  if (!date) {
    return "N/A";
  }

  const value = typeof date === "string" ? new Date(date) : date;

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
