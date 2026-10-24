"use client";

import type { SyntheticEvent } from "react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";

import { GenericAlertDialog } from "@/components/ui/generic-alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ActionMenuProps = {
  editHref?: string;
  onDelete?: () => Promise<void> | void;
  isDeleting?: boolean;
  deleteTitle: string;
  deleteDescription: string;
  deleteLabel?: string;
  align?: "start" | "center" | "end";
  contentClassName?: string;
  triggerClassName?: string;
  stopPropagation?: boolean;
};

export function ActionMenu({
  editHref,
  onDelete,
  isDeleting = false,
  deleteTitle,
  deleteDescription,
  deleteLabel,
  align = "end",
  contentClassName,
  triggerClassName,
  stopPropagation = false,
}: ActionMenuProps) {
  const t = useTranslations("actionMenu");
  const resolvedDeleteLabel = deleteLabel ?? t("delete");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const stopClickPropagation = (event: SyntheticEvent) => {
    if (!stopPropagation) return;
    event.stopPropagation();
  };

  const stopTriggerEvent = (event: SyntheticEvent) => {
    if (!stopPropagation) return;
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDeleteSelect = (event: Event) => {
    if (stopPropagation) {
      event.preventDefault();
    }
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    await onDelete?.();
  };

  return (
    <GenericAlertDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      trigger={<DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t("openActions")}
            disabled={isDeleting}
            onClick={stopTriggerEvent}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted transition-colors outline-none disabled:opacity-50",
              triggerClassName
            )}
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align={align}
          onClick={stopPropagation ? (event) => event.stopPropagation() : undefined}
          className={cn("w-36 rounded-xl p-1.5 border-muted shadow-lg", contentClassName)}
        >
          {editHref ? (
            <DropdownMenuItem asChild className="rounded-lg cursor-pointer gap-2 py-2">
              <Link href={editHref} onClick={stopPropagation ? stopClickPropagation : undefined}>
                <Pencil className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{t("edit")}</span>
              </Link>
            </DropdownMenuItem>
          ) : null}

          {onDelete ? (
            <DropdownMenuItem
              onSelect={handleDeleteSelect}
              className="rounded-lg cursor-pointer gap-2 py-2 text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm">{resolvedDeleteLabel}</span>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>}
      onContentClick={stopPropagation ? (event) => event.stopPropagation() : undefined}
      title={deleteTitle}
      description={deleteDescription}
      contentClassName="max-w-[290px] rounded-2xl"
      titleClassName="text-lg"
      descriptionClassName="text-xs"
      footerClassName="flex-row gap-2 mt-4"
      actions={[
        { label: t("cancel"), type: "cancel", className: "flex-1 mt-0 border-none bg-muted hover:bg-muted/80" },
        {
          label: resolvedDeleteLabel,
          pendingLabel: t("deleting"),
          onClick: handleConfirmDelete,
          async: true,
          className: "flex-1 bg-destructive hover:bg-destructive/90 text-white",
        },
      ]}
    />
  );
}
