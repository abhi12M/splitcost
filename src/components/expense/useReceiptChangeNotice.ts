"use client";

import { useTranslations } from "next-intl";

import { toast } from "@/hooks/use-toast";
import type { ReceiptChange } from "@/lib/realtime/expenseChanges";

/**
 * Tells the user that someone else changed this expense's receipt in another
 * session. Used by the expense view and the edit form. `keptMine` is for an
 * edit form whose user had already changed the receipt there: their change
 * stays, so the message must not say the latest version is showing.
 */
export function useReceiptChangeNotice() {
  const t = useTranslations("receiptChanges");

  return (change: ReceiptChange, options?: { keptMine?: boolean }) => {
    if (options?.keptMine) {
      toast({ title: t("changedTitle"), description: t("changedDescription"), variant: "info" });
      return;
    }
    toast({
      title: t(`${change}Title`),
      description: t(`${change}Description`),
      variant: "info",
    });
  };
}
