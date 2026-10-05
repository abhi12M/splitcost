"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, PencilLine, UserMinus, UserPen, UserPlus } from "lucide-react";

import { useToast, type ToastCallbackAction } from "@/hooks/use-toast";
import { useBackButtonClose } from "@/hooks/useBackButtonClose";
import type { GroupChanges } from "@/lib/realtime/groupChanges";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/UserAvatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type MemberKind = "added" | "removed" | "renamed";
type Kind = MemberKind | "groupRenamed";
/** `name` is the current name; `from` is set only for renames. */
type Entry = { id: string; name: string; from?: string };

type Notice = {
  toastId: string;
  entries: Entry[];
  update: (props: { message: string; action?: ToastCallbackAction }) => void;
};

type SheetState = { kind: MemberKind; entries: Entry[]; desktop: boolean };

// Colour says what happened at a glance: green someone joined, red someone
// left, blue something was renamed. Icons differ too, so colour isn't the
// only signal.
const KIND_TOAST = {
  added: { variant: "success", icon: UserPlus },
  removed: { variant: "destructive", icon: UserMinus },
  renamed: { variant: "info", icon: UserPen },
  groupRenamed: { variant: "info", icon: PencilLine },
} as const;

/** The View list is hidden for now; set to true to bring it back. */
const SHOW_VIEW_ACTION = false;

function sameEntries(a: Entry[], b: Entry[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * One persistent toast per kind of change: members added, removed, renamed,
 * and the group renamed. While a kind's toast is still open, later changes
 * merge into it instead of stacking a new one; three or more names collapse
 * into "A, B and N others".
 */
export function useGroupChangeNotices() {
  const t = useTranslations("groupChanges");
  const { toast, toasts, dismiss } = useToast();
  const openToastIds = new Set(toasts.filter((item) => item.open).map((item) => item.id));
  const openToastIdsRef = useRef(openToastIds);
  openToastIdsRef.current = openToastIds;
  const noticesRef = useRef<Record<Kind, Notice | null>>({
    added: null,
    removed: null,
    renamed: null,
    groupRenamed: null,
  });
  const [sheet, setSheet] = useState<SheetState | null>(null);

  const openEntries = (kind: Kind) => {
    const notice = noticesRef.current[kind];
    return notice && openToastIdsRef.current.has(notice.toastId) ? notice.entries : [];
  };

  const buildMessage = (kind: Kind, entries: Entry[]) => {
    const [first, second] = entries;
    const others = entries.length - 2;

    if (kind === "groupRenamed") return t("groupRenamed", { from: first.from ?? "", to: first.name });

    if (kind === "renamed") {
      if (entries.length === 1) return t("renamedOne", { from: first.from ?? "", to: first.name });
      if (entries.length === 2) {
        return t("renamedTwo", { from1: first.from ?? "", to1: first.name, from2: second.from ?? "", to2: second.name });
      }
      return t("renamedMany", { first: first.from ?? "", second: second.from ?? "", count: others });
    }

    if (kind === "added") {
      if (entries.length === 1) return t("addedOne", { name: first.name });
      if (entries.length === 2) return t("addedTwo", { first: first.name, second: second.name });
      return t("addedMany", { first: first.name, second: second.name, count: others });
    }

    if (entries.length === 1) return t("removedOne", { name: first.name });
    if (entries.length === 2) return t("removedTwo", { first: first.name, second: second.name });
    return t("removedMany", { first: first.name, second: second.name, count: others });
  };

  const show = (kind: Kind, entries: Entry[]) => {
    const notice = noticesRef.current[kind];
    const isOpen = notice && openToastIdsRef.current.has(notice.toastId);
    if (isOpen && sameEntries(notice.entries, entries)) return;

    const content = {
      message: buildMessage(kind, entries),
      action:
        SHOW_VIEW_ACTION && kind !== "groupRenamed" && entries.length > 2
          ? {
              label: t("view"),
              // Closing the toast would pop its Back-button history entry and
              // focus the toast viewport, and either one closes the new sheet.
              keepOpen: true,
              callback: () =>
                setSheet({ kind, entries, desktop: window.matchMedia("(min-width: 768px)").matches }),
            }
          : undefined,
    };

    if (isOpen) {
      notice.update(content);
      notice.entries = entries;
      return;
    }

    const handle = toast({
      ...content,
      ...KIND_TOAST[kind],
      duration: Infinity,
      closeOnOutsideClick: false,
    });
    noticesRef.current[kind] = { toastId: handle.id, entries, update: handle.update };
    // Count it as open before the next render, in case another change arrives first.
    openToastIdsRef.current.add(handle.id);
  };

  const dismissNotice = (kind: Kind) => {
    const notice = noticesRef.current[kind];
    if (notice) dismiss(notice.toastId);
    noticesRef.current[kind] = null;
  };

  const notify = ({ added, removed, renamed, name }: GroupChanges) => {
    const removedIds = new Set(removed.map((member) => member.id));
    const renames = new Map(renamed.map((rename) => [rename.id, rename]));

    const prevAdded = openEntries("added");
    const nextAdded = prevAdded
      .filter((entry) => !removedIds.has(entry.id))
      .map((entry) => (renames.has(entry.id) ? { ...entry, name: renames.get(entry.id)!.to } : entry));
    for (const member of added) {
      if (!nextAdded.some((entry) => entry.id === member.id)) nextAdded.push({ id: member.id, name: member.name });
    }

    // A member added in this same toast just shows its latest name there.
    const addedIds = new Set(nextAdded.map((entry) => entry.id));
    const nextRenamed = openEntries("renamed").filter((entry) => !removedIds.has(entry.id));
    for (const rename of renamed) {
      if (addedIds.has(rename.id)) continue;
      const existing = nextRenamed.findIndex((entry) => entry.id === rename.id);
      // Renamed again while the toast is open: show the latest step, since the
      // user has just read the previous one.
      const entry = { id: rename.id, name: rename.to, from: rename.from };
      if (existing >= 0) nextRenamed[existing] = entry;
      else nextRenamed.push(entry);
    }
    const effectiveRenames = nextRenamed.filter((entry) => entry.from !== entry.name);

    const nextRemoved = [...openEntries("removed")];
    for (const member of removed) {
      if (!nextRemoved.some((entry) => entry.id === member.id)) nextRemoved.push({ id: member.id, name: member.name });
    }

    const lists: Record<MemberKind, Entry[]> = { added: nextAdded, removed: nextRemoved, renamed: effectiveRenames };
    for (const kind of ["added", "removed", "renamed"] as const) {
      if (lists[kind].length) {
        show(kind, lists[kind]);
      } else if (openEntries(kind).length) {
        // Everything this toast announced has since been undone.
        dismissNotice(kind);
      }
    }

    // Renamed again while the toast is open: show the latest step, as for members.
    if (name && name.from !== name.to) {
      show("groupRenamed", [{ id: "group", name: name.to, from: name.from }]);
    }
  };

  // The notices describe this screen only; close them when it is left.
  // useToast returns a new dismiss each render, so read the latest at unmount.
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;
  useEffect(() => {
    const notices = noticesRef.current;
    return () => {
      for (const notice of Object.values(notices)) {
        if (notice) dismissRef.current(notice.toastId);
      }
    };
  }, []);

  return {
    notify,
    sheet: <MemberChangesSheet sheet={sheet} onClose={() => setSheet(null)} />,
  };
}

function MemberChangesSheet({ sheet, onClose }: { sheet: SheetState | null; onClose: () => void }) {
  const t = useTranslations("groupChanges");
  const tCommon = useTranslations("common");
  const open = Boolean(sheet);
  useBackButtonClose(open, onClose);

  if (!sheet) return null;

  const title =
    sheet.kind === "added" ? t("addedTitle") : sheet.kind === "removed" ? t("removedTitle") : t("renamedTitle");
  const description =
    sheet.kind === "added"
      ? t("addedDescription")
      : sheet.kind === "removed"
        ? t("removedDescription")
        : t("renamedDescription");

  const list = (
    <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain">
      {sheet.entries.map((entry) => (
        <li key={entry.id} className="flex items-center gap-3 text-sm">
          {sheet.kind === "renamed" ? (
            <>
              <UserAvatar name={entry.from ?? entry.name} size="sm" disableMobileTooltip />
              <span className="min-w-0 truncate">{entry.from}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 truncate font-medium">{entry.name}</span>
            </>
          ) : (
            <>
              <UserAvatar name={entry.name} size="sm" disableMobileTooltip />
              <span className="min-w-0 truncate">{entry.name}</span>
            </>
          )}
        </li>
      ))}
    </ul>
  );

  const handleOpenChange = (next: boolean) => {
    if (!next) onClose();
  };

  if (sheet.desktop) {
    return (
      <Dialog open onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[80vh] max-w-md flex-col">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {list}
          <DialogFooter>
            <Button onClick={onClose}>{tCommon("close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open onOpenChange={handleOpenChange} shouldScaleBackground={false}>
      <DrawerContent className="z-[60] mx-auto flex max-h-[80dvh] max-w-lg flex-col rounded-t-[28px]">
        <DrawerHeader className="text-left">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col px-4">{list}</div>
        <DrawerFooter className="pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <Button variant="outline" onClick={onClose}>
            {tCommon("close")}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
