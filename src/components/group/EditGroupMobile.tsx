"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowLeft,
  AlertTriangle,
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
import { GenericAlertDialog } from "@/components/ui/generic-alert-dialog";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { MobileGroupFormLayout } from "@/components/group/MobileGroupFormLayout";
import { balanceStyles } from "@/lib/brand-styles";
import { formatCurrency } from "@/lib/avatar-utils";
import { MEMBERS_MAX } from "@/lib/validations/group.schema";
import { isMemberNameAlreadyAdded } from "@/lib/validations/group-members";
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
  const isPendingMemberAlreadyAdded = pendingMemberConfirmation
    ? isMemberNameAlreadyAdded(
        memberCards.map((member) => member.name),
        pendingMemberConfirmation
      )
    : false;
  const hasReachedMemberLimit = memberCards.length >= MEMBERS_MAX;

  const handleSaveRequest = () => {
    const pendingMember = newMemberName.trim();
    if (pendingMember) {
      setPendingMemberConfirmation(pendingMember);
      return;
    }
    onSaveGroup();
  };

  const handleAddMember = () => {
    // Keep the soft keyboard from remaining active if validation opens an
    // alert (for example, when this member has already been added).
    memberInputRef.current?.blur();
    onAddMember();
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
            {hasReachedMemberLimit ? (
              <div
                role="status"
                className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-950 dark:text-amber-100"
              >
                <AlertTriangle className="h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                <p className="text-sm leading-5">
                  <span className="font-semibold">{t("memberLimitReached", { max: MEMBERS_MAX })}</span>{" "}
                  {t("removeMemberToAdd")}
                </p>
              </div>
            ) : (
              <AddMemberInputBox
                inputRef={memberInputRef}
                value={newMemberName}
                onChange={onNewMemberNameChange}
                onAdd={handleAddMember}
                invalid={Boolean(errors.members || errors.memberName || errors.memberExists)}
                placeholder={t("addMember")}
              />
            )}

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

      <GenericAlertDialog
        open={pendingMemberConfirmation !== null}
        onOpenChange={(open) => {
          if (!open) setPendingMemberConfirmation(null);
        }}
        title={isPendingMemberAlreadyAdded ? t("memberAlreadyInGroupTitle") : t("pendingMemberTitle")}
        description={
          <span>
            {displayedPendingMember
              ? isPendingMemberAlreadyAdded
                ? t("memberAlreadyInGroupDescription", { name: displayedPendingMember })
                : t("pendingMemberDescription", { name: displayedPendingMember })
              : ""}
          </span>
        }
        actions={[
          {
            label: t("keepEditing"),
            type: "cancel",
            className: "mt-0",
            onClick: () => requestAnimationFrame(() => memberInputRef.current?.focus()),
          },
          { label: t("saveWithoutMember"), onClick: onSaveGroup },
        ]}
      />
      <GenericAlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("deleteGroupTitle")}
        description={<div>
              <span className="block">
                {t("deleteGroupConfirm")}
              </span>
              <span className="block">
                {t("deleteGroupWarning")}
              </span>
            </div>}
        actions={[
          { label: tCommon("cancel"), type: "cancel", disabled: isDeleting },
          {
            label: isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : tCommon("delete"),
            className: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            disabled: isDeleting,
            onClick: (e) => {
                e.preventDefault();
                void onDeleteGroup();
            },
          },
        ]}
      />
    </>
  );
}
