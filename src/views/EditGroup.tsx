"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  AlertTriangle,
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
import { ResourceNotFound } from "@/components/ResourceNotFound";
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
import { GenericAlertDialog } from "@/components/ui/generic-alert-dialog";
import { balanceStyles } from "@/lib/brand-styles";
import { formatCurrency } from "@/lib/avatar-utils";
import { LOCAL_GROUPS_KEY } from "@/lib/constants";
import { getEncryptedItem, setEncryptedItem } from "@/lib/localStorage";
import {
  canRemoveGroupMember,
  deleteGroup,
  GroupDashboardInterface,
  GroupFormMember,
  GroupResponse,
  updateGroup,
} from "@/lib/storage";
import { useGroupDashboard } from "@/lib/groupExpenseData";
import { useGroupChanges, useGroupRealtime } from "@/hooks/useGroupRealtime";
import { useGroupChangeNotices } from "@/components/group/GroupChangeNotices";
import { GroupDeletedDialog } from "@/components/group/GroupDeletedDialog";
import { applyGroupChangesToDashboard } from "@/lib/realtime/groupChanges";
import { cn } from "@/lib/utils";
import { OfflineBanner } from "@/components/sync/OfflineBanner";
import { useGroupAccess, useOfflineFailureToast } from "@/hooks/useOffline";
import {
  GROUP_NAME_MAX,
  MEMBER_NAME_MAX,
  MEMBERS_MAX,
  MEMBERS_MIN,
} from "@/lib/validations/group.schema";
import { createGroupSchemas } from "@/lib/validations/group.schema.i18n";
import {
  hasDuplicateMemberNames,
  isMemberNameAlreadyAdded,
  truncateMemberName,
} from "@/lib/validations/group-members";
import { cleanName, isBlankName } from "@/lib/validations/names";

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
  const tConflict = useTranslations("editConflict");
  const tToasts = useTranslations("toasts");
  const tVal = useTranslations("group.validation");
  // "Gets back" / "Needs to pay": one set of words for every screen (messages: balanceLabels).
  const tBalance = useTranslations("balanceLabels");
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
      getsBack: tBalance("getsBack"),
      owes: tBalance("needsToPay"),
      settled: t("settled"),
    }),
    [t, tBalance]
  );
  const router = useRouter();
  const { toast } = useToast();
  const isMdUp = useMdUp();
  const { data: dashboard, loading, refresh, applyChange } = useGroupDashboard(groupId);
  const access = useGroupAccess(groupId);
  const showOfflineFailure = useOfflineFailureToast();
  const formInitializedForGroupId = useRef<string | null>(null);
  // The revision this form's edits are based on, sent with the save. It only
  // moves forward when a change merged cleanly or the user resolved a
  // conflict, so dismissing the conflict dialog (Esc) and saving still hits
  // the server's conflict check, as on Edit Expense.
  const [baseRevision, setBaseRevision] = useState<number | undefined>();
  const unresolvedConflictRef = useRef(false);
  const [conflict, setConflict] = useState<{ source: "realtime" | "save"; currentRevision?: number } | null>(null);
  // Keeps the dialog's wording steady while it animates closed.
  const conflictSourceRef = useRef<"realtime" | "save">("realtime");
  if (conflict) conflictSourceRef.current = conflict.source;
  const isSaveConflict = conflictSourceRef.current === "save";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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
  const hasReachedMemberLimit = members.length >= MEMBERS_MAX;
  const [memberRenameError, setMemberRenameError] = useState<string | undefined>();
  const [validationMessages, setValidationMessages] = useState<string[]>([]);
  const [isDuplicateMemberDialog, setIsDuplicateMemberDialog] = useState(false);

  const showValidationDialog = (messages: string | string[], isDuplicateMember = false) => {
    setIsDuplicateMemberDialog(isDuplicateMember);
    setValidationMessages(Array.isArray(messages) ? messages : [messages]);
  };

  useEffect(() => {
    formInitializedForGroupId.current = null;
  }, [groupId]);

  const resetForm = (group: GroupResponse) => {
    setGroupName(group.name);
    setCurrency(group.currency);
    setMembers(
      group.members.map((member) => ({
        key: member.id,
        id: member.id,
        name: member.name,
      }))
    );
    setIsMemberSheetOpen(false);
    setSelectedMemberKey(null);
    setErrors({});
    setBaseRevision(group.revision);
    unresolvedConflictRef.current = false;
  };

  useEffect(() => {
    if (!groupId || !dashboard?.group) return;
    if (formInitializedForGroupId.current === groupId) return;

    resetForm(dashboard.group);
    formInitializedForGroupId.current = groupId;
  }, [groupId, dashboard]);

  // Another session's edit arrives with its full change, so merge it here
  // without refetching. Fields this user hasn't touched take the new values
  // and their own edits stay. When both changed the same thing, ask which
  // version to keep. The loaded group (`dashboard.group`) is the base the
  // user's edits are measured against, so it moves forward too.
  // Expenses decide who can be removed and the balances on each member card,
  // so reload them in the background when one changes elsewhere. The form
  // isn't touched (it's only initialised once), and a reload that brings
  // missed group changes is still caught by the save's revision check.
  // Deletion comes from the broadcast below instead: the database event can't
  // tell tabs apart, and this is the screen that deletes groups.
  // Set while this screen deletes the group. The delete cascades to every
  // expense, and reloading on those events would swap the screen to "not
  // found" and unmount the confirmation dialog mid-navigation; its Back-button
  // cleanup (history.back()) would then cancel the navigation home.
  const isDeletingRef = useRef(false);
  useGroupRealtime({
    groupId,
    onExpenseChange: () => {
      if (!isDeletingRef.current) void refresh();
    },
  });

  const changeNotices = useGroupChangeNotices();
  // Deleted in another session: nothing here can be saved, so block the
  // screen with an explanation (and drop any conflict dialog).
  const [groupDeleted, setGroupDeleted] = useState(false);
  const showGroupDeleted = () => {
    setGroupDeleted(true);
    setConflict(null);
    setIsMemberSheetOpen(false);
  };
  useGroupChanges(groupId, (changes) => {
    const base = dashboard?.group;
    if (!base) {
      // Still loading: there is no form to merge into yet. Queue the change
      // so it is replayed onto the first load, which then fills the form.
      applyChange((prev) => applyGroupChangesToDashboard(prev, changes), changes.revision);
      changeNotices.notify(changes);
      return;
    }

    const baseNames = new Map(base.members.map((member) => [member.id, member.name]));
    const formById = new Map(
      members.filter((member) => member.id).map((member) => [member.id as string, member])
    );
    const isRenamedHere = (id: string) => {
      const entry = formById.get(id);
      return Boolean(entry && cleanName(entry.name) !== baseNames.get(id));
    };
    const isRemovedHere = (id: string) => baseNames.has(id) && !formById.has(id);
    const newNamesHere = members.filter((member) => !member.id).map((member) => member.name);
    const clashesWithNewHere = (name: string) => isMemberNameAlreadyAdded(newNamesHere, name);

    const removedIds = new Set(changes.removed.map((member) => member.id));
    const renames = new Map(changes.renamed.map((rename) => [rename.id, rename.to]));
    const nameEdited = cleanName(groupName) !== base.name;
    const currencyEdited = currency !== base.currency;

    // The member sheet holds an uncommitted rename until it is saved.
    const sheetMember = isMemberSheetOpen ? selectedMember : null;
    const sheetRenaming = Boolean(sheetMember && cleanName(renameValue) !== sheetMember.name);

    const hasConflict =
      Boolean(changes.name && nameEdited && cleanName(groupName) !== changes.name.to) ||
      Boolean(changes.currency && currencyEdited && currency !== changes.currency.to) ||
      changes.removed.some(
        (member) => isRenamedHere(member.id) || (sheetRenaming && sheetMember?.id === member.id)
      ) ||
      changes.renamed.some(
        (rename) =>
          isRemovedHere(rename.id) ||
          (isRenamedHere(rename.id) && cleanName(formById.get(rename.id)?.name ?? "") !== rename.to) ||
          (sheetRenaming && sheetMember?.id === rename.id && cleanName(renameValue) !== rename.to) ||
          clashesWithNewHere(rename.to)
      ) ||
      changes.added.some((member) => clashesWithNewHere(member.name));

    if (changes.name && !nameEdited) setGroupName(changes.name.to);
    if (changes.currency && !currencyEdited) setCurrency(changes.currency.to);
    setMembers((current) => {
      // A member removed elsewhere is gone, so it leaves the form even when
      // this user had renamed it; the conflict dialog says so.
      const next = current
        .filter((member) => !member.id || !removedIds.has(member.id))
        .map((member) =>
          member.id && renames.has(member.id) && !isRenamedHere(member.id)
            ? { ...member, name: renames.get(member.id)! }
            : member
        );
      for (const added of changes.added) {
        if (!next.some((member) => member.id === added.id)) {
          next.push({ key: added.id, id: added.id, name: added.name });
        }
      }
      return next;
    });

    if (sheetMember?.id && removedIds.has(sheetMember.id)) {
      setIsMemberSheetOpen(false);
      setSelectedMemberKey(null);
    } else if (sheetMember?.id && renames.has(sheetMember.id) && !sheetRenaming) {
      setRenameValue(renames.get(sheetMember.id)!);
    }

    applyChange((prev) => applyGroupChangesToDashboard(prev, changes), changes.revision);
    changeNotices.notify(changes);
    if (hasConflict) {
      unresolvedConflictRef.current = true;
      setConflict({ source: "realtime" });
    } else if (!unresolvedConflictRef.current && changes.revision !== undefined) {
      setBaseRevision(changes.revision);
    }
  }, showGroupDeleted);

  const handleKeepMine = () => {
    // Deliberately go over the other version: base the next save on it. After
    // a blocked save the user already chose to save, so save right away;
    // while editing, just let them carry on.
    const latestRevision = conflict?.currentRevision ?? dashboard?.group.revision;
    const source = conflict?.source;
    setBaseRevision(latestRevision);
    unresolvedConflictRef.current = false;
    setConflict(null);
    if (source === "save") void handleSaveGroup(latestRevision);
  };

  const handleUseLatest = async () => {
    const source = conflict?.source;
    setConflict(null);
    if (source === "save") {
      // The save found a newer version this screen never received, so load it.
      const latest = await refresh();
      if (latest?.group) resetForm(latest.group);
    } else if (dashboard?.group) {
      // Realtime changes are already applied to the loaded group.
      resetForm(dashboard.group);
    }
  };

  useEffect(() => {
    if (isBlankName(groupName)) {
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
    const cleaned = cleanName(newMemberName);
    if (isBlankName(newMemberName)) {
      setErrors((prev) => ({ ...prev, memberName: undefined, memberExists: undefined }));
      return;
    }
    const memberResult = MemberNameSchema.safeParse(newMemberName);
    setErrors((prev) => ({
      ...prev,
      // The user is adding a member, so the previous minimum-member error is being corrected.
      members: undefined,
      memberName: memberResult.success ? undefined : memberResult.error.issues[0]?.message,
      memberExists: isMemberNameAlreadyAdded(members.map((member) => member.name), cleaned)
        ? tGroup("memberAlreadyAdded", { name: truncateMemberName(cleaned) })
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

  // What is still owed in the group, counted once: the sum of what members get
  // back (which always equals the sum of what the others owe). Adding both
  // sides would count every debt twice.
  const unsettledTotal = useMemo(
    () =>
      memberCards.reduce(
        (total, member) => (member.balanceInfo.tone === "positive" ? total + member.balanceInfo.value : total),
        0
      ),
    [memberCards]
  );

  // Shown as a warning when deleting a group that hasn't settled up.
  const unsettledWarning = useMemo(
    () =>
      unsettledTotal > 0.01
        ? tGroup("deleteGroupUnsettled", { amount: formatCurrency(unsettledTotal, dashboard?.group.currency ?? currency) })
        : null,
    [unsettledTotal, dashboard?.group.currency, currency, tGroup]
  );

  const hasChanges = useMemo(() => {
    if (!dashboard?.group) return false;

    const originalMembers = dashboard.group.members
      .map((member) => `${member.id}:${cleanName(member.name)}`)
      .sort();
    const currentMembers = members
      .map((member) => `${member.id ?? member.key}:${cleanName(member.name)}`)
      .sort();

    return (
      dashboard.group.name !== cleanName(groupName) ||
      dashboard.group.currency !== currency ||
      JSON.stringify(originalMembers) !== JSON.stringify(currentMembers)
    );
  }, [currency, dashboard, groupName, members]);

  const removalState = useMemo((): RemovalState => {
    if (!isMemberSheetOpen || !selectedMember) {
      return { canRemove: true, message: "" };
    }

    if (members.length <= MEMBERS_MIN) {
      return {
        canRemove: false,
        message: tGroup("removeMemberMinimum", { min: MEMBERS_MIN }),
      };
    }

    const result = canRemoveGroupMember(dashboard?.expenses ?? [], selectedMember);
    return {
      canRemove: result.canRemove,
      message: result.message || t("memberCanBeRemoved"),
    };
  }, [dashboard?.expenses, isMemberSheetOpen, members.length, selectedMember, t, tGroup]);

  const validateMembers = (nextMembers: EditableMember[]) => {
    const names = nextMembers.map((member) => cleanName(member.name));
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
    const cleanedName = cleanName(newMemberName);
    if (isBlankName(newMemberName)) return;

    if (members.length >= MEMBERS_MAX) {
      const message = `Maximum ${MEMBERS_MAX} members allowed.`;
      setErrors((current) => ({
        ...current,
        members: message,
      }));
      showValidationDialog(message);
      return;
    }

    const memberResult = MemberNameSchema.safeParse(newMemberName);
    if (!memberResult.success) {
      const message = memberResult.error.issues[0].message;
      setErrors((current) => ({
        ...current,
        memberName: message,
      }));
      showValidationDialog(message);
      return;
    }

    if (isMemberNameAlreadyAdded(members.map((member) => member.name), cleanedName)) {
      const message = tGroup("memberAlreadyAdded", { name: truncateMemberName(cleanedName) });
      setErrors((current) => ({
        ...current,
        memberExists: message,
      }));
      showValidationDialog(message, true);
      return;
    }

    const nextMembers = [
      ...members,
      { key: crypto.randomUUID(), name: cleanedName },
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

      const hasDuplicate = isMemberNameAlreadyAdded(
        members.filter((entry) => entry !== member).map((entry) => entry.name),
        value
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

    const cleanedName = cleanName(renameValue);
    setMemberRenameError(undefined);
    setMembers((currentMembers) =>
      currentMembers.map((member) =>
        member === selectedMember
          ? { ...member, name: cleanedName }
          : member
      )
    );
    return true;
  };

  /** Resolves false on failure, so the confirm dialog unlocks and closes. */
  const handleDeleteGroup = async (): Promise<boolean> => {
    if (!access.check("deleteGroup")) return false;
    setIsDeleting(true);
    isDeletingRef.current = true;
    try {
      const deleted = await deleteGroup(groupId);
      if (!deleted) {
        toast({
          title: t("couldNotDelete"),
          description: t("pleaseTryAgain"),
          variant: "error",
        });
        setIsDeleting(false);
        isDeletingRef.current = false;
        return false;
      }

      const existing = getEncryptedItem<string[]>(LOCAL_GROUPS_KEY, []);
      setEncryptedItem(
        LOCAL_GROUPS_KEY,
        existing.filter((id) => id !== groupId)
      );
      toast({ message: tToasts("groupDeleted"), variant: "destructive" });
      router.push("/");
      return true;
    } catch (error) {
      if (showOfflineFailure(error)) {
        setIsDeleting(false);
        isDeletingRef.current = false;
        return false;
      }
      const message =
        error instanceof Error ? error.message : t("failedDelete");
      toast({
        title: t("couldNotDelete"),
        description: message,
        variant: "error",
      });
      setIsDeleting(false);
      isDeletingRef.current = false;
      return false;
    }
  };

  const handleRemoveSelectedMember = () => {
    if (!selectedMember || members.length <= MEMBERS_MIN || !removalState.canRemove) return;

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

  /** `revision` overrides the form's base, for "Save my changes" after a conflict. */
  const handleSaveGroup = async (revision: number | undefined = baseRevision) => {
    // Offline in a synced group: keep the form as it is, to save once back online.
    if (!access.check("edit")) return;
    const cleanedGroupName = cleanName(groupName);
    const normalizedMembers = members.map((member) => ({
      name: cleanName(member.name),
      id: member.id,
      key: member.key,
    }));

    setGroupName(cleanedGroupName);
    setMembers(normalizedMembers);

    if (!validateMembers(normalizedMembers)) {
      const names = normalizedMembers.map((member) => member.name);
      const result = GroupSchema.safeParse({ groupName: cleanedGroupName, members: names });
      if (!result.success) {
        const formatted = result.error.format();
        const messages = [
          formatted.groupName?._errors[0],
          formatted.members?._errors[0],
        ].filter(Boolean) as string[];
        if (messages.length > 0) {
          showValidationDialog(messages);
        }
      }
      return;
    }

    setIsSubmitting(true);

    try {
      await updateGroup(groupId, {
        name: cleanedGroupName,
        currency,
        members: normalizedMembers.map(({ id, name }) => ({ id, name })),
        revision,
      });

      toast({
        title: t("groupUpdated"),
        description: t("groupUpdatedDescription"),
        variant:'success',
      });

      router.push(`/group/${groupId}`);
    } catch (error) {
      const failure = error as { code?: string; payload?: { currentRevision?: number | null } };
      if (failure.code === "GROUP_NOT_FOUND") {
        // Deleted while this screen missed the broadcast.
        setIsSubmitting(false);
        showGroupDeleted();
        return;
      }
      if (failure.code === "GROUP_VERSION_CONFLICT") {
        // Changed elsewhere since this form's base: either this screen missed
        // the update, or a conflict dialog was dismissed without a choice.
        const currentRevision = failure.payload?.currentRevision;
        setConflict({
          source: "save",
          currentRevision: typeof currentRevision === "number" ? currentRevision : undefined,
        });
        setIsSubmitting(false);
        return;
      }
      // The connection dropped mid-save; the form keeps the changes.
      if (showOfflineFailure(error)) {
        setIsSubmitting(false);
        return;
      }

      const message =
        error instanceof Error ? error.message : t("failedUpdate");

      toast({
        title: t("couldNotSave"),
        description: message,
        variant: "error",
      });
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <EditGroupSkeleton />;
  }

  if (!dashboard?.group) {
    return (
      <ResourceNotFound
        message={tCommon("groupNotFound")}
        actionLabel={tCommon("goHome")}
        actionHref="/"
      />
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

            <Button
              onClick={() => void handleSaveGroup()}
              disabled={isSubmitting || !hasChanges}
              aria-disabled={access.can.edit ? undefined : true}
              className={cn(!access.can.edit && "opacity-50")}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {hasChanges ? t("saveChanges") : t("upToDate")}
            </Button>
          </div>

          <OfflineBanner groupId={groupId} access={access} className="mb-6" />

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
                    <p className={balanceStyles.positiveCardLabel}>{tBalance("getsBack")}</p>
                    <p className={balanceStyles.positiveCardValue}>{summary.getBackCount}</p>
                  </div>
                  <div className={balanceStyles.negativeCard}>
                    <p className={balanceStyles.negativeCardLabel}>{tBalance("needsToPay")}</p>
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
                  {hasReachedMemberLimit ? (
                    <div
                      role="status"
                      className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-950 dark:text-amber-100"
                    >
                      <AlertTriangle className="h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                      <p className="text-sm leading-5">
                        <span className="font-semibold">{tGroup("memberLimitReached", { max: MEMBERS_MAX })}</span>{" "}
                        {tGroup("removeMemberToAdd")}
                      </p>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={newMemberName}
                        onChange={(event) => setNewMemberName(event.target.value)}
                        aria-invalid={Boolean(errors.memberName || errors.memberExists)}
                        placeholder={t("addNewMember")}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !isBlankName(newMemberName)) {
                            event.preventDefault();
                            handleAddMember();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddMember}
                        disabled={isBlankName(newMemberName)}
                      >
                        {tCommon("add")}
                      </Button>
                    </div>
                  )}

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

          {/* Danger zone, matching the mobile layout. */}
          <div className="mt-6 flex flex-col gap-4 rounded-3xl border border-destructive/30 bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">{tGroup("deleteGroup")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{tGroup("deleteGroupHint")}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "shrink-0 border-destructive text-destructive hover:bg-destructive/5 hover:text-destructive",
                !access.can.deleteGroup && "opacity-50"
              )}
              aria-disabled={access.can.deleteGroup ? undefined : true}
              onClick={() => {
                if (access.check("deleteGroup")) setDeleteDialogOpen(true);
              }}
            >
              {tGroup("deleteGroup")}
            </Button>
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
          onSaveGroup={() => handleSaveGroup()}
          onDeleteGroup={handleDeleteGroup}
          unsettledWarning={unsettledWarning}
          isSubmitting={isSubmitting}
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
      <GenericAlertDialog
        open={validationMessages.length > 0}
        onOpenChange={(open) => {
          if (!open) {
            setValidationMessages([]);
            setIsDuplicateMemberDialog(false);
          }
        }}
        title={isDuplicateMemberDialog ? tGroup("memberAlreadyAddedTitle") : tCommon("cannotSaveGroup")}
        messages={validationMessages}
        actions={[{
          label: tCommon("gotIt"),
          onClick: () => {
            setValidationMessages([]);
            setIsDuplicateMemberDialog(false);
          },
        }]}
      />
      <GenericAlertDialog
        open={Boolean(conflict)}
        // Realtime can open it while the member sheet is up.
        aboveOverlays
        onOpenChange={(open) => {
          if (!open) setConflict(null);
        }}
        title={isSaveConflict ? tConflict("groupSaveTitle") : tConflict("groupRealtimeTitle")}
        description={isSaveConflict ? tConflict("groupSaveDescription") : tConflict("groupRealtimeDescription")}
        actions={[
          {
            label: isSaveConflict ? tConflict("loadLatest") : tConflict("useLatest"),
            type: "cancel",
            onClick: () => void handleUseLatest(),
          },
          {
            label: isSaveConflict ? tConflict("saveMine") : tConflict("keepMine"),
            onClick: handleKeepMine,
          },
        ]}
      />
      {changeNotices.sheet}
      <GroupDeletedDialog open={groupDeleted} />
      {/* Desktop confirmation; the mobile layout has its own. */}
      <GenericAlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={tGroup("deleteGroupTitle")}
        description={
          <div>
            <span className="block">{tGroup("deleteGroupConfirm")}</span>
            <span className="block">{tGroup("deleteGroupWarning")}</span>
            {unsettledWarning && <span className="mt-2 block font-medium text-destructive">{unsettledWarning}</span>}
          </div>
        }
        actions={[
          { label: tCommon("cancel"), type: "cancel" },
          {
            label: tCommon("delete"),
            pendingLabel: <Loader2 className="h-4 w-4 animate-spin" />,
            variant: "destructive",
            async: true,
            closeOnSuccess: false,
            onClick: handleDeleteGroup,
          },
        ]}
      />
    </>
  );
}
