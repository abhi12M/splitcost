"use client";

import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { GenericAlertDialog } from "@/components/ui/generic-alert-dialog";

/**
 * Shown when the group is deleted in another session. It blocks the screen:
 * there is no dismiss, because nothing on it can be viewed or saved any more.
 */
export function GroupDeletedDialog({ open }: { open: boolean }) {
  const t = useTranslations("groupChanges");
  const router = useRouter();

  return (
    <GenericAlertDialog
      open={open}
      aboveOverlays
      // Esc and outside clicks request a close; the dialog stays until the
      // user leaves the screen.
      onOpenChange={() => {}}
      title={t("deletedTitle")}
      description={t("deletedDescription")}
      actions={[{ label: t("goToMyGroups"), onClick: () => router.replace("/groups") }]}
    />
  );
}
