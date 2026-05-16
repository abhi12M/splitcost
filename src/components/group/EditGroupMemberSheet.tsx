"use client";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { useBackButtonClose } from "@/hooks/useBackButtonClose";

type RemovalState = {
  canRemove: boolean;
  message: string;
};

interface EditGroupMemberSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMember: { name: string } | null;
  renameValue: string;
  renameError?: string;
  onRenameValueChange: (value: string) => void;
  onRenameSave: () => boolean;
  removalState: RemovalState;
  onRemoveMember: () => void;
  enableBackButtonClose?: boolean;
}

export function EditGroupMemberSheet({
  open,
  onOpenChange,
  selectedMember,
  renameValue,
  renameError,
  onRenameValueChange,
  onRenameSave,
  removalState,
  onRemoveMember,
  enableBackButtonClose = false,
}: EditGroupMemberSheetProps) {
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && selectedMember) {
      const saved = onRenameSave();
      if (!saved) return;
    }
    onOpenChange(nextOpen);
  };

  useBackButtonClose(
    enableBackButtonClose && open,
    () => handleOpenChange(false)
  );

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="mx-auto max-w-lg rounded-t-[28px]">
        {selectedMember ? (
          <>
            <div className="space-y-4 px-5 pb-2 pt-5">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="member-rename">
                  Member name
                </label>
                <Input
                  id="member-rename"
                  value={renameValue}
                  onChange={(e) => onRenameValueChange(e.target.value)}
                  placeholder="Member name"
                  aria-invalid={!!renameError}
                />
                {renameError ? (
                  <p className="text-xs text-destructive">{renameError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Name changes are saved when you save the group.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-rose-200/80 bg-rose-50/50 p-3">
                <p className="text-sm font-medium text-rose-900">Remove member</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {removalState.canRemove
                    ? "Only if not linked to any expense."
                    : removalState.message ||
                      "This member is in an expense and cannot be removed."}
                </p>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="mt-3 w-full"
                  disabled={!removalState.canRemove}
                  onClick={onRemoveMember}
                >
                  Remove member
                </Button>
              </div>
            </div>

            <DrawerFooter className="px-5 pb-6">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            </DrawerFooter>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
