"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { useBackButtonClose } from "@/hooks/useBackButtonClose";
import { useKeyboardLayout } from "@/hooks/useKeyboardOffset";

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
  const renameInputRef = useRef<HTMLInputElement>(null);
  const { keyboardOffset, keyboardOpen, viewportHeight } = useKeyboardLayout();

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

  const drawerMaxHeight =
    viewportHeight != null ? `${viewportHeight - 8}px` : undefined;

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} shouldScaleBackground={false}>
      <DrawerContent
        className="z-[60] mx-auto flex max-h-[min(92dvh,100%)] max-w-lg flex-col rounded-t-[28px]"
        style={{
          bottom: keyboardOffset > 0 ? keyboardOffset : undefined,
          maxHeight: drawerMaxHeight,
        }}
      >
        {selectedMember ? (
          <>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pb-2 pt-5">
              <div className="space-y-2 scroll-mt-4">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="member-rename">
                  Member name
                </label>
                <Input
                  ref={renameInputRef}
                  id="member-rename"
                  value={renameValue}
                  onChange={(e) => onRenameValueChange(e.target.value)}
                  placeholder="Member name"
                  aria-invalid={!!renameError}
                  className="scroll-mt-4"
                  onFocus={() => {
                    requestAnimationFrame(() => {
                      renameInputRef.current?.scrollIntoView({
                        block: keyboardOpen ? "center" : "nearest",
                        behavior: "smooth",
                      });
                    });
                  }}
                />
                {renameError ? (
                  <p className="text-xs text-destructive">{renameError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Name changes are saved when you save the group.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 dark:bg-destructive/10">
                <p className="text-sm font-medium">Remove member</p>
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

            <DrawerFooter className="shrink-0 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
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
