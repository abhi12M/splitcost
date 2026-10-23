"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { ResourceNotFound } from "@/components/ResourceNotFound";
import { isGroupDeleted } from "@/lib/storage";

/**
 * Shown when an expense can't be loaded. Deleting a group deletes its
 * expenses too, so a missing expense often means a missing group: check, and
 * say "group not found" in that case instead of pointing back to it.
 */
export function ExpenseNotFound({ groupId, loading }: { groupId: string; loading: ReactNode }) {
  const t = useTranslations("expense");
  const tCommon = useTranslations("common");
  const [groupGone, setGroupGone] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void isGroupDeleted(groupId).then((gone) => {
      if (active) setGroupGone(gone);
    });
    return () => {
      active = false;
    };
  }, [groupId]);

  if (groupGone === null) return <>{loading}</>;

  return groupGone ? (
    <ResourceNotFound message={tCommon("groupNotFound")} actionLabel={tCommon("goHome")} actionHref="/" />
  ) : (
    <ResourceNotFound message={tCommon("expenseNotFound")} actionLabel={t("backToGroup")} actionHref={`/group/${groupId}`} />
  );
}
