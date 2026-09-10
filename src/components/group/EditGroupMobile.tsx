"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
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
import { MobileGroupFormLayout } from "@/components/group/MobileGroupFormLayout";
import { balanceStyles } from "@/lib/brand-styles";
import { formatCurrency } from "@/lib/avatar-utils";
import { MEMBERS_MAX } from "@/lib/validations/group.schema";
import { cn } from "@/lib/utils";

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

const truncateMemberName = (name: string, maxLength = 24) =>
  name.length > maxLength ? `${name.slice(0, maxLength - 1)}…` : name;

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
  const t = useTranslations("group");
  const tCommon = useTranslations("common");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingMemberConfirmation, setPendingMemberConfirmation] = useState<string | null>(null);
  const memberInputRef = useRef<HTMLInputElement>(null);
  const displayedPendingMember = pendingMemberConfirmation
    ? truncateMemberName(pendingMemberConfirmation)
    : null;

  const handleSaveRequest = () => {
    const pendingMember = newMemberName.trim();
    if (pendingMember) {
      setPendingMemberConfirmation(pendingMember);
      return;
    }
    onSaveGroup();
  };

  return (
    <>
      <MobileGroupFormLayout
        header={
          <>
            <div className="flex h-[2.7rem] items-center justify-between border-b px-4">
              <Link href={`/group/${groupId}`}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <span className="font-medium">{t("editGroup")}</span>
              <button
                type="button"
                onClick={handleSaveRequest}
                disabled={isSubmitting}
                aria-label={t("saveGroup")}
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
                  {t("memberCount", { count: memberCards.length })}
                </span>
              </StatChip>

              <StatChip>
                <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                <span className="text-foreground">{currency}</span>
              </StatChip>

              <StatChip>
                <TrendingUp
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                  strokeWidth={1.75}
                />
                <span className={balanceStyles.positiveSummary}>{t("getsBackCount", { count: summary.getBackCount })}</span>
                <span className="text-muted-foreground" aria-hidden>
                  ·
                </span>
                <span className={balanceStyles.negativeSummary}>{t("owesCount", { count: summary.oweCount })}</span>
              </StatChip>
            </div>
          </>
        }
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
              placeholder={t("enterGroupNamePlaceholder")}
              aria-invalid={!!errors.groupName}
            />
          </GroupFormFieldBox>
          <div className="space-y-3">
            <AddMemberInputBox
              inputRef={memberInputRef}
              value={newMemberName}
              onChange={onNewMemberNameChange}
              onAdd={onAddMember}
              disabled={memberCards.length >= MEMBERS_MAX}
              invalid={Boolean(errors.members || errors.memberName || errors.memberExists)}
              placeholder={
                memberCards.length >= MEMBERS_MAX
                  ? t("maximumMembers", { max: MEMBERS_MAX })
                  : t("addMember")
              }
            />

            <div className="space-y-2">
              {memberCards.map((member) => (
                <button
                  key={member.key}
                  type="button"
                  onClick={() => onOpenMember(member.key)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left transition active:scale-[0.99]",
                    member.balanceInfo.tone === "positive" && balanceStyles.positiveMemberBorderSubtle,
                    member.balanceInfo.tone === "negative" && balanceStyles.negativeMemberBorderSubtle
                  )}
                >
                  <UserAvatar name={member.name} className="h-10 w-10 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{member.name}</span>
                      {!member.isExisting ? (
                        <Badge variant="outline" className="h-5 shrink-0 border-dashed text-[10px]">
                          {t("newBadge")}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-5 text-[10px] font-normal",
                          member.balanceInfo.tone === "positive" && balanceStyles.positiveBadge,
                          member.balanceInfo.tone === "negative" && balanceStyles.negativeBadge,
                          member.balanceInfo.tone === "neutral" && "text-muted-foreground"
                        )}
                      >
                        {member.balanceInfo.label}
                      </Badge>
                      {member.balanceInfo.tone !== "neutral" ? (
                        <span
                          className={cn(
                            "text-xs font-medium",
                            member.balanceInfo.tone === "positive" && balanceStyles.positiveText,
                            member.balanceInfo.tone === "negative" && balanceStyles.negativeText
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
            <p className="text-sm font-medium">{t("deleteGroup")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("deleteGroupHint")}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 w-full border-destructive text-destructive hover:bg-destructive/5"
              onClick={() => setDeleteDialogOpen(true)}
            >
              {t("deleteGroup")}
            </Button>
          </div>
        </div>
      </MobileGroupFormLayout>

      <AlertDialog
        open={pendingMemberConfirmation !== null}
        onOpenChange={(open) => {
          if (!open) setPendingMemberConfirmation(null);
        }}
      >
        <AlertDialogContent className="max-w-[min(100vw-2rem,22rem)] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("pendingMemberTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {displayedPendingMember
                ? t("pendingMemberDescription", { name: displayedPendingMember })
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel
              className="mt-0 w-full rounded-xl"
              onClick={() => requestAnimationFrame(() => memberInputRef.current?.focus())}
            >
              {t("keepEditing")}
            </AlertDialogCancel>
            <AlertDialogAction className="w-full rounded-xl" onClick={onSaveGroup}>
              {t("saveWithoutMember")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[320px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteGroupTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                {t("deleteGroupConfirm")}
              </span>
              <span className="block">
                {t("deleteGroupWarning")}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                void onDeleteGroup();
              }}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
