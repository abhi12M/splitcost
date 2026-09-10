"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  CircleDollarSign,
  Loader2,
  Save,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";

import { EditGroupMobile } from "@/components/group/EditGroupMobile";
import { EditGroupMemberSheet } from "@/components/group/EditGroupMemberSheet";
import { Layout } from "@/components/layout/Layout";
import { Spinner } from "@/components/ui/Spinner";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useMdUp } from "@/hooks/useDeviceType";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { balanceStyles } from "@/lib/brand-styles";
import { formatCurrency } from "@/lib/avatar-utils";
import { LOCAL_GROUPS_KEY } from "@/lib/constants";
import { getEncryptedItem, setEncryptedItem } from "@/lib/localStorage";
import {
  canRemoveGroupMember,
  deleteGroup,
  GroupDashboardInterface,
  GroupFormMember,
  updateGroup,
} from "@/lib/storage";
import {
  applyGroupResponseToCache,
  refreshGroupData,
  useGroupDashboardQuery,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import {
  GROUP_NAME_MAX,
  MEMBER_NAME_MAX,
  MEMBERS_MAX,
  MEMBERS_MIN,
} from "@/lib/validations/group.schema";
import { createGroupSchemas } from "@/lib/validations/group.schema.i18n";
import { hasDuplicateMemberNames, isMemberNameAlreadyAdded } from "@/lib/validations/group-members";

type RemovalState = {
  canRemove: boolean;
  message: string;
};

type EditableMember = GroupFormMember & {
  key: string;
};

function calculateShare(
  expense: GroupDashboardInterface["expenses"][number],
  userId: string
) {
  const participant = expense.participants.find((entry) => entry.user.id === userId);
  if (!participant) return 0;

  const amount = Number(participant.amount);
  return Number.isNaN(amount) ? 0 : amount;
}

function getExpensePayers(
  expense: GroupDashboardInterface["expenses"][number]
) {
  if (expense.payers?.length) {
    return expense.payers.filter((payer) => !!payer.user);
  }

  return expense.paidBy ? [{ user: expense.paidBy, amount: expense.amount }] : [];
}

function calculateBalances(
  expenses: GroupDashboardInterface["expenses"],
  members: GroupDashboardInterface["group"]["members"]
) {
  const balances: Record<string, number> = {};

  members.forEach((member) => {
    balances[member.id] = 0;
  });

  expenses.forEach((expense) => {
    getExpensePayers(expense).forEach((payer) => {
      const payerId = payer.user.id;
      balances[payerId] = (balances[payerId] ?? 0) + (Number(payer.amount) || 0);
    });

    expense.participants.forEach((participant) => {
      const participantId = participant.user.id;
      balances[participantId] = (balances[participantId] ?? 0) - calculateShare(expense, participantId);
    });
  });

  Object.keys(balances).forEach((key) => {
    balances[key] = Math.round(balances[key] * 100) / 100;
  });

  return balances;
}

function getBalancePresentation(
  balance: number,
  labels: { getsBack: string; owes: string; settled: string }
) {
  if (balance > 0.01) {
    return {
      tone: "positive" as const,
      label: labels.getsBack,
      value: balance,
    };
  }

  if (balance < -0.01) {
    return {
      tone: "negative" as const,
      label: labels.owes,
      value: Math.abs(balance),
    };
  }

  return {
    tone: "neutral" as const,
    label: labels.settled,
    value: 0,
  };
}

function EditGroupSkeleton() {
  return (
    <Layout>
      <div className="container max-w-4xl py-6 md:py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Skeleton className="h-9 w-32 rounded-xl" />
          <Skeleton className="h-11 w-36 rounded-xl" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border bg-card p-6">
              <Skeleton className="mb-4 h-12 w-12 rounded-2xl" />
              <Skeleton className="mb-3 h-6 w-28" />
              <Skeleton className="mb-2 h-8 w-40" />
              <Skeleton className="h-4 w-full max-w-md" />
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <Skeleton className="mb-2 h-4 w-24" />
                  <Skeleton className="h-11 w-full rounded-xl" />
                </div>
                <div>
                  <Skeleton className="mb-2 h-4 w-28" />
                  <Skeleton className="h-11 w-full rounded-xl" />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border bg-card p-6">
              <Skeleton className="mb-2 h-6 w-36" />
              <Skeleton className="mb-6 h-4 w-64" />
              <div className="grid gap-3 sm:grid-cols-3">
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl sm:col-span-3" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border bg-card p-6">
            <Skeleton className="mb-2 h-6 w-28" />
            <Skeleton className="mb-6 h-4 w-64" />
            <div className="mb-4 flex gap-2">
              <Skeleton className="h-11 flex-1 rounded-xl" />
              <Skeleton className="h-11 w-20 rounded-xl" />
            </div>
            <Skeleton className="mb-4 h-20 rounded-2xl" />
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-[22px]" />
              <Skeleton className="h-24 rounded-[22px]" />
              <Skeleton className="h-24 rounded-[22px]" />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default function EditGroupPage({ groupId }: { groupId: string }) {
  const t = useTranslations("editGroup");
  const tDetails = useTranslations("groupDetails");
  const tGroup = useTranslations("group");
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
  const balanceLabels = useMemo(
    () => ({
      getsBack: t("getsBack"),
      owes: t("owes"),
      settled: t("settled"),
    }),
    [t]
  );
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMdUp = useMdUp();
  const dashboardQuery = useGroupDashboardQuery(groupId);
  const dashboard = dashboardQuery.data ?? null;
  const loading = dashboardQuery.isPending && dashboard === null;
  const formInitializedForGroupId = useRef<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [members, setMembers] = useState<EditableMember[]>([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [selectedMemberKey, setSelectedMemberKey] = useState<string | null>(null);
  const [isMemberSheetOpen, setIsMemberSheetOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [errors, setErrors] = useState<{
    groupName?: string;
    members?: string;
    memberName?: string;
    memberExists?: string;
  }>({});
  const [memberRenameError, setMemberRenameError] = useState<string | undefined>();

  const showValidationToast = (message: string) => {
    toast({
      title: tCommon("missingRequired"),
      description: message,
      position: "center",
      dismissible: false,
      duration: Infinity,
      action: <ToastAction altText={tCommon("ok")}>{tCommon("ok")}</ToastAction>,
      variant: "error",
    });
  };

  useEffect(() => {
    formInitializedForGroupId.current = null;
  }, [groupId]);

  useEffect(() => {
    if (!groupId || !dashboard?.group) return;
    if (formInitializedForGroupId.current === groupId) return;

    setGroupName(dashboard.group.name);
    setCurrency(dashboard.group.currency);
    setMembers(
      dashboard.group.members.map((member) => ({
        key: member.id,
        id: member.id,
        name: member.name,
      }))
    );
    formInitializedForGroupId.current = groupId;
  }, [groupId, dashboard]);

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
    const trimmed = newMemberName.trim();
    if (!trimmed) {
      setErrors((prev) => ({ ...prev, memberName: undefined, memberExists: undefined }));
      return;
    }
    const memberResult = MemberNameSchema.safeParse(newMemberName);
    setErrors((prev) => ({
      ...prev,
      // The user is adding a member, so the previous minimum-member error is being corrected.
      members: undefined,
      memberName: memberResult.success ? undefined : memberResult.error.issues[0]?.message,
      memberExists: isMemberNameAlreadyAdded(members.map((member) => member.name), trimmed)
        ? tGroup("memberAlreadyAdded")
        : undefined,
    }));
  }, [newMemberName, members]);

  const balances = useMemo(() => {
    const baseMembers = dashboard?.group.members ?? [];
    return calculateBalances(dashboard?.expenses ?? [], baseMembers);
  }, [dashboard]);

  const selectedMember = useMemo(
    () =>
      selectedMemberKey
        ? members.find((member) => member.key === selectedMemberKey) ?? null
        : null,
    [members, selectedMemberKey]
  );

  const memberCards = useMemo(
    () =>
      members.map((member, index) => {
        const balanceInfo = getBalancePresentation(
          member.id ? balances[member.id] ?? 0 : 0,
          balanceLabels
        );
        return {
          ...member,
          balanceInfo,
          isExisting: Boolean(member.id),
        };
      }),
    [balanceLabels, balances, members]
  );

  const summary = useMemo(() => {
    return memberCards.reduce(
      (acc, member) => {
        if (member.balanceInfo.tone === "positive") acc.getBackCount += 1;
        if (member.balanceInfo.tone === "negative") acc.oweCount += 1;
        return acc;
      },
      {
        oweCount: 0,
        getBackCount: 0,
      }
    );
  }, [memberCards]);

  const unsettledTotal = useMemo(
    () =>
      memberCards.reduce((total, member) => {
        if (member.balanceInfo.tone === "neutral") return total;
        return total + member.balanceInfo.value;
      }, 0),
    [memberCards]
  );

  const hasChanges = useMemo(() => {
    if (!dashboard?.group) return false;

    const originalMembers = dashboard.group.members
      .map((member) => `${member.id}:${member.name.trim()}`)
      .sort();
    const currentMembers = members
      .map((member) => `${member.id ?? member.key}:${member.name.trim()}`)
      .sort();

    return (
      dashboard.group.name !== groupName.trim() ||
      dashboard.group.currency !== currency ||
      JSON.stringify(originalMembers) !== JSON.stringify(currentMembers)
    );
  }, [currency, dashboard, groupName, members]);

  const removalState = useMemo((): RemovalState => {
    if (!isMemberSheetOpen || !selectedMember) {
      return { canRemove: true, message: "" };
    }

    const result = canRemoveGroupMember(dashboard?.expenses ?? [], selectedMember);
    return {
      canRemove: result.canRemove,
      message: result.message || t("memberCanBeRemoved"),
    };
  }, [dashboard?.expenses, isMemberSheetOpen, selectedMember]);

  const validateMembers = (nextMembers: EditableMember[]) => {
    const names = nextMembers.map((member) => member.name.trim());
    const result = GroupSchema.safeParse({ groupName, members: names });

    if (!result.success) {
      const formatted = result.error.format();
      setErrors((current) => ({
        ...current,
        groupName: formatted.groupName?._errors[0],
        members: formatted.members?._errors[0],
      }));
      return false;
    }

    for (const member of nextMembers) {
      const memberResult = MemberNameSchema.safeParse(member.name);
      if (!memberResult.success) {
        setErrors((current) => ({
          ...current,
          memberName: memberResult.error.issues[0].message,
        }));
        return false;
      }
    }

    if (hasDuplicateMemberNames(names)) {
      setErrors((current) => ({
        ...current,
        memberExists: t("uniqueNamesRequired"),
      }));
      return false;
    }

    setErrors({});
    return true;
  };

  const handleAddMember = () => {
    if (members.length >= MEMBERS_MAX) {
      const message = `Maximum ${MEMBERS_MAX} members allowed.`;
      setErrors((current) => ({
        ...current,
        members: message,
      }));
      if (!isMdUp) showValidationToast(message);
      return;
    }

    const memberResult = MemberNameSchema.safeParse(newMemberName);
    if (!memberResult.success) {
      const message = memberResult.error.issues[0].message;
      setErrors((current) => ({
        ...current,
        memberName: message,
      }));
      if (!isMdUp) showValidationToast(message);
      return;
    }

    const trimmedName = newMemberName.trim();
    if (isMemberNameAlreadyAdded(members.map((member) => member.name), trimmedName)) {
      const message = tGroup("memberAlreadyAdded");
      setErrors((current) => ({
        ...current,
        memberExists: message,
      }));
      if (!isMdUp) showValidationToast(message);
      return;
    }

    const nextMembers = [
      ...members,
      { key: crypto.randomUUID(), name: trimmedName },
    ];
    setMembers(nextMembers);
    setNewMemberName("");
    setErrors((current) => ({
      ...current,
      members: undefined,
      memberName: undefined,
      memberExists: undefined,
    }));
  };

  const openMemberSheet = (memberKey: string) => {
    const member = members.find((entry) => entry.key === memberKey);
    setSelectedMemberKey(memberKey);
    setMemberRenameError(undefined);
    if (member) {
      setRenameValue(member.name);
    }
    setIsMemberSheetOpen(true);
  };

  const getMemberRenameError = useCallback(
    (value: string, member: EditableMember | null): string | undefined => {
      if (!member) return undefined;

      const nameResult = MemberNameSchema.safeParse(value);
      if (!nameResult.success) {
        return nameResult.error.issues[0].message;
      }

      const trimmedName = value.trim();
      const hasDuplicate = isMemberNameAlreadyAdded(
        members.filter((entry) => entry !== member).map((entry) => entry.name),
        trimmedName
      );

      if (hasDuplicate) {
        return t("renameDuplicate");
      }

      return undefined;
    },
    [members]
  );

  const handleRenameSave = (): boolean => {
    if (!selectedMember) return true;

    const validationError = getMemberRenameError(renameValue, selectedMember);
    if (validationError) {
      setMemberRenameError(validationError);
      return false;
    }

    const trimmedName = renameValue.trim();
    setMemberRenameError(undefined);
    setMembers((currentMembers) =>
      currentMembers.map((member) =>
        member === selectedMember
          ? { ...member, name: trimmedName }
          : member
      )
    );
    return true;
  };

  const handleDeleteGroup = async () => {
    setIsDeleting(true);
    try {
      const deleted = await deleteGroup(groupId);
      if (!deleted) {
        toast({
          title: t("couldNotDelete"),
          description: t("pleaseTryAgain"),
          variant: "destructive",
        });
        setIsDeleting(false);
        return;
      }

      const existing = getEncryptedItem<string[]>(LOCAL_GROUPS_KEY, []);
      setEncryptedItem(
        LOCAL_GROUPS_KEY,
        existing.filter((id) => id !== groupId)
      );
      router.push("/");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("failedDelete");
      toast({
        title: t("couldNotDelete"),
        description: message,
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  };

  const handleRemoveSelectedMember = () => {
    if (!selectedMember || !removalState.canRemove) return;

    setMembers((currentMembers) =>
      currentMembers.filter((member) => member !== selectedMember)
    );
    setIsMemberSheetOpen(false);
    setSelectedMemberKey(null);
    setErrors((current) => ({
      ...current,
      members: undefined,
    }));
  };

  const handleSaveGroup = async () => {
    const trimmedGroupName = groupName.trim();
    const normalizedMembers = members.map((member) => ({
      name: member.name.trim(),
      id: member.id,
      key: member.key,
    }));

    setGroupName(trimmedGroupName);
    setMembers(normalizedMembers);

    if (!validateMembers(normalizedMembers)) {
      const names = normalizedMembers.map((member) => member.name.trim());
      const result = GroupSchema.safeParse({ groupName: trimmedGroupName, members: names });
      if (!result.success) {
        const formatted = result.error.format();
        const messages = [
          formatted.groupName?._errors[0],
          formatted.members?._errors[0],
        ].filter(Boolean) as string[];
        if (messages.length > 0) {
          toast({
            title: tCommon("missingRequired"),
            description: (
              <div className="space-y-1">
                {messages.map((msg, idx) => (
                  <div key={idx}>
                    {messages.length > 1 && "\u2022 "}
                    {msg}
                  </div>
                ))}
              </div>
            ),
            position: "center",
            dismissible: false,
            duration: Infinity,
            action: <ToastAction altText={tCommon("ok")}>{tCommon("ok")}</ToastAction>,
            variant:'error',
          });
        }
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const updated = await updateGroup(groupId, {
        name: trimmedGroupName,
        currency,
        members: normalizedMembers.map(({ id, name }) => ({ id, name })),
      });

      applyGroupResponseToCache(queryClient, groupId, updated);
      await refreshGroupData(queryClient, groupId);

      toast({
        title: t("groupUpdated"),
        description: t("groupUpdatedDescription"),
        variant:'success',
      });

      router.push(`/group/${groupId}`);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("failedUpdate");

      toast({
        title: t("couldNotSave"),
        description: message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <EditGroupSkeleton />;
  }

  if (!dashboard?.group) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">{tCommon("groupNotFound")}</p>
          <Button asChild className="mt-4">
            <Link href="/">{tCommon("goHome")}</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <>
      {isMdUp ? (
      <Layout>
        <div className="container max-w-4xl py-6 md:py-8">
          <div className="mb-6 flex items-center justify-between gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/group/${groupId}`}>
                <ArrowLeft className="w-4 h-4" />
                {tDetails("backToGroup")}
              </Link>
            </Button>

            <Button onClick={handleSaveGroup} disabled={isSubmitting || !hasChanges}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {hasChanges ? t("saveChanges") : t("upToDate")}
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="overflow-hidden border-0 bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.12),_transparent_34%),radial-gradient(circle_at_bottom_right,_hsl(var(--secondary)/0.08),_transparent_28%)] shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                      <Users className="text-primary" />
                    </div>
                    <Badge variant="outline" className="mb-3 w-fit border-primary/20 bg-card/70 text-primary dark:text-primary/90">
                      {t("manageMembersBadge")}
                    </Badge>
                    <CardTitle className="text-2xl">{t("editGroupTitle")}</CardTitle>
                    <CardDescription>
                      {t("editGroupDescription")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="group-name">{t("groupNameLabel")}</Label>
                      <Input
                        id="group-name"
                        value={groupName}
                        onChange={(event) => setGroupName(event.target.value)}
                        placeholder={t("groupNamePlaceholder")}
                      />
                      {errors.groupName ? (
                        <p className="text-xs text-destructive">{errors.groupName}</p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <Label>{t("defaultCurrencyLabel")}</Label>
                      <div className="flex h-11 items-center rounded-xl border bg-muted/35 px-3 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{currency}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-primary" />
                    {t("groupSnapshotTitle")}
                  </CardTitle>
                  <CardDescription>
                    {t("groupSnapshotDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border bg-muted/30 p-4">
                    <p className="text-sm text-muted-foreground">{tGroup("members")}</p>
                    <p className="mt-2 text-2xl font-semibold">{memberCards.length}</p>
                  </div>
                  <div className={balanceStyles.positiveCard}>
                    <p className={balanceStyles.positiveCardLabel}>{t("getsBack")}</p>
                    <p className={balanceStyles.positiveCardValue}>{summary.getBackCount}</p>
                  </div>
                  <div className={balanceStyles.negativeCard}>
                    <p className={balanceStyles.negativeCardLabel}>{t("owes")}</p>
                    <p className={balanceStyles.negativeCardValue}>{summary.oweCount}</p>
                  </div>
                  <div className={balanceStyles.warningCard}>
                    <p className={balanceStyles.warningCardLabel}>{t("totalUnsettledAmount")}</p>
                    <p className={balanceStyles.warningCardValue}>
                      {formatCurrency(unsettledTotal, currency)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CircleDollarSign className="w-5 h-5 text-primary" />
                    {tGroup("members")}
                  </CardTitle>
                  <CardDescription>
                    {t("membersCardDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newMemberName}
                      onChange={(event) => setNewMemberName(event.target.value)}
                      aria-invalid={Boolean(errors.memberName || errors.memberExists)}
                      placeholder={
                        members.length >= MEMBERS_MAX
                          ? tGroup("maximumMembers", { max: MEMBERS_MAX })
                          : t("addNewMember")
                      }
                      disabled={members.length >= MEMBERS_MAX}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && newMemberName.trim()) {
                          event.preventDefault();
                          handleAddMember();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddMember}
                      disabled={members.length >= MEMBERS_MAX || !newMemberName.trim()}
                    >
                      {tCommon("add")}
                    </Button>
                  </div>

                  <div className="rounded-2xl border border-dashed bg-muted/25 p-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-primary/10 p-2 text-primary">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t("memberRemovalProtectedTitle")}</p>
                        <p className="text-sm text-muted-foreground">
                          {t("memberRemovalProtectedDescription")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {errors.members ? <p className="text-xs text-destructive">{errors.members}</p> : null}
                  {errors.memberName ? <p className="text-xs text-destructive">{errors.memberName}</p> : null}
                  {errors.memberExists ? <p className="text-xs text-destructive">{errors.memberExists}</p> : null}

                  <div className="max-h-[30rem] space-y-3 overflow-y-auto pr-1">
                    {memberCards.map((member) => (
                      <button
                        key={member.key}
                        type="button"
                        onClick={() => openMemberSheet(member.key)}
                        className={cn(
                          "w-full rounded-[22px] border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:shadow-card",
                          member.balanceInfo.tone === "positive" && balanceStyles.positiveMemberBorder,
                          member.balanceInfo.tone === "negative" && balanceStyles.negativeMemberBorder,
                          member.balanceInfo.tone === "neutral" && "border-border bg-gradient-to-r from-card to-muted/10"
                        )}
                      >
                        <div className="grid grid-cols-[auto,minmax(0,1fr),auto] items-center gap-3">
                          <UserAvatar name={member.name} className="h-11 w-11" />
                          <div className="min-w-0 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-semibold">{member.name}</p>
                              {!member.isExisting ? (
                                <Badge variant="outline" className="border-dashed bg-card/70">
                                  {tGroup("newBadge")}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {member.isExisting ? t("tapToEdit") : t("newMemberReady")}
                            </p>
                          </div>
                          <div className="flex min-w-0 items-center gap-3 justify-self-end">
                            <div className="min-w-0 text-right">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "border-white/60",
                                  member.balanceInfo.tone === "positive" && balanceStyles.positiveBadge,
                                  member.balanceInfo.tone === "negative" && balanceStyles.negativeBadge,
                                  member.balanceInfo.tone === "neutral" && "bg-card text-muted-foreground"
                                )}
                              >
                                {member.balanceInfo.label}
                              </Badge>
                              <p
                                className={cn(
                                  "mt-2 truncate text-sm font-semibold",
                                  member.balanceInfo.tone === "positive" && balanceStyles.positiveText,
                                  member.balanceInfo.tone === "negative" && balanceStyles.negativeText,
                                  member.balanceInfo.tone === "neutral" && "text-foreground"
                                )}
                              >
                                {member.balanceInfo.tone === "neutral"
                                  ? t("noBalance")
                                  : formatCurrency(member.balanceInfo.value, currency)}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Layout>
      ) : (
        <EditGroupMobile
          groupId={groupId}
          groupName={groupName}
          onGroupNameChange={setGroupName}
          currency={currency}
          memberCards={memberCards}
          newMemberName={newMemberName}
          onNewMemberNameChange={setNewMemberName}
          onAddMember={handleAddMember}
          errors={errors}
          summary={summary}
          onOpenMember={openMemberSheet}
          onSaveGroup={handleSaveGroup}
          onDeleteGroup={handleDeleteGroup}
          isSubmitting={isSubmitting}
          isDeleting={isDeleting}
        />
      )}

      <Spinner show={isSubmitting} message={tCommon("saving")} />
      <Spinner show={isDeleting} message={tCommon("deleting")} />

      <EditGroupMemberSheet
        open={isMemberSheetOpen}
        onOpenChange={setIsMemberSheetOpen}
        selectedMember={selectedMember}
        renameValue={renameValue}
        renameError={memberRenameError}
        onRenameValueChange={(value) => {
          setRenameValue(value);
          setMemberRenameError(getMemberRenameError(value, selectedMember));
        }}
        onRenameSave={handleRenameSave}
        removalState={removalState}
        onRemoveMember={handleRemoveSelectedMember}
        enableBackButtonClose={!isMdUp}
      />
    </>
  );
}
