"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AlertTriangle, ArrowLeft, Check, ChevronDown, Users, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SingleSelect } from "@/components/ui/single-select";
import { AddMemberInputBox } from "@/components/group/AddMemberInputBox";
import { GroupFormFieldBox } from "@/components/group/GroupFormFieldBox";
import { AvatarGroup, UserAvatar } from "@/components/ui/UserAvatar";
import { CURRENCIES } from "@/constants";
import { MobileGroupFormLayout } from "@/components/group/MobileGroupFormLayout";
import {
  GROUP_NAME_MAX,
  MEMBER_NAME_MAX,
  MEMBERS_MAX,
  MEMBERS_MIN,
} from "@/lib/validations/group.schema";
import { createGroupSchemas } from "@/lib/validations/group.schema.i18n";
import { isMemberNameAlreadyAdded } from "@/lib/validations/group-members";
import { GenericAlertDialog } from "@/components/ui/generic-alert-dialog";

interface GroupFormMobileProps {
  backHref?: string;
  initialCurrency?: string;
  onSubmit: (data: { name: string; currency: string; members: string[] }) => Promise<void>;
}

const truncateMemberName = (name: string, maxLength = 24) =>
  name.length > maxLength ? `${name.slice(0, maxLength - 1)}…` : name;

export function GroupFormMobile({
  backHref = "/",
  initialCurrency = "INR",
  onSubmit,
}: GroupFormMobileProps) {
  const t = useTranslations("group");
  const tCommon = useTranslations("common");
  const tVal = useTranslations("group.validation");
  const { GroupSchema, MemberNameSchema } = useMemo(
    () =>
      createGroupSchemas({
        memberNameRequired: tVal("memberNameRequired"),
        memberNameMax: tVal("memberNameMax", { max: MEMBER_NAME_MAX }),
        groupNameRequired: tVal("groupNameRequired"),
        groupNameMax: tVal("groupNameMax", { max: GROUP_NAME_MAX }),
        membersMin: tVal("membersMin", { min: MEMBERS_MIN }),
        membersMax: tVal("membersMax", { max: MEMBERS_MAX }),
      }),
    [tVal]
  );

  const [groupName, setGroupName] = useState("");
  const [currency, setCurrency] = useState(initialCurrency);
  const [members, setMembers] = useState<string[]>([]);
  const [newMember, setNewMember] = useState("");
  const [pendingMemberConfirmation, setPendingMemberConfirmation] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [validationMessages, setValidationMessages] = useState<string[]>([]);
  const [isDuplicateMemberDialog, setIsDuplicateMemberDialog] = useState(false);
  const memberInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<{
    groupName?: string;
    members?: string;
    memberName?: string;
    memberExists?: string;
  }>({});
  const currencyMeta = CURRENCIES.find((c) => c.code === currency);
  const displayedPendingMember = pendingMemberConfirmation
    ? truncateMemberName(pendingMemberConfirmation)
    : null;
  const isPendingMemberAlreadyAdded = pendingMemberConfirmation
    ? isMemberNameAlreadyAdded(members, pendingMemberConfirmation)
    : false;
  const hasReachedMemberLimit = members.length >= MEMBERS_MAX;

  const validate = useCallback(() => {
    const result = GroupSchema.safeParse({ groupName, members });
    if (!result.success) {
      const e = result.error.format();
      const next = {
        groupName: e.groupName?._errors[0],
        members: e.members?._errors[0],
        memberName: undefined as string | undefined,
        memberExists: undefined as string | undefined,
      };
      setErrors(next);
      return { valid: false, errors: next };
    }
    setErrors({});
    return { valid: true, errors: {} };
  }, [groupName, members]);

  useEffect(() => {
    if (hasSubmitted) validate();
  }, [groupName, members, hasSubmitted, validate]);

  useEffect(() => {
    if (!groupName.trim()) {
      setErrors((prev) => ({ ...prev, groupName: undefined }));
      return;
    }
    const nameResult = GroupSchema.shape.groupName.safeParse(groupName);
    setErrors((prev) => ({
      ...prev,
      groupName: nameResult.success ? undefined : nameResult.error.issues[0]?.message,
    }));
  }, [groupName]);

  useEffect(() => {
    const trimmed = newMember.trim();
    if (!trimmed) {
      setErrors((prev) => ({ ...prev, memberName: undefined, memberExists: undefined }));
      return;
    }
    const memberResult = MemberNameSchema.safeParse(newMember);
    setErrors((prev) => ({
      ...prev,
      // The user is adding a member, so the previous minimum-member error is being corrected.
      members: undefined,
      memberName: memberResult.success ? undefined : memberResult.error.issues[0]?.message,
      memberExists: isMemberNameAlreadyAdded(members, trimmed)
        ? t("memberAlreadyAdded", { name: truncateMemberName(trimmed) })
        : undefined,
    }));
  }, [newMember, members]);

  function showValidationDialog(validationErrors: typeof errors) {
    const messages = [
      validationErrors.groupName,
      validationErrors.members,
      validationErrors.memberName,
      validationErrors.memberExists,
    ].filter(Boolean) as string[];

    if (messages.length === 0) return;

    memberInputRef.current?.blur();
    setIsDuplicateMemberDialog(Boolean(validationErrors.memberExists));
    setValidationMessages(messages);
  }

  const handleAddMember = () => {
    const trimmed = newMember.trim();
    if (!trimmed) return;

    if (members.length >= MEMBERS_MAX) {
      const message = tVal("membersMax", { max: MEMBERS_MAX });
      setErrors((prev) => ({ ...prev, members: message }));
      showValidationDialog({ members: message });
      return;
    }
    const result = MemberNameSchema.safeParse(newMember);
    if (!result.success) {
      const message = result.error.issues[0].message;
      setErrors((prev) => ({ ...prev, memberName: message }));
      showValidationDialog({ memberName: message });
      return;
    }
    if (isMemberNameAlreadyAdded(members, trimmed)) {
      const message = t("memberAlreadyAdded", { name: truncateMemberName(trimmed) });
      setErrors((prev) => ({ ...prev, memberExists: message }));
      showValidationDialog({ memberExists: message });
      return;
    }
    setMembers([...members, trimmed]);
    setNewMember("");
    setErrors((prev) => ({
      ...prev,
      memberName: undefined,
      memberExists: undefined,
      members: undefined,
    }));
  };

  const submitGroup = async () => {
    await onSubmit({ name: groupName.trim(), currency, members });
  };

  const handleSubmit = async () => {
    setHasSubmitted(true);
    const validation = validate();
    if (!validation.valid) {
      showValidationDialog(validation.errors);
      return;
    }

    const pendingMember = newMember.trim();
    if (pendingMember) {
      setPendingMemberConfirmation(pendingMember);
      return;
    }

    await submitGroup();
  };

  return (
    <MobileGroupFormLayout
      header={
        <>
          <div className="flex h-[2.7rem] items-center justify-between border-b px-4">
            <Link href={backHref}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-medium">{t("createGroup")}</h1>
            <button type="button" onClick={handleSubmit} aria-label={t("createGroup")}>
              <Check className="h-5 w-5 text-primary" />
            </button>
          </div>

          <div className="flex items-center gap-2 border-b px-4 py-1">
            <span className="text-sm text-muted-foreground">{t("membersLabel")}</span>
            {members.length > 0 ? (
              <AvatarGroup names={members} isShowTotalMemberText={false} size="sm" max={8} />
            ) : (
              <span className="text-xs text-muted-foreground">{t("noneYet")}</span>
            )}
          </div>
        </>
      }
    >
      <div className="space-y-5 p-4">
          <GroupFormFieldBox
            icon={Users}
            htmlFor="group-name"
            invalid={!!errors.groupName}
          >
            <Input
              embed
              id="group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder={t("enterGroupNamePlaceholder")}
              aria-invalid={!!errors.groupName}
            />
          </GroupFormFieldBox>

          <SingleSelect
              items={CURRENCIES.map((m) => ({
                id: m.code,
                label: m.name,
                icon: m.symbol,
              }))}
              value={{ itemId: currency }}
              onSelect={(_, itemId) => setCurrency(itemId)}
              inputPlaceholder={t("searchCurrency")}
              fullscreenOnMobile
              isDisplayId
              trigger={
                <button
                  type="button"
                  className="flex h-12 w-full items-center border border-border bg-card"
                >
                  <span className="min-w-0 flex-1 truncate px-3 text-left text-sm font-medium text-foreground">
                    {currencyMeta
                      ? `${currencyMeta.symbol} ${currencyMeta.code} · ${currencyMeta.name}`
                      : t("selectCurrency")}
                  </span>
                  <ChevronDown
                    className="mr-3 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </button>
              }
            />

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
                value={newMember}
                onChange={setNewMember}
                onAdd={handleAddMember}
                invalid={Boolean(errors.members || errors.memberName || errors.memberExists)}
                placeholder={t("addMember")}
              />
            )}

            {members.length > 0 ? (
              <div className="space-y-2">
                {members.map((name, index) => (
                  <div
                    key={`${name}-${index}`}
                    className="flex items-center gap-3 rounded-2xl border bg-card p-3"
                  >
                    <UserAvatar name={name} className="h-10 w-10" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
                    <button
                      type="button"
                      onClick={() => setMembers(members.filter((m) => m !== name))}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={tCommon("removeName", { name })}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
      </div>
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
          { label: t("saveWithoutMember"), onClick: () => void submitGroup() },
        ]}
      />
      <GenericAlertDialog
        open={validationMessages.length > 0}
        onOpenChange={(open) => {
          if (!open) {
            setValidationMessages([]);
            setIsDuplicateMemberDialog(false);
          }
        }}
        title={isDuplicateMemberDialog ? t("memberAlreadyAddedTitle") : tCommon("cannotSaveGroup")}
        messages={validationMessages}
        actions={[{
          label: tCommon("gotIt"),
          onClick: () => {
            setValidationMessages([]);
            setIsDuplicateMemberDialog(false);
          },
        }]}
      />
    </MobileGroupFormLayout>
  );
}
