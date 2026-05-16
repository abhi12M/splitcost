"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Loader2,
  Lock,
  TrendingUp,
  Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { AddMemberInputBox } from "@/components/group/AddMemberInputBox";
import { GroupFormFieldBox } from "@/components/group/GroupFormFieldBox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useKeyboardLayout } from "@/hooks/useKeyboardOffset";
import { formatCurrency } from "@/lib/avatar-utils";
import { MEMBERS_MAX } from "@/lib/validations/group.schema";
import { cn } from "@/lib/utils";

const HEADER_HEIGHT = 94;

function StatChip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium",
        className
      )}
    >
      {children}
    </div>
  );
}

type BalanceTone = "positive" | "negative" | "neutral";

type EditGroupMemberCard = {
  key: string;
  name: string;
  id?: string;
  isExisting: boolean;
  balanceInfo: {
    tone: BalanceTone;
    label: string;
    value: number;
  };
};

interface EditGroupMobileProps {
  groupId: string;
  groupName: string;
  onGroupNameChange: (value: string) => void;
  currency: string;
  memberCards: EditGroupMemberCard[];
  newMemberName: string;
  onNewMemberNameChange: (value: string) => void;
  onAddMember: () => void;
  errors: {
    groupName?: string;
    members?: string;
    memberName?: string;
    memberExists?: string;
  };
  summary: {
    getBackCount: number;
    oweCount: number;
  };
  onOpenMember: (memberKey: string) => void;
  onSaveGroup: () => void;
  onDeleteGroup: () => void | Promise<void>;
  isSubmitting?: boolean;
  isDeleting?: boolean;
}

export function EditGroupMobile({
  groupId,
  groupName,
  onGroupNameChange,
  currency,
  memberCards,
  newMemberName,
  onNewMemberNameChange,
  onAddMember,
  errors,
  summary,
  onOpenMember,
  onSaveGroup,
  onDeleteGroup,
  isSubmitting = false,
  isDeleting = false,
}: EditGroupMobileProps) {
  const { keyboardOffset } = useKeyboardLayout();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 touch-none overscroll-none bg-background">
        <div className="flex h-[2.7rem] items-center justify-between border-b px-4">
          <Link href={`/group/${groupId}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="font-medium">Edit group</span>
          <button
            type="button"
            onClick={onSaveGroup}
            disabled={isSubmitting}
            aria-label="Save group"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <Check className="h-5 w-5 text-primary" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto border-b px-3 py-2.5">
          <StatChip>
            <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
            <span className="text-foreground">
              {memberCards.length} member{memberCards.length === 1 ? "" : "s"}
            </span>
          </StatChip>

          <StatChip>
            <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
            <span className="text-foreground">{currency}</span>
          </StatChip>

          <StatChip>
            <TrendingUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
            <span className="text-emerald-600">{summary.getBackCount} gets back</span>
            <span className="text-muted-foreground" aria-hidden>
              ·
            </span>
            <span className="text-rose-600">{summary.oweCount} owes</span>
          </StatChip>
        </div>
      </div>

      <div
        className="fixed left-0 right-0 overflow-y-auto overscroll-contain bg-background"
        style={{
          top: HEADER_HEIGHT,
          bottom: keyboardOffset,
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div className="space-y-5 p-4">
          <GroupFormFieldBox
            icon={Users}
            htmlFor="edit-group-name"
            invalid={!!errors.groupName}
          >
            <Input
              embed
              id="edit-group-name"
              value={groupName}
              onChange={(e) => onGroupNameChange(e.target.value)}
              placeholder="Enter group name (e.g., Trip to Goa)"
              aria-invalid={!!errors.groupName}
            />
          </GroupFormFieldBox>
          {errors.groupName ? (
            <p className="-mt-3 text-xs text-destructive">{errors.groupName}</p>
          ) : null}

          <div className="space-y-3">
            <AddMemberInputBox
              value={newMemberName}
              onChange={onNewMemberNameChange}
              onAdd={onAddMember}
              disabled={memberCards.length >= MEMBERS_MAX}
              invalid={!!errors.members}
              placeholder={
                memberCards.length >= MEMBERS_MAX
                  ? `Maximum ${MEMBERS_MAX} members`
                  : "Add people"
              }
            />

            {errors.memberName ? (
              <p className="text-xs text-destructive">{errors.memberName}</p>
            ) : null}
            {errors.memberExists ? (
              <p className="text-xs text-destructive">{errors.memberExists}</p>
            ) : null}

            <div className="space-y-2">
              {memberCards.map((member) => (
                <button
                  key={member.key}
                  type="button"
                  onClick={() => onOpenMember(member.key)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left transition active:scale-[0.99]",
                    member.balanceInfo.tone === "positive" && "border-emerald-200/80",
                    member.balanceInfo.tone === "negative" && "border-rose-200/80"
                  )}
                >
                  <UserAvatar name={member.name} className="h-10 w-10 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{member.name}</span>
                      {!member.isExisting ? (
                        <Badge variant="outline" className="h-5 shrink-0 border-dashed text-[10px]">
                          New
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-5 text-[10px] font-normal",
                          member.balanceInfo.tone === "positive" &&
                            "border-emerald-200 bg-emerald-50 text-emerald-700",
                          member.balanceInfo.tone === "negative" &&
                            "border-rose-200 bg-rose-50 text-rose-700",
                          member.balanceInfo.tone === "neutral" && "text-muted-foreground"
                        )}
                      >
                        {member.balanceInfo.label}
                      </Badge>
                      {member.balanceInfo.tone !== "neutral" ? (
                        <span
                          className={cn(
                            "text-xs font-medium",
                            member.balanceInfo.tone === "positive" && "text-emerald-700",
                            member.balanceInfo.tone === "negative" && "text-rose-700"
                          )}
                        >
                          {formatCurrency(member.balanceInfo.value, currency)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-destructive/30 p-4">
            <p className="text-sm font-medium">Delete group</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Permanently removes this group and all its expenses.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 w-full border-destructive text-destructive hover:bg-destructive/5"
              onClick={() => setDeleteDialogOpen(true)}
            >
              Delete group
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[320px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete group?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {groupName.trim() || "this group"} and all of its
              expenses. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                void onDeleteGroup();
              }}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
