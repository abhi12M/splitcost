import { SplitType } from "@/lib/storage";

type PaidByMode = "single" | "multiple";

export function getPaidByInfoContent(mode: PaidByMode) {
  if (mode === "single") {
    return {
      title: "Paid by one person",
      description: "One person paid the entire amount.",
    };
  }

  return {
    title: "Paid by multiple people",
    description:
      "Split the payment between multiple people.\nMake sure the total matches the expense.",
  };
}

export function getSplitInfoText(
  splitType: SplitType,
  amount: number,
  currency: string
) {
  if (splitType === "equal") {
    return "The total amount is split equally among selected participants.\nEach person pays the same amount.";
  }

  // if (splitType === "percentage") {
  //   return "Enter the exact amount each selected participant should pay.\nThe total of all amounts must equal the full bill.\nValue must be between 1.00% and 99.00%.";
  // }
  if (splitType === "percentage") {
    return "Enter the exact amount each selected participant should pay.\nThe total of all amounts must equal the full bill.";
  }

  return `Enter the percentage each participant should pay.\nThe total must equal 100%.`;
  // return `Enter the percentage each participant should pay.\nThe total must equal 100%.\nValue must be between ${formatAmount(
  //   1,
  //   currency
  // )} and ${
  //   amount ? formatAmount(Math.max(amount - 1, 0), currency) : "the amount"
  // }.`;
}
