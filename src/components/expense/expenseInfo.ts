import { SplitType } from "@/lib/storage";

type PaidByMode = "single" | "multiple";

type ExpenseInfoTranslate = (
  key: string,
  values?: Record<string, string | number>
) => string;

export function getPaidByInfoContent(
  mode: PaidByMode,
  t: ExpenseInfoTranslate
) {
  if (mode === "single") {
    return {
      title: t("paidBySingle"),
      description: t("paidBySingleDesc"),
    };
  }

  return {
    title: t("paidByMultiple"),
    description: t("paidByMultipleDesc"),
  };
}

export function getSplitInfoText(splitType: SplitType, t: ExpenseInfoTranslate) {
  if (splitType === "equal") {
    return t("splitEqualInfo");
  }

  if (splitType === "percentage") {
    return t("splitPercentInfo");
  }

  return t("splitCustomInfo");
}
