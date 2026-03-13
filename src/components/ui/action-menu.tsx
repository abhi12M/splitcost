"use client";

import type { SyntheticEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  deleteLabel = "Delete",
  align = "end",
  contentClassName,
  triggerClassName,
  stopPropagation = false,
}: ActionMenuProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const stopEvent = (event: SyntheticEvent) => {
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
    setConfirmOpen(false);
  };

  return (
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Open actions"
            disabled={isDeleting}
            onClick={stopEvent}
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
              <Link href={editHref} onClick={stopPropagation ? stopEvent : undefined}>
                <Pencil className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Edit</span>
              </Link>
            </DropdownMenuItem>
          ) : null}

          {onDelete ? (
            <DropdownMenuItem
              onSelect={handleDeleteSelect}
              className="rounded-lg cursor-pointer gap-2 py-2 text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm">{deleteLabel}</span>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialogContent
        onClick={stopPropagation ? (event) => event.stopPropagation() : undefined}
        className="max-w-[290px] rounded-2xl"
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg">{deleteTitle}</AlertDialogTitle>
          <AlertDialogDescription className="text-xs">
            {deleteDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-2 mt-4">
          <AlertDialogCancel className="flex-1 mt-0 rounded-xl border-none bg-muted hover:bg-muted/80">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="flex-1 rounded-xl bg-destructive hover:bg-destructive/90 text-white"
          >
            {isDeleting ? "Deleting..." : deleteLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
